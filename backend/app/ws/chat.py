import json, time, asyncio, logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from collections import defaultdict
from ..metrics import ACTIVE_WS, TOTAL_MSG, JOIN_LATENCY
from ..ws.shared import start_pinger, clients_by_movie, users_in_room, ws_user_map, pending_leave, controls_by_movie, last_control_by_movie, GRACE_INTERVAL

log = logging.getLogger("uvicorn.error")
router = APIRouter()


@router.websocket("/ws/chat")
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