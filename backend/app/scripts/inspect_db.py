# scripts/inspect_db.py

import asyncio
from sqlalchemy import inspect
from app.db import engine

async def list_tables():
    def _list(conn):
        ins = inspect(conn)
        return ins.get_table_names()

    tables = await engine.run_sync(_list)
    print("Tables in database:", tables)

if __name__ == "__main__":
    asyncio.run(list_tables())