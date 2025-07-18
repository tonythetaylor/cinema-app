# app/db.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# turn your pydantic Url into a plain string for SQLAlchemy
DATABASE_URL = str(settings.DATABASE_URL)

# create the async engine
engine = create_async_engine(DATABASE_URL, echo=True)

# factory for AsyncSession instances
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# declarative base for your ORM models
Base = declarative_base()

async def init_db():
    """
    On startup, this will create any tables
    defined on Base.metadata.
    """
    async with engine.begin() as conn:
        try:
            await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            # ignore "already exists" errors
            if "already exists" not in str(e):
                raise