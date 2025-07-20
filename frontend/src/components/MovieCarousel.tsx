import React, { useEffect, useState } from "react";
import axios from "axios";

type Movie = {
  id: number;
  title: string;
  description?: string;
  release_year?: number;
  genre?: string;
  poster_url?: string;
};

export default function MovieCarousel() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<Movie[]>("http://localhost:8000/movies")
      .then((res) => setMovies(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 text-white min-h-screen bg-black">
      <h2 className="text-3xl font-bold mb-6">Now Playing</h2>

      {loading ? (
        <div className="text-center text-gray-400">Loading movies...</div>
      ) : (
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="min-w-[180px] cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelected(movie)}
            >
              <img
                src={movie.poster_url || "/fallback.jpg"}
                alt={movie.title}
                className="w-full h-72 object-cover rounded-xl shadow-lg"
              />
              <div className="mt-2 text-center font-medium">{movie.title}</div>
            </div>
          ))}
        </div>
      )}

      {/* Movie Detail Overlay */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Background Video */}
          <video
            key={selected.id}
            src={`http://localhost:8000/movies/${selected.id}/stream`}
            autoPlay
            controls
            muted
            loop
            className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm"
          />

          {/* Foreground Content */}
          <div className="relative z-10 text-white text-center max-w-3xl px-6 py-12 bg-black/60 rounded-xl shadow-2xl backdrop-blur-md">
            <h2 className="text-4xl font-bold mb-2">{selected.title}</h2>
            <p className="text-md text-gray-300">{selected.genre} • {selected.release_year}</p>
            <p className="mt-4 text-lg font-light">{selected.description}</p>

            <div className="mt-8 relative w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-xl border border-white/10">
              <video
                key={`${selected.id}-player`}
                src={`http://localhost:8000/movies/${selected.id}/stream`}
                controls
                autoPlay
                controlsList="nodownload"
                disablePictureInPicture
                className="w-full h-[60vh] object-contain bg-black"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="absolute top-6 right-6 text-4xl font-bold text-white hover:text-gray-300"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}