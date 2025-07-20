from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base as ORMBase


class WatchParty(ORMBase):
    __tablename__ = "watch_parties"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id"), nullable=False, index=True)
    party_name = Column(String(100), nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    is_public = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    join_code = Column(String(10), unique=True, nullable=False)


    host = relationship("User", back_populates="hosted_parties")
    movie = relationship("Movie", back_populates="watch_parties")
    
    participants = relationship("WatchPartyParticipant", back_populates="party")  
                  
    def __repr__(self):
        return f"<WatchParty id={self.id} name='{self.party_name}' host_id={self.host_id}>"


class WatchPartyParticipant(ORMBase):
    __tablename__ = "watch_party_participants"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    party_id = Column(Integer, ForeignKey("watch_parties.id"), primary_key=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="joined_parties")
    party = relationship("WatchParty", back_populates="participants")

    def __repr__(self):
        return f"<Participant user_id={self.user_id} party_id={self.party_id}>"