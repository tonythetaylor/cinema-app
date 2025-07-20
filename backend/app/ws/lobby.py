import json
import asyncio
import logging
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from collections import defaultdict

router = APIRouter()
log = logging.getLogger("uvicorn.error")

lobby_connections: dict[str, list[WebSocket]] = defaultdict(list)
lobby_users: dict[str, dict[str, str]] = defaultdict(dict)  # {partyId: {userId: displayName}}
lobby_ws_map: dict[WebSocket, tuple] = {}  # now allows 2- or 3-tuples
LOBBY_GRACE_SECONDS = 10
pending_lobby_leaves: dict[tuple[str, str], asyncio.Task] = {}

@router.websocket("/ws/lobby")
async def lobby_ws(
    ws: WebSocket,
    watchPartyId: str = Query(...),
    userId: str = Query(...),
    displayName: str = Query(None)
):
    await ws.accept()

    if not displayName:
        displayName = userId

    log.info(f"[LOBBY] {userId} joined {watchPartyId} (displayName={displayName})")

    lobby_ws_map[ws] = (watchPartyId, userId, displayName)
    lobby_connections[watchPartyId].append(ws)

    key = (watchPartyId, userId)
    if key in pending_lobby_leaves:
        pending_lobby_leaves[key].cancel()
        del pending_lobby_leaves[key]

    # First join?
    first_time = userId not in lobby_users[watchPartyId]
    lobby_users[watchPartyId][userId] = displayName

    if first_time:
        await broadcast_lobby(watchPartyId, {
            "type": "joined",
            "userId": userId,
            "displayName": displayName,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })

        await broadcast_lobby(watchPartyId, {
            "type": "lobby_state",
            "users": lobby_users[watchPartyId]
        })

    await send_lobby_state(ws, watchPartyId)

    try:
        while True:
            raw = await ws.receive_text()

            try:
                data = json.loads(raw)

                if data.get("type") == "start":
                    log.info(f"[LOBBY] {userId} initiated start for {watchPartyId}")
                    await broadcast_lobby(watchPartyId, {
                        "type": "start",
                        "timestamp": datetime.utcnow().isoformat() + "Z"
                    })

            except Exception as e:
                log.warning(f"[LOBBY] Failed to handle incoming message: {e}")

    except WebSocketDisconnect:
        log.debug(f"[LOBBY] disconnect {userId}@{watchPartyId}")
    finally:
        lobby_connections[watchPartyId].remove(ws)
        del lobby_ws_map[ws]

        still_connected = any(
            p == watchPartyId and u == userId
            for p, u, *_ in lobby_ws_map.values()
        )

        if not still_connected:
            async def do_lobby_leave():
                await asyncio.sleep(LOBBY_GRACE_SECONDS)
                if userId in lobby_users[watchPartyId]:
                    del lobby_users[watchPartyId][userId]
                    await broadcast_lobby(watchPartyId, {
                        "type": "left",
                        "userId": userId,
                        "timestamp": datetime.utcnow().isoformat() + "Z"
                    })
                pending_lobby_leaves.pop(key, None)

            pending_lobby_leaves[key] = asyncio.create_task(do_lobby_leave())

async def broadcast_lobby(watchPartyId: str, message: dict):
    payload = json.dumps(message)
    peers = lobby_connections[watchPartyId].copy()
    for peer in peers:
        try:
            await peer.send_text(payload)
        except Exception as e:
            log.warning(f"[LOBBY] Failed to send to peer: {e}")
            lobby_connections[watchPartyId].remove(peer)

async def send_lobby_state(ws: WebSocket, watchPartyId: str):
    try:
        users_map = {}

        for peer, value in lobby_ws_map.items():
            if len(value) == 3:
                party_id, user_id, display_name = value
            else:
                party_id, user_id = value
                display_name = user_id

            if party_id == watchPartyId:
                users_map[user_id] = display_name

        log.info(f"[LOBBY] Sending lobby_state for {watchPartyId}: {users_map}")

        await ws.send_text(json.dumps({
            "type": "lobby_state",
            "users": users_map
        }))
    except Exception as e:
        log.warning(f"[LOBBY] Failed to send lobby_state: {e}")