import asyncio, json
from collections import defaultdict
from fastapi import WebSocket
from typing import Any, Dict, List, Optional, Tuple

from ..metrics import WS_ERRORS

# — WebSocket state —
clients_by_movie:    Dict[str, List[WebSocket]]        = defaultdict(list)
users_in_room:       Dict[str, set]                     = defaultdict(set)
ws_user_map:         Dict[WebSocket, Tuple[str, str]]   = {}
pending_leave:       Dict[Tuple[str, str], asyncio.Task]= {}
controls_by_movie:   Dict[str, List[WebSocket]]        = defaultdict(list)
last_control_by_movie: Dict[str, Dict[str, Any]] = defaultdict(dict)

PING_INTERVAL = 20    # seconds
GRACE_INTERVAL = 10   # seconds

async def start_pinger(ws: WebSocket):
    try:
        while True:
            await asyncio.sleep(PING_INTERVAL)
            await ws.send_text(json.dumps({"type":"ping"}))
    except:
        return