import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.db import AsyncSessionLocal
from app.security import get_current_user_id
from app.models.watch_party import WatchParty, WatchPartyParticipant
from app.schemas.watch_party import (
    WatchPartyCreate,
    WatchPartyRead,
    WatchPartyUpdate,
    WatchPartyJoin,
    WatchPartyParticipantRead,
)

router = APIRouter(
    prefix="/watch-parties",
    tags=["watch-parties"],
)

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db
        
# Create a new watch party
@router.post("/", response_model=WatchPartyRead, status_code=status.HTTP_201_CREATED)
async def create_watch_party(
    payload: WatchPartyCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Generate a unique 6-character join code
    join_code = secrets.token_hex(3).upper()

    new_party = WatchParty(
        movie_id=payload.movie_id,
        host_id=user_id,
        party_name=payload.party_name or "Watch Party",
        starts_at=payload.starts_at,
        is_public=payload.is_public,
        join_code=join_code,
    )
    db.add(new_party)
    await db.commit()
    result = await db.execute(
        select(WatchParty)
        .options(selectinload(WatchParty.participants))
        .where(WatchParty.id == new_party.id)
    )
    party_with_participants = result.scalars().first()
    return party_with_participants


# Get a single watch party
@router.get("/{party_id}", response_model=WatchPartyRead)
async def get_watch_party(party_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WatchParty)
        .options(selectinload(WatchParty.participants))
        .where(WatchParty.id == party_id)
    )
    party = result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Watch party not found")
    return party


# List all public/private watch parties
@router.get("/", response_model=List[WatchPartyRead])
async def list_watch_parties(
    is_public: bool = True,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchParty).where(WatchParty.is_public == is_public)
    )
    return result.scalars().all()


# Update a watch party (host only)
@router.put("/{party_id}", response_model=WatchPartyRead)
async def update_watch_party(
    party_id: int,
    updates: WatchPartyUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(select(WatchParty).where(WatchParty.id == party_id))
    party = result.scalar_one_or_none()

    if not party:
        raise HTTPException(status_code=404, detail="Watch party not found")
    if party.host_id != user_id:
        raise HTTPException(status_code=403, detail="Only the host can update this party")

    for field, value in updates.dict(exclude_unset=True).items():
        setattr(party, field, value)

    await db.commit()
    await db.refresh(party)
    return party


# Delete a watch party (host only)
@router.delete("/{party_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watch_party(
    party_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(select(WatchParty).where(WatchParty.id == party_id))
    party = result.scalar_one_or_none()

    if not party:
        raise HTTPException(status_code=404, detail="Watch party not found")
    if party.host_id != user_id:
        raise HTTPException(status_code=403, detail="Only the host can delete this party")

    await db.delete(party)
    await db.commit()
    return


# Join a watch party
@router.post("/{party_id}/join", response_model=WatchPartyParticipantRead)
async def join_watch_party(
    party_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(select(WatchParty).where(WatchParty.id == party_id))
    party = result.scalar_one_or_none()

    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    existing = await db.execute(
        select(WatchPartyParticipant).where(
            WatchPartyParticipant.party_id == party_id,
            WatchPartyParticipant.user_id == user_id,
        )
    )
    if existing.scalar():
        raise HTTPException(status_code=400, detail="User already joined")

    participant = WatchPartyParticipant(user_id=user_id, party_id=party_id)
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    return participant


# List all participants in a watch party
@router.get("/{party_id}/participants", response_model=List[WatchPartyParticipantRead])
async def list_participants(
    party_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchPartyParticipant).where(WatchPartyParticipant.party_id == party_id)
    )
    return result.scalars().all()

@router.post("/join-code/{code}", response_model=WatchPartyParticipantRead)
async def join_by_code(
    code: str,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(select(WatchParty).where(WatchParty.join_code == code))
    party = result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Invalid code")

    existing = await db.execute(
        select(WatchPartyParticipant).where(
            WatchPartyParticipant.party_id == party.id,
            WatchPartyParticipant.user_id == user_id,
        )
    )
    if existing.scalar():
        raise HTTPException(status_code=400, detail="User already joined")

    participant = WatchPartyParticipant(user_id=user_id, party_id=party.id)
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    return participant

# Resolve party by join code (for navigation before joining)
@router.get("/by-code/{code}", response_model=WatchPartyRead)
async def get_party_by_code(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchParty)
        .options(selectinload(WatchParty.participants))
        .where(WatchParty.join_code == code)
    )
    party = result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Invalid join code")
    return party