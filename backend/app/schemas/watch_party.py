from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class WatchPartyBase(BaseModel):
    party_name: Optional[str] = None
    starts_at: Optional[datetime] = None
    is_public: Optional[bool] = True

class WatchPartyCreate(WatchPartyBase):
    movie_id: int  # required to create

class WatchPartyUpdate(WatchPartyBase):
    party_name: Optional[str] = None
    starts_at: Optional[datetime] = None
    is_public: Optional[bool] = None

class WatchPartyParticipantRead(BaseModel):
    user_id: int
    party_id: int
    joined_at: datetime

    model_config = {
        "from_attributes": True
    }

class WatchPartyRead(WatchPartyBase):
    id: int
    movie_id: int
    host_id: int
    join_code: str
    created_at: datetime
    participants: Optional[List[WatchPartyParticipantRead]] = []

    model_config = {
        "from_attributes": True  # Pydantic v2+ syntax
    }

class WatchPartyJoin(BaseModel):
    party_id: int