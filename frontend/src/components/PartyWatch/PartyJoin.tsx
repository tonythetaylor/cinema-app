import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../../lib/apiClient";

export default function PartyJoin() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<boolean>(true);

  const tryJoin = async () => {
    setJoining(true);
    setError(null);

    try {
      await apiClient.post(`/watch-parties/${id}/join`);
      navigate(`/party/${id}/lobby`);
    } catch (err: any) {
      console.error("Failed to join party:", err);
      setError(
        err?.response?.data?.detail ||
          "Failed to join the watch party. The code may be invalid or expired."
      );
      setJoining(false);
    }
  };

  useEffect(() => {
    tryJoin();
  }, [id]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white px-6 text-center">
      {joining ? (
        <>
          <h1 className="text-2xl font-bold mb-4">Joining Watch Party...</h1>
          <p className="text-sm text-gray-400">Please wait a moment.</p>
          <button
            className="mt-4 text-sm text-gray-300 hover:text-red-400 underline"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <h1 className="text-xl text-red-400 font-semibold mb-2">{error}</h1>
          <div className="flex gap-4 mt-6">
            <button
              onClick={tryJoin}
              className="px-6 py-2 bg-pink-600 text-white font-semibold rounded hover:bg-pink-700 transition"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-white text-black font-semibold rounded hover:bg-gray-200 transition"
            >
              Return to Home
            </button>
          </div>
        </>
      )}
    </div>
  );
}