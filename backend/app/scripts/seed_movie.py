# app/scripts/seed_movie.py

import asyncio
from app.db import AsyncSessionLocal
from app.models.movie import Movie

async def seed_movie():
    async with AsyncSessionLocal() as db:
        new_movie = Movie(
            title="Sinners",
            description=(
                "In 1932 Mississippi, twin brothers Smoke and Stack Moore return home to open a juke joint. "
                "Their plans are disrupted by a mysterious vampire named Remmick, revealing dark truths buried in their past."
            ),
            release_year=2025,
            genre="Southern Gothic • Horror • Musical",
            poster_url="https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcTv89TcYRmh5OUm9lmQyUzoelU9Epd4zbNpx4gOsBHoMB2QaifG",
            movie_url="https://cinema-app-movies-a5ef650d.s3.amazonaws.com/Sinners.mp4"
        )
        db.add(new_movie)
        await db.commit()
        print("✅ Movie seeded")

if __name__ == "__main__":
    asyncio.run(seed_movie())