import { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../lib/apiClient";

interface AuthContextType {
  user: any;
  accessToken: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (token: string) => {
    localStorage.setItem("accessToken", token);
    setAccessToken(token);
    await fetchUser(token);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setAccessToken(null);
    setUser(null);
  };

  const fetchUser = async (token: string) => {
    try {
      const res = await apiClient.get("/profile/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (err) {
      console.warn("Invalid or expired token");
      logout();
    }
  };

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        setAccessToken(token);
        await fetchUser(token);
      }
      setLoading(false);
    };
    init();
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}