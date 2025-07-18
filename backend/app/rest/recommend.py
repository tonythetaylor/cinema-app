# backend/app/rest/recommend.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess, logging

log = logging.getLogger(__name__)
router = APIRouter()

class RecReq(BaseModel):
    user_id: str
    history: list[str]

@router.post("/recommend")
def recommend(req: RecReq):
    prompt = f"Recommend next based on history: {req.history}\n"
    res = subprocess.run(
        ["ollama", "llama2", "predict", prompt],
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        log.error("Ollama error: %s", res.stderr.strip())
        raise HTTPException(500, detail=res.stderr.strip())
    return {"recs": res.stdout.splitlines()}