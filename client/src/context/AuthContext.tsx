import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../lib/queryClient";

interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  login: async () => {}, logout: async () => {}, refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const u = await apiRequest<AuthUser | null>("GET", "/api/auth/me");
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    const res = await apiRequest<{ ok: boolean; role: string; fullName: string }>(
      "POST", "/api/auth/login", { email, password, rememberMe }
    );
    await refresh();
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
