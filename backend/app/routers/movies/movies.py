import random
from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import aiohttp
from typing import List

from app.db import AsyncSessionLocal
from app.schemas.movie import MovieCreate, MovieUpdate, MovieRead
from app.models import Movie

router = APIRouter(prefix="/movies", tags=["movies"])

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db

@router.post("/", response_model=MovieRead, status_code=status.HTTP_201_CREATED)
async def create_movie(movie: MovieCreate, db: AsyncSession = Depends(get_db)):
    new_movie = Movie(**movie.dict())
    db.add(new_movie)
    await db.commit()
    await db.refresh(new_movie)
    return new_movie

@router.get("/{movie_id}/stream")
async def stream_movie(movie_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movie).where(Movie.id == movie_id))
    movie = result.scalar_one_or_none()
    if not movie or not movie.movie_url:
        raise HTTPException(status_code=404, detail="Movie not found")

    headers = {}
    if range_header := request.headers.get("Range"):
        headers["Range"] = range_header

    session = aiohttp.ClientSession()
    try:
        resp = await session.get(movie.movie_url, headers=headers)
        if resp.status not in (200, 206):
            await resp.release()
            raise HTTPException(status_code=resp.status, detail="Failed to stream video")

        async def stream_generator():
            try:
                async for chunk in resp.content.iter_any():
                    yield chunk
            except Exception as e:
                print(f"[Stream error] {e}")
            finally:
                await resp.release()
                await session.close()

        return StreamingResponse(
            stream_generator(),
            media_type=resp.headers.get("Content-Type", "video/mp4"),
            status_code=resp.status,
            headers={
                "Content-Length": resp.headers.get("Content-Length", ""),
                "Accept-Ranges": "bytes",
                "Content-Range": resp.headers.get("Content-Range", ""),
            }
        )

    except Exception as e:
        await session.close()
        raise HTTPException(status_code=500, detail=f"Streaming error: {str(e)}")

@router.get("/movies/{movie_id}/preview")
async def stream_preview(movie_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movie).where(Movie.id == movie_id))
    movie = result.scalar_one_or_none()
    if not movie or not movie.movie_url:
        raise HTTPException(status_code=404, detail="Movie not found")

    session = aiohttp.ClientSession()
    try:
        # Step 1: Get total file size
        head_resp = await session.head(movie.movie_url)
        content_length = head_resp.headers.get("Content-Length")

        if not content_length:
            raise HTTPException(status_code=500, detail="Unable to determine video size")

        total_size = int(content_length)
        preview_size = 2_500_000  # ~2.5MB

        # Ensure we don't exceed file bounds
        if total_size <= preview_size:
            start = 0
        else:
            start = random.randint(0, total_size - preview_size)

        end = start + preview_size
        preview_range = f"bytes={start}-{end}"
        headers = {"Range": preview_range}

        # Step 2: Fetch preview bytes
        resp = await session.get(movie.movie_url, headers=headers)
        if resp.status not in (200, 206):
            raise HTTPException(status_code=resp.status, detail="Preview unavailable")

        async def iter_chunks():
            async for chunk in resp.content.iter_chunked(1024 * 128):  # 128KB chunks
                yield chunk

        return StreamingResponse(
            iter_chunks(),
            media_type=resp.headers.get("Content-Type", "video/mp4"),
            headers={
                "Content-Range": resp.headers.get("Content-Range", preview_range),
                "Accept-Ranges": "bytes",
                "Content-Length": resp.headers.get("Content-Length", str(preview_size)),
            },
            status_code=206,
        )
    finally:
        await session.close()
        
@router.get("/", response_model=List[MovieRead])
async def list_movies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movie))
    return result.scalars().all()

@router.get("/{movie_id}", response_model=MovieRead)
async def get_movie(movie_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Movie).where(Movie.id == movie_id))
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie

@router.patch("/{movie_id}", response_model=MovieRead)
async def update_movie(
    movie_id: int,
    update: MovieUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Movie).where(Movie.id == movie_id))
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    for key, value in update.dict(exclude_unset=True).items():
        setattr(movie, key, value)

    await db.commit()
    await db.refresh(movie)
    return movie