import json, time, asyncio, logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..metrics import ACTIVE_WS, TOTAL_MSG, JOIN_LATENCY
from ..ws.shared import (
    start_pinger,
    clients_by_movie as clients_by_watch_party,
    users_in_room,
    ws_user_map,
    pending_leave,
    controls_by_movie,
    last_control_by_movie,
    GRACE_INTERVAL,
)

log = logging.getLogger("uvicorn.error")
router = APIRouter()

@router.websocket("/ws/chat")
async def ws_chat(ws: WebSocket, watchPartyId: str = Query(...), userId: str = Query(...)):
    ACTIVE_WS.labels(type="chat", watchPartyId=watchPartyId).inc()
    join_time = time.time()

    await ws.accept()
    ping_task = asyncio.create_task(start_pinger(ws))

    # Register connection
    key = (watchPartyId, userId)
    ws_user_map[ws] = (watchPartyId, userId)
    clients_by_watch_party[watchPartyId].append(ws)

    # Cancel grace leave task if reconnecting
    if key in pending_leave:
        pending_leave[key].cancel()
        del pending_leave[key]
        log.debug(f"[chat] {userId}@{watchPartyId} rejoined during grace period")

    # Update user presence
    first_join = userId not in users_in_room[watchPartyId]
    users_in_room[watchPartyId].add(userId)

    # Send presence list to this client
    presence = {
        "type": "presence",
        "users": sorted(users_in_room[watchPartyId]),
        "sentAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds") + "Z"
    }
    await ws.send_text(json.dumps(presence))

    # Notify others that user joined
    if first_join:
        join_msg = {
            "watchPartyId": watchPartyId,
            "user": "System",
            "text": f"{userId} has joined the room.",
            "timestamp": 0,
            "sentAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds") + "Z"
        }
        notice = json.dumps(join_msg)
        for peer in clients_by_watch_party[watchPartyId].copy():
            if peer is ws:
                continue
            try:
                await peer.send_text(notice)
            except:
                clients_by_watch_party[watchPartyId].remove(peer)

    try:
        while True:
            raw = await ws.receive_text()
            JOIN_LATENCY.observe(time.time() - join_time)
            TOTAL_MSG.labels(watchPartyId=watchPartyId).inc()

            body = json.loads(raw)
            text = body.get("text", "").strip()
            if not text:
                continue

            # Handle /catchup command
            if text.lower() == "/catchup":
                state = last_control_by_movie.get(watchPartyId)
                if state:
                    ctl_msg = json.dumps({
                        "type": "seek",
                        "timestamp": state["timestamp"],
                        "sentAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds") + "Z"
                    })
                    for ctl in controls_by_movie[watchPartyId].copy():
                        try:
                            await ctl.send_text(ctl_msg)
                        except:
                            controls_by_movie[watchPartyId].remove(ctl)

                    system_notice = {
                        "watchPartyId": watchPartyId,
                        "user": "System",
                        "text": f"{userId} requested catch-up to {state['timestamp']}s",
                        "timestamp": 0,
                        "sentAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds") + "Z"
                    }
                    sys_json = json.dumps(system_notice)
                    for peer in clients_by_watch_party[watchPartyId].copy():
                        try:
                            await peer.send_text(sys_json)
                        except:
                            clients_by_watch_party[watchPartyId].remove(peer)
                continue

            # Normal chat
            body.update(watchPartyId=watchPartyId, user=userId)
            payload = json.dumps(body)
            for peer in clients_by_watch_party[watchPartyId].copy():
                try:
                    await peer.send_text(payload)
                except:
                    clients_by_watch_party[watchPartyId].remove(peer)

    except WebSocketDisconnect:
        log.debug(f"[chat] disconnected {userId}@{watchPartyId}")
    finally:
        ping_task.cancel()
        clients_by_watch_party[watchPartyId].remove(ws)
        del ws_user_map[ws]
        ACTIVE_WS.labels(type="chat", watchPartyId=watchPartyId).dec()

        still_here = any(u == userId for (m, u) in ws_user_map.values() if m == watchPartyId)
        if not still_here:
            async def do_leave():
                await asyncio.sleep(GRACE_INTERVAL)
                if userId in users_in_room[watchPartyId]:
                    leave = {
                        "watchPartyId": watchPartyId,
                        "user": "System",
                        "text": f"{userId} has left the room.",
                        "timestamp": 0,
                        "sentAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds") + "Z"
                    }
                    lp = json.dumps(leave)
                    for peer in clients_by_watch_party[watchPartyId].copy():
                        try:
                            await peer.send_text(lp)
                        except:
                            clients_by_watch_party[watchPartyId].remove(peer)
                    users_in_room[watchPartyId].remove(userId)
                pending_leave.pop(key, None)

            pending_leave[key] = asyncio.create_task(do_leave())

        log.debug(f"[chat] cleanup scheduled for {userId}@{watchPartyId}")