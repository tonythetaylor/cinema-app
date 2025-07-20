from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class MovieBase(BaseModel):
    title: str
    description: Optional[str] = None
    release_year: Optional[int] = None
    genre: Optional[str] = None
    poster_url: Optional[HttpUrl] = None
    movie_url: Optional[HttpUrl] = None


class MovieCreate(MovieBase):
    pass


class MovieUpdate(MovieBase):
    pass


class MovieRead(MovieBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # or orm_mode = True if using Pydantic v1