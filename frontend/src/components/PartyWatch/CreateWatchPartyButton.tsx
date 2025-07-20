import React, { useState } from "react";
import axios from "axios";
import apiClient from "../../lib/apiClient";

export default function CreateWatchPartyButton({ movieId }: { movieId: number }) {
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createParty = async () => {
    try {
      setLoading(true);
      const res = await apiClient.post("/watch-parties", { movie_id: movieId });
      setJoinCode(res.data.join_code);
    } catch (err) {
      console.error("Failed to create party", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={createParty}
        disabled={loading}
        className="px-6 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition"
      >
        {loading ? "Creating..." : "Start Watch Party"}
      </button>

      {joinCode && (
        <div className="text-sm text-green-400">
          Invite Code: <span className="font-mono font-bold">{joinCode}</span>
        </div>
      )}
    </div>
  );
}