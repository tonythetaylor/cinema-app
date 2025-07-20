import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import VideoPlayerWithChat from "../VideoPlayer/VideoPlayerWithChat";
import apiClient from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";

export default function PartyWatchPage() {
  const { id: watchPartyId } = useParams();
  const [movieUrl, setMovieUrl] = useState<string | null>(null);
  const [movieId, setMovieId] = useState<string | null>(null);
  const { user } = useAuth();
  const username = user?.username || "guest";

  useEffect(() => {
    const loadMovie = async () => {
      try {
        const partyRes = await apiClient.get(`/watch-parties/${watchPartyId}`);
        const movieRes = await apiClient.get(`/movies/${partyRes.data.movie_id}`);
        setMovieUrl(`http://localhost:8000/movies/${movieRes.data.id}/stream`);
        setMovieId(movieRes.data.id.toString());
      } catch (err) {
        console.error("Failed to load movie or party:", err);
      }
    };

    loadMovie();
  }, [watchPartyId]);

  if (!movieUrl || !movieId || !watchPartyId) return <div className="text-white">Loading...</div>;

  return (
    <VideoPlayerWithChat
      movieUrl={movieUrl}
      movieId={watchPartyId}
      userId={username}
    />
  );
}