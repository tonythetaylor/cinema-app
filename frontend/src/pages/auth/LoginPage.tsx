import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "/src/tinyvue_logo.png";
import apiClient from "../../lib/apiClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

const handleLogin = async () => {
  try {
    const formData = new URLSearchParams();
    formData.append("username", email); // `username` is expected by FastAPI's OAuth2PasswordRequestForm
    formData.append("password", password);

    const res = await apiClient.post("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    login(res.data.access_token);
    navigate("/");
  } catch (err: any) {
    setError(err.response?.data?.detail || "Login failed");
  }
};

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-black px-4">
      <div className="relative w-full max-w-md backdrop-blur-3xl bg-white/10 border border-white/20 rounded-3xl shadow-[0_10px_40px_rgba(255,255,255,0.1)] px-10 py-12 text-white text-center">
        <img
          src={logo}
          alt="TinyVue Logo"
          className="h-80 mx-auto mb-8 object-contain drop-shadow-2xl"
        />

        <h1 className="text-4xl font-extrabold mb-6 tracking-wide">Sign In</h1>
        {error && (
          <p className="text-red-400 text-center mb-4 font-medium">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="mb-4 px-4 py-3 w-full rounded-lg bg-white/80 text-black placeholder-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="mb-6 px-4 py-3 w-full rounded-lg bg-white/80 text-black placeholder-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 w-full rounded-lg shadow-lg hover:opacity-90 transition"
        >
          Sign In
        </button>

        <p className="text-sm text-gray-300 mt-6">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-pink-400 font-semibold cursor-pointer hover:underline"
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}