// src/pages/WatchMovie.tsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

type Movie = {
  id: number;
  title: string;
  movie_url: string;
};

export default function WatchMovie() {
  const { id } = useParams();
  const [movie, setMovie] = useState<Movie | null>(null);

  useEffect(() => {
    axios.get(`http://localhost:8000/movies/${id}`).then((res) => setMovie(res.data));
  }, [id]);

  if (!movie) return <div className="text-white p-8">Loading movie...</div>;

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <video
        src={`http://localhost:8000/movies/${movie.id}/stream`}
        controls
        autoPlay
        className="w-full h-full object-contain"
        controlsList="nodownload"
        disablePictureInPicture
      />
    </div>
  );
}