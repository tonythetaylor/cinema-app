// src/App.tsx
import React, { useEffect, useState } from "react";
import VideoPlayerWithChat from "./components/VideoPlayerWithChat";
import NamePrompt from "./components/NamePrompt";

export default function App() {
  // const movieId = "Sinners-2025";
  // const movieUrl = "/assets/Sinners.mp4"; // put a sample mp4 under public/assets
  const movieId = import.meta.env.VITE_MOVIE_ID;
  const movieUrl = import.meta.env.VITE_MOVIE_URL;

  // initialize from localStorage (if any)
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("userName") || "";
  });

  useEffect(() => {
    if (userName) localStorage.setItem("userName", userName);
  }, [userName]);

  // before we know who’s watching, show the prompt
  if (!userName) {
    return <NamePrompt onSubmit={setUserName} />;
  }

  return (
    <div className="h-screen bg-gray-900">
      <VideoPlayerWithChat
        movieId={movieId}
        movieUrl={movieUrl}
        userId={userName}
      />
    </div>
  );
}
