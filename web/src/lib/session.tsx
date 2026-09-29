import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type Session } from './api';

/**
 * The currently signed-in user.
 *
 * Loaded once at the root of the app so that individual pages do not each call
 * /api/auth/me, and so signed-in state stays consistent across the interface.
 */
const Context = createContext<{
  session: Session | null;
  loading: boolean;
  setSession: (s: Session | null) => void;
  logout: () => Promise<void>;
} | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, loading, setSession, logout }), [session, loading, logout]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
