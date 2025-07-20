import { useEffect, useState } from "react";
import axios from "axios";
import BrowseRow from "../components/Browse/BrowseRow";
import BrowseHero from "../components/Browse/BrowseHero";

export default function BrowsePage() {
  const [movies, setMovies] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any | null>(null);

  useEffect(() => {
    axios.get("http://localhost:8000/movies").then((res) => {
      setMovies(res.data);
      setFeatured(res.data[Math.floor(Math.random() * res.data.length)]);
    });
  }, []);

  const handleCardClick = (movie: any) => {
    setFeatured(movie); // or open modal
  };

  return (
    <div className="bg-black min-h-screen">
      {featured && <BrowseHero movie={featured} />}
      <BrowseRow title="Recommended for You" movies={movies} onCardClick={handleCardClick} />
      <BrowseRow title="Trending Now" movies={movies} onCardClick={handleCardClick} />
      <BrowseRow title="Top Picks" movies={movies} onCardClick={handleCardClick} />
    </div>
  );
}