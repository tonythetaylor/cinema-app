from prometheus_client import Counter, Gauge, Histogram, generate_latest

ACTIVE_WS    = Gauge("ws_active_connections",    "Current number of WS connections",       ["type","watchPartyId"])
TOTAL_MSG    = Counter("chat_messages_total",    "Total chat messages sent",              ["watchPartyId"])
CTRL_EVENTS  = Counter("control_events_total",   "Total play/pause/seek events",          ["watchPartyId","type"])
WS_ERRORS    = Counter("ws_errors_total",        "WebSocket send/recv errors",            ["type"])
JOIN_LATENCY = Histogram("join_to_message_seconds","Time from join until first chat message")

def metrics_endpoint():
    return generate_latest()