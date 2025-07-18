# app/vault.py
import sqlite3
from app.config import settings

def get_conn() -> sqlite3.Connection:
    """
    Return a thread‐safe sqlite3.Connection to the vault DB.
    Path comes from settings.VAULT_DB_PATH (e.g. "vault.db").
    """
    conn = sqlite3.connect(settings.VAULT_DB_PATH, check_same_thread=False)
    # ensure the `secrets` table exists:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS secrets(path TEXT PRIMARY KEY, value TEXT)"
    )
    return conn

def write_secret(path: str, value: str) -> None:
    conn = get_conn()
    try:
        conn.execute(
            "REPLACE INTO secrets(path, value) VALUES (?, ?)",
            (path, value),
        )
        conn.commit()
    finally:
        conn.close()

def read_secret(path: str) -> str:
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT value FROM secrets WHERE path = ?", (path,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise KeyError(f"Secret not found: {path}")
    return row[0]