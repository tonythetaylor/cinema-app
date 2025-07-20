import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";

import logo from "/src/tinyvue_logo.png";

export default function JoinPartyByCode() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { user } = useAuth();
  const username = user?.username || "anonymous";

  const handleJoin = async () => {
    try {
      const res = await apiClient.get(`/watch-parties/by-code/${code}`);
      const party = res.data;
      navigate(`/party/${party.id}/join`, { state: { username } });
    } catch (err) {
      setError("Invalid or expired join code.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black px-4">
      <div className="relative w-full max-w-md backdrop-blur-3xl bg-white/10 border border-white/20 rounded-3xl shadow-[0_10px_40px_rgba(255,255,255,0.1)] px-10 py-12 text-white text-center">
        <img
          src={logo}
          alt="TinyVue Logo"
          className="h-32 mx-auto mb-8 object-contain drop-shadow-2xl"
        />

        <h1 className="text-3xl font-extrabold mb-6 tracking-wide">
          Join by Code
        </h1>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter party code"
          className="mb-4 px-4 py-3 w-full rounded-lg bg-white/80 text-black placeholder-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
        />

        {error && (
          <p className="text-red-400 text-center mb-4 font-medium">{error}</p>
        )}

        <button
          onClick={handleJoin}
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 w-full rounded-lg shadow-lg hover:opacity-90 transition"
        >
          Join Party
        </button>

        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-300 mt-6 hover:text-red-400 underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
