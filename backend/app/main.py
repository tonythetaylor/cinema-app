import logging
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
load_dotenv() 

from app.config import settings
from app.db import init_db
from app.metrics import metrics_endpoint

# REST
from app.rest.health import router as health_router
from app.rest.secrets import router as secrets_router
from app.rest.recommend import router as recommend_router

# WS
from app.ws.chat import router as chat_ws_router
from app.ws.control import router as control_ws_router
from app.ws.signal import router as signal_ws_router
from app.ws.lobby import router as lobby_ws_router

# Feature routers
from app.routers.vault.secrets import router as vault_router
from app.routers.users import users_router, auth_router, profile_router
from app.routers.movies import movies_router, watch_party_router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="Cinema App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CLIENT_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    log.info("Initializing database…")
    await init_db()

app.include_router(health_router, tags=["health"])
app.include_router(secrets_router, tags=["vault"])
app.include_router(recommend_router, tags=["recommend"])

app.include_router(chat_ws_router, tags=["ws-chat"])
app.include_router(control_ws_router, tags=["ws-control"])
app.include_router(signal_ws_router, tags=["ws-signal"])
app.include_router(lobby_ws_router, tags=["ws-lobby"])

app.include_router(vault_router,  tags=["vault"])
app.include_router(users_router, tags=["users"])
app.include_router(auth_router, tags=["auth"])
app.include_router(profile_router, tags=["profile"])

app.include_router(movies_router, tags=["movies"])
app.include_router(watch_party_router, tags=["watch-parties"])

@app.get("/metrics")
async def metrics():
    return Response(metrics_endpoint(), media_type="text/plain; version=0.0.4")