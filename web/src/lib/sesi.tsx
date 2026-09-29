import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type Sesi } from './api';

/**
 * The currently signed-in user.
 *
 * Loaded once at the root of the app so that individual pages do not each call
 * /api/auth/saya, and so signed-in state stays consistent across the interface.
 */
const Konteks = createContext<{
  sesi: Sesi | null;
  memuat: boolean;
  pasang: (s: Sesi | null) => void;
  keluar: () => Promise<void>;
} | null>(null);

export function PenyediaSesi({ children }: { children: React.ReactNode }) {
  const [sesi, setSesi] = useState<Sesi | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    api
      .saya()
      .then(setSesi)
      .catch(() => setSesi(null))
      .finally(() => setMemuat(false));
  }, []);

  const keluar = useCallback(async () => {
    await api.keluar().catch(() => {});
    setSesi(null);
  }, []);

  const nilai = useMemo(() => ({ sesi, memuat, pasang: setSesi, keluar }), [sesi, memuat, keluar]);
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}

export function useSesi() {
  const nilai = useContext(Konteks);
  if (!nilai) throw new Error('useSesi harus dipakai di dalam PenyediaSesi');
  return nilai;
}
