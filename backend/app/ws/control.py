import json, asyncio, logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from collections import defaultdict
from ..metrics import ACTIVE_WS, CTRL_EVENTS
from .shared import start_pinger, controls_by_movie, last_control_by_movie

log = logging.getLogger("uvicorn.error")
router = APIRouter()

@router.websocket("/ws/control")
async def ws_control(ws: WebSocket, watchPartyId: str = Query(...)):
    await ws.accept()
    ping_task = asyncio.create_task(start_pinger(ws))

    # send an init state if exists
    state = last_control_by_movie.get(watchPartyId)
    if state:
        init = {
            "type":      "init",
            "timestamp": state["timestamp"],
            "isPlaying": state["isPlaying"],
        }
        await ws.send_text(json.dumps(init))

    controls_by_movie[watchPartyId].append(ws)
    ACTIVE_WS.labels(type="control", watchPartyId=watchPartyId).inc()
    log.debug(f"[ctrl] {watchPartyId} peers: {len(controls_by_movie[watchPartyId])}")

    try:
        while True:
            raw = await ws.receive_text()
            ev  = json.loads(raw)
            typ = ev.get("type")
            ts  = ev.get("timestamp")

            if typ in ("play", "pause", "seek"):
                CTRL_EVENTS.labels(watchPartyId=watchPartyId, type=typ).inc()
                last_control_by_movie[watchPartyId] = {
                    "timestamp": ts,
                    "isPlaying": typ == "play"
                }
                for peer in controls_by_movie[watchPartyId].copy():
                    try:
                        await peer.send_text(raw)
                    except:
                        controls_by_movie[watchPartyId].remove(peer)

    except WebSocketDisconnect:
        log.debug(f"[ctrl] disconnected peer from {watchPartyId}")
    finally:
        ping_task.cancel()
        controls_by_movie[watchPartyId].remove(ws)
        ACTIVE_WS.labels(type="control", watchPartyId=watchPartyId).dec()
        log.debug(f"[ctrl] remaining peers for {watchPartyId}: {len(controls_by_movie[watchPartyId])}")