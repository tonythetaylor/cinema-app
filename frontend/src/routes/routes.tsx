import { Routes, Route } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";

import WatchMovie from "../pages/WatchMovie";
import BrowsePage from "../pages/Browsepage";
import VideoPlayerWithChat from "../components/VideoPlayerWithChat"; // optional
import PartyJoin from "../components/PartyWatch/PartyJoin";
import PartyLobby from "../components/PartyWatch/PartyLobby";
import PartyWatchPage from "../components/PartyWatch/PartyWatchPage";
import JoinPartyByCode from "../components/PartyWatch/JoinPartyByCode";

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/party/join-by-code" element={<JoinPartyByCode />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <BrowsePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/watch/:id"
        element={
          <PrivateRoute>
            <WatchMovie />
          </PrivateRoute>
        }
      />

      {/* Watch party flow */}
      <Route
        path="/party/:id/lobby"
        element={
          <PrivateRoute>
            <PartyLobby />
          </PrivateRoute>
        }
      />
      <Route
        path="/party/:id/join"
        element={
          <PrivateRoute>
            <PartyJoin />
          </PrivateRoute>
        }
      />
      <Route
        path="/party/:id/watch"
        element={
          <PrivateRoute>
            <PartyWatchPage />
          </PrivateRoute>
        }
      />

      {/* Optional: fallback for unmatched routes */}
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
}