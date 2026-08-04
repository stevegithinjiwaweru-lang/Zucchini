import React, { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/auth.service";
import type { RiderUser } from "../services/auth.service";

interface AuthContextValue {
  user: RiderUser | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RiderUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getStoredUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = async (phone: string, password: string) => {
    const u = await authService.login(phone, password);
    setUser(u);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
