import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import React from "react";

export default function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { accessToken, loading } = useAuth();

  if (loading) return <div className="text-white">Checking session...</div>;

  return accessToken ? children : <Navigate to="/login" replace />;
}