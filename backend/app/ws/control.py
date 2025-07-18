import json, asyncio, logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from collections import defaultdict
from ..metrics import ACTIVE_WS, CTRL_EVENTS
from .shared import start_pinger, controls_by_movie, last_control_by_movie

log = logging.getLogger("uvicorn.error")
router = APIRouter()

@router.websocket("/ws/control")
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