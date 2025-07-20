from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.db import Base as ORMBase


class Movie(ORMBase):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    release_year = Column(Integer, nullable=True)
    genre = Column(String(100), nullable=True)
    poster_url = Column(String(2048), nullable=True)
    movie_url = Column(String(2048), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    watch_parties = relationship("WatchParty", back_populates="movie", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Movie id={self.id} title='{self.title}'>"