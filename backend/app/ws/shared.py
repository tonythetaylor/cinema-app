import asyncio
import json
import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import WebSocket

from ..metrics import WS_ERRORS

# ─── Shared WebSocket State ────────────────────────────────
clients_by_movie: Dict[str, List[WebSocket]] = defaultdict(list)
controls_by_movie: Dict[str, List[WebSocket]] = defaultdict(list)
users_in_room: Dict[str, Set[str]] = defaultdict(set)
ws_user_map: Dict[WebSocket, Tuple[str, str]] = {}
pending_leave: Dict[Tuple[str, str], asyncio.Task] = {}

# Changed from defaultdict(dict) to plain dict for clarity
last_control_by_movie: Dict[str, Dict[str, Any]] = {}

# ─── Constants ─────────────────────────────────────────────
PING_INTERVAL = 20     # seconds between pings
GRACE_INTERVAL = 3    # seconds to wait before "leave" message

# ─── Logger ────────────────────────────────────────────────
log = logging.getLogger("uvicorn.error")

# ─── Lock (optional, for concurrent safety) ────────────────
state_lock = asyncio.Lock()

# ─── Periodic Ping Sender ──────────────────────────────────
async def start_pinger(ws: WebSocket):
    try:
        while True:
            await asyncio.sleep(PING_INTERVAL)
            await ws.send_text(json.dumps({"type": "ping"}))
    except Exception as e:
        WS_ERRORS.labels(reason="ping_failure").inc()
        log.debug(f"[pinger] ping failed: {e}")

# ─── Centralized Cleanup ───────────────────────────────────
async def cleanup_ws(ws: WebSocket, context: str = "unknown"):
    try:
        movie_user = ws_user_map.pop(ws, None)
        if not movie_user:
            return

        movie_id, user_id = movie_user

        if ws in clients_by_movie[movie_id]:
            clients_by_movie[movie_id].remove(ws)

        if ws in controls_by_movie[movie_id]:
            controls_by_movie[movie_id].remove(ws)

        # You could handle pending_leave cleanup here as well if needed

        WS_ERRORS.labels(reason=f"disconnect_{context}").inc()
        log.debug(f"[cleanup] {user_id}@{movie_id} via {context}")
    except Exception as e:
        log.warning(f"[cleanup error] failed for {context}: {e}")