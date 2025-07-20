import json, logging, asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..ws.shared import controls_by_movie, start_pinger

log = logging.getLogger("uvicorn.error")
router = APIRouter()

@router.websocket("/ws/signal")
async def ws_signal(ws: WebSocket, movieId: str = Query(...)):
    await ws.accept()
    controls = controls_by_movie.setdefault(movieId, [])
    controls.append(ws)

    ping_task = asyncio.create_task(start_pinger(ws))
    log.debug(f"[signal] connected to {movieId} ({len(controls)} total)")

    try:
        while True:
            sig = await ws.receive_text()
            for peer in controls.copy():
                if peer is ws:
                    continue
                try:
                    await peer.send_text(sig)
                except:
                    controls.remove(peer)
    except WebSocketDisconnect:
        log.debug(f"[signal] disconnected from {movieId}")
    finally:
        ping_task.cancel()
        if ws in controls:
            controls.remove(ws)