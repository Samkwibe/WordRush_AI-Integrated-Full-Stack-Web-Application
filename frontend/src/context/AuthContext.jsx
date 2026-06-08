import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { me, logout as apiLogout, googleSession } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await me();
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If the URL fragment contains a session_id from Emergent Google,
    // AuthCallback handles it. Skip /me until that completes.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const value = {
    user,
    loading,
    setUser,
    refresh,
    logout: async () => { await apiLogout(); setUser(null); },
    completeGoogle: async (session_id) => {
      const u = await googleSession(session_id);
      setUser(u);
      return u;
    },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
