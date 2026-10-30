import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = "brightloop-auth";

export const ROLE_HOME = {
  admin: "/admin/dashboard",
  staff: "/staff/dashboard",
  customer: "/customer/dashboard",
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Restore session from localStorage on mount so login survives refresh.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role && parsed.id && parsed.user) {
          setSession(parsed);
        }
      }
    } catch (_) {
      // Ignore malformed storage
    }
    setIsReady(true);
  }, []);

  const persistSession = useCallback((next) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    } catch (_) {
      // Ignore storage errors
    }
  }, []);

  const login = useCallback(
    async (email, password) => {
      try {
        const result = await authService.login(email, password);
        const user = result.user;
        const next = { role: user.role, id: user.id, user };
        setSession(next);
        persistSession(next);
        return { ok: true, role: user.role, user };
      } catch (error) {
        return { ok: false, error: error.message || "Incorrect email or password." };
      }
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } catch (_) {
      // Ignore logout errors
    }
    setSession(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (_) {
      // Ignore
    }
  }, []);

  const user = useMemo(() => {
    if (!session) return null;
    return { ...session.user, role: session.role };
  }, [session]);

  const value = useMemo(() => ({ user, login, logout, isReady }), [user, login, logout, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
