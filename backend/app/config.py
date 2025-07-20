import os
from pydantic import AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # full DATABASE_URL, e.g. postgresql+asyncpg://user:pw@host/db
    DATABASE_URL: AnyUrl
    DOCKER_ENV: bool = False
    # SQLite “vault” filepath (if you ever still need it)
    VAULT_DB_PATH: str = os.path.join(os.getcwd(), "vault.db")
    
    JWT_SECRET_KEY: str                = "CHANGE_ME_SUPER_SECRET"
    JWT_ALGORITHM: str                 = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int   = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int     = 7
    
    # CORS
    CLIENT_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://192.168.1.174:3000",
        "https://app.local",
    ]

    # tell Pydantic where to find your .env file
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# instantiate a singleton
settings = Settings()