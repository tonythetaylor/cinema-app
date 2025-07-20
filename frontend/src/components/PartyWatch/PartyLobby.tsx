import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import apiClient from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext"; // ✅ import context

interface Movie {
  id: number;
  title: string;
  poster_url?: string;
  genre?: string;
  release_year?: number;
}

interface Participant {
  user_id: number;
  joined_at: string;
}

interface WatchParty {
  id: number;
  movie_id: number;
  host_id: number;
  party_name: string;
  is_public: boolean;
  created_at: string;
  participants: Participant[];
}

export default function PartyLobby() {
  const { id: watchPartyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const passedUsername = location.state?.username;
  const username = passedUsername || user?.username || "anonymous";

  const { socket, liveUsers, setLiveUsers } = useSocket(); // ✅ use shared socket

  const [party, setParty] = useState<WatchParty | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.debug("[fetchData] Fetching party details for ID:", watchPartyId);
        const partyRes = await apiClient.get<WatchParty>(`/watch-parties/${watchPartyId}`);
        setParty(partyRes.data);

        const movieRes = await apiClient.get<Movie>(`/movies/${partyRes.data.movie_id}`);
        setMovie(movieRes.data);
      } catch (err) {
        console.error("Failed to load party or movie", err);
      }
    };

    if (watchPartyId) {
      fetchData();
    }
  }, [watchPartyId]);

  if (!party || !movie) {
    return <div className="text-white">Loading party...</div>;
  }

  const inviteUrl = `${window.location.origin}/party/${watchPartyId}/join`;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black px-4">
      <div className="relative w-full max-w-2xl backdrop-blur-3xl bg-white/10 border border-white/20 rounded-3xl shadow-lg px-10 py-12 text-white text-center">
        <img
          src={movie.poster_url || "/tinyvue_logo.png"}
          alt={movie.title}
          className="h-64 mx-auto mb-6 object-contain drop-shadow-xl rounded"
        />
        <h1 className="text-4xl font-extrabold mb-2">{party.party_name}</h1>
        <p className="text-gray-400 mb-6">
          {movie.title} • {movie.genre} • {movie.release_year}
        </p>

        <div className="bg-white/20 px-4 py-3 rounded-lg shadow-inner mb-6">
          <p className="mb-2 font-medium">Invite link:</p>
          <input
            type="text"
            value={inviteUrl}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="w-full px-4 py-2 text-black rounded bg-white"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {Array.from(liveUsers.entries()).map(([uid, name]) => (
            <div key={uid} className="bg-gray-700 px-4 py-2 rounded text-sm">
              👤 {uid === username ? "You" : name}
            </div>
          ))}
        </div>

        <button
          onClick={() =>
            navigate(`/party/${watchPartyId}/watch`, {
              state: {
                username,
                liveUsers: Object.fromEntries(liveUsers),
              },
            })
          }
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 w-full rounded-lg shadow-lg hover:opacity-90 transition"
        >
          ▶ Start Watching
        </button>
      </div>
    </div>
  );
}