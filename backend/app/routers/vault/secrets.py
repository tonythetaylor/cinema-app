# backend/app/routers/vault.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.vault import write_secret, read_secret

router = APIRouter(tags=["vault"])

class SecretIn(BaseModel):
    value: str

@router.post("/secret/{path}", summary="Store a secret")
def write_secret_route(path: str, body: SecretIn):
    try:
        write_secret(path, body.value)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@router.get("/secret/{path}", summary="Read a secret")
def read_secret_route(path: str):
    try:
        val = read_secret(path)
        return {"value": val}
    except KeyError:
        raise HTTPException(status_code=404, detail="Not found")