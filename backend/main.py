import os
import time
import sqlite3
import subprocess
import json
import logging
import asyncio
from datetime import datetime, timezone
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from prometheus_client import Counter, Gauge, Histogram, generate_latest
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# — Metrics definitions —
ACTIVE_WS   = Gauge("ws_active_connections",    "Current number of WS connections",       ["type", "movieId"])
TOTAL_MSG   = Counter("chat_messages_total",    "Total chat messages sent",              ["movieId"])
CTRL_EVENTS = Counter("control_events_total",   "Total play/pause/seek events",          ["movieId","type"])
WS_ERRORS   = Counter("ws_errors_total",        "WebSocket send/recv errors",            ["type"])
JOIN_LATENCY= Histogram("join_to_message_seconds", "Time from join until first chat message")

# — Logging —
log = logging.getLogger("uvicorn.error")

# — SQLite “vault” for secrets —
db_path = os.path.join(os.getcwd(), "vault.db")
conn = sqlite3.connect(db_path, check_same_thread=False)
conn.execute("CREATE TABLE IF NOT EXISTS secrets(path TEXT PRIMARY KEY, value TEXT)")
conn.commit()

# — App & CORS —
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.1.174:3000",
        "https://app.local",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# — REST: health + secrets + recommend —
class Secret(BaseModel):
    value: str

class RecReq(BaseModel):
    user_id: str
    history: List[str]

@app.get("/health")
def health():
    return {"status": "ok"}

# Expose Prometheus metrics
@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type="text/plain; version=0.0.4")

@app.post("/secret/{p:path}")
def write_secret(p: str, s: Secret):
    conn.execute("REPLACE INTO secrets(path, value) VALUES(?, ?)", (p, s.value))
    conn.commit()
    return {"status": "ok"}

@app.get("/secret/{p:path}")
def read_secret(p: str):
    row = conn.execute("SELECT value FROM secrets WHERE path = ?", (p,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    return {"value": row[0]}

@app.post("/recommend")
def recommend(req: RecReq):
    prompt = f"Recommend next based on history: {req.history}\n"
    res = subprocess.run(
        ["ollama", "llama2", "predict", prompt],
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        log.error("Ollama error: %s", res.stderr.strip())
        raise HTTPException(500, detail=res.stderr.strip())
    return {"recs": res.stdout.splitlines()}


# — WebSocket state —
clients_by_movie:    Dict[str, List[WebSocket]]        = defaultdict(list)
users_in_room:       Dict[str, set]                     = defaultdict(set)
ws_user_map:         Dict[WebSocket, Tuple[str, str]]   = {}
pending_leave:       Dict[Tuple[str, str], asyncio.Task]= {}
controls_by_movie:   Dict[str, List[WebSocket]]        = defaultdict(list)

PING_INTERVAL = 20    # seconds
GRACE_INTERVAL = 10   # seconds

async def start_pinger(ws: WebSocket):
    try:
        while True:
            await asyncio.sleep(PING_INTERVAL)
            await ws.send_text(json.dumps({"type": "ping"}))
    except:
        return

@app.websocket("/ws/chat")
async def ws_chat(ws: WebSocket, movieId: str = Query(...), userId: str = Query(...)):
    ACTIVE_WS.labels(type="chat", movieId=movieId).inc()
    join_time = time.time()

    await ws.accept()
    ping_task = asyncio.create_task(start_pinger(ws))

    # register…
    ws_user_map[ws] = (movieId, userId)
    clients_by_movie[movieId].append(ws)

    first_join = userId not in users_in_room[movieId]
    users_in_room[movieId].add(userId)

    key = (movieId, userId)
    if key in pending_leave:
        pending_leave[key].cancel()
        del pending_leave[key]

    if first_join:
        notice = {
            "movieId":  movieId,
            "user":     "System",
            "text":     f"{userId} has joined the room.",
            "timestamp": 0,
            "sentAt":   datetime.now(timezone.utc).isoformat(timespec="milliseconds")+"Z"
        }
        payload = json.dumps(notice)
        for peer in clients_by_movie[movieId].copy():
            if peer is ws: continue
            try:    await peer.send_text(payload)
            except: clients_by_movie[movieId].remove(peer)

    try:
        while True:
            raw = await ws.receive_text()
            JOIN_LATENCY.observe(time.time() - join_time)
            TOTAL_MSG.labels(movieId=movieId).inc()

            body = json.loads(raw)
            text = body.get("text","").strip()
            if not text:
                continue

            # ——— catch-up command ———
            if text.lower() == "/catchup":
                state = last_control_by_movie.get(movieId)
                if state:
                    ctl_msg = json.dumps({
                        "type": "seek",
                        "timestamp": state["timestamp"],
                        "sentAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds")+"Z"
                    })
                    for ctl in controls_by_movie[movieId].copy():
                        try:    await ctl.send_text(ctl_msg)
                        except: controls_by_movie[movieId].remove(ctl)

                    # optional system chat notice
                    sys = {
                        "movieId":  movieId,
                        "user":     "System",
                        "text":     f"{userId} requested catch-up to {state['timestamp']}s",
                        "timestamp": 0,
                        "sentAt":   datetime.now(timezone.utc).isoformat(timespec="milliseconds")+"Z"
                    }
                    cpl = json.dumps(sys)
                    for peer in clients_by_movie[movieId].copy():
                        try:    await peer.send_text(cpl)
                        except: clients_by_movie[movieId].remove(peer)
                continue

            # ——— normal chat broadcast ———
            body.update(movieId=movieId, user=userId)
            payload = json.dumps(body)
            for peer in clients_by_movie[movieId].copy():
                try:    await peer.send_text(payload)
                except: clients_by_movie[movieId].remove(peer)

    except WebSocketDisconnect:
        log.debug(f"[chat] disconnected {userId}@{movieId}")
    finally:
        ping_task.cancel()
        clients_by_movie[movieId].remove(ws)
        del ws_user_map[ws]
        ACTIVE_WS.labels(type="chat", movieId=movieId).dec()

        # schedule leave notice…
        still_here = any(u==userId for (m,u) in ws_user_map.values() if m==movieId)
        if not still_here:
            async def do_leave():
                await asyncio.sleep(GRACE_INTERVAL)
                if userId in users_in_room[movieId]:
                    leave = {
                        "movieId":  movieId,
                        "user":     "System",
                        "text":     f"{userId} has left the room.",
                        "timestamp": 0,
                        "sentAt":   datetime.now(timezone.utc).isoformat(timespec="milliseconds")+"Z"
                    }
                    lp = json.dumps(leave)
                    for peer in clients_by_movie[movieId].copy():
                        if peer is ws: continue
                        try:    await peer.send_text(lp)
                        except: clients_by_movie[movieId].remove(peer)
                    users_in_room[movieId].remove(userId)
                pending_leave.pop(key, None)

            pending_leave[key] = asyncio.create_task(do_leave())

        log.debug(f"[chat] cleanup scheduled for {userId}@{movieId}")

@app.websocket("/ws/signal")
async def ws_signal(ws: WebSocket):
    await ws.accept()
    clients_signal = controls_by_movie.setdefault("signal", [])
    clients_signal.append(ws)
    log.debug(f"[signal] connected ({len(clients_signal)})")
    try:
        while True:
            sig = await ws.receive_text()
            for peer in clients_signal.copy():
                try:
                    await peer.send_text(sig)
                except:
                    clients_signal.remove(peer)
    except WebSocketDisconnect:
        pass
    finally:
        if ws in clients_signal:
            clients_signal.remove(ws)
            log.debug(f"[signal] disconnected ({len(clients_signal)})")


last_control_by_movie: Dict[str, Dict[str, Any]] = defaultdict(dict)

@app.websocket("/ws/control")
async def ws_control(ws: WebSocket, movieId: str = Query(...)):
    await ws.accept()
    ping_task = asyncio.create_task(start_pinger(ws))

    # send an init state
    state = last_control_by_movie.get(movieId)
    if state:
        init = {
            "type":      "init",
            "timestamp": state["timestamp"],
            "isPlaying": state["isPlaying"],
        }
        await ws.send_text(json.dumps(init))

    controls_by_movie[movieId].append(ws)
    ACTIVE_WS.labels(type="control", movieId=movieId).inc()
    log.debug(f"[ctrl] {movieId} peers: {len(controls_by_movie[movieId])}")

    try:
        while True:
            raw = await ws.receive_text()
            ev  = json.loads(raw)
            typ = ev.get("type")
            ts  = ev.get("timestamp")

            if typ in ("play", "pause", "seek"):
                CTRL_EVENTS.labels(movieId=movieId, type=typ).inc()
                last_control_by_movie[movieId] = {"timestamp": ts, "isPlaying": typ == "play"}
                for peer in controls_by_movie[movieId].copy():
                    try:
                        await peer.send_text(raw)
                    except:
                        controls_by_movie[movieId].remove(peer)

    except WebSocketDisconnect:
        log.debug(f"[ctrl] disconnected peer from {movieId}")
    finally:
        ping_task.cancel()
        controls_by_movie[movieId].remove(ws)
        ACTIVE_WS.labels(type="control", movieId=movieId).dec()
        log.debug(f"[ctrl] remaining peers for {movieId}: {len(controls_by_movie[movieId])}")