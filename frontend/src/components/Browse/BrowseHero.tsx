import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CreateWatchPartyButton from "../PartyWatch/CreateWatchPartyButton";

type Movie = {
  id: number;
  title: string;
  description?: string;
  release_year?: number;
  genre?: string;
  poster_url?: string;
  preview_url?: string;
};

export default function BrowseHero({ movie }: { movie?: Movie }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [showContent, setShowContent] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get<Movie[]>("http://localhost:8000/movies").then((res) => {
      setMovies(res.data);
      setSelected(res.data[0]);
    });
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.play();
    setShowContent(false); // hide content during preview

    const timeout = setTimeout(() => {
      video.pause();
      setShowContent(true); // show content after 15s
    }, 15000);

    return () => clearTimeout(timeout);
  }, [selected]);

  if (!selected) return null;

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* Background Video Preview */}
      <video
        ref={videoRef}
        key={selected.id}
        src={
          selected.preview_url ||
          `http://localhost:8000/movies/${selected.id}/stream`
        }
        autoPlay
        muted
        playsInline
        loop
        className="absolute inset-0 w-full h-full object-cover" // or object-cover if you want cropping
      />

      {/* Gradient Overlay */}
      {/* <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/10 z-10" /> */}
      {/* Content Overlay Dark Background */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/95 to-transparent z-20 pointer-events-none" />
      {
        <>
          {/* Content Overlay Dark Background */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/95 to-transparent z-20 pointer-events-none" />

          {/* Content Overlay */}
          <div className="relative z-20 px-8 md:px-16 lg:px-24 bottom-0 h-full flex flex-col justify-end pb-20 max-w-screen-xl">
            <img
              src={selected.poster_url || "/fallback.jpg"}
              alt={selected.title}
              className="w-40 h-68 mb-4 object-cover rounded shadow-md hidden sm:block"
            />

            <h1 className="text-5xl font-extrabold drop-shadow-lg leading-tight mb-3">
              {selected.title}
            </h1>
            <p className="text-lg text-gray-200 max-w-2xl mb-6">
              {selected.genre} • {selected.release_year}
            </p>
            <p className="text-md text-gray-300 max-w-xl line-clamp-3">
              {selected.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={() => navigate(`/watch/${selected.id}`)}
                className="flex items-center gap-2 bg-white text-black font-semibold px-6 py-2 rounded hover:bg-gray-300 transition"
              >
                <span className="text-lg">▶</span>
                Play
              </button>
              <button
                onClick={() => navigate(`/party/join`)}
                className="flex items-center gap-2 bg-white/10 text-white border border-white/40 px-6 py-2 rounded hover:bg-white/20 transition"
              >
                Join Watch Party
              </button>
              <button
                onClick={() => navigate("/party/join-by-code")}
                className="flex items-center gap-2 bg-white/10 text-white border border-white/40 px-6 py-2 rounded hover:bg-white/20 transition"
              >
                Join by Code
              </button>
              <CreateWatchPartyButton movieId={selected.id} />
            </div>
          </div>
        </>
      }
    </div>
  );
}
