import json, logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from .shared import controls_by_movie

log = logging.getLogger("uvicorn.error")
router = APIRouter()

@router.websocket("/ws/signal")
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