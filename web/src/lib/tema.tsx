import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Light or dark theme.
 *
 * The choice is stored per browser; a visitor who has never chosen follows the
 * operating system. The `dark` class on <html> is what the palette variables in
 * index.css react to, so switching costs no re-render of individual components.
 */
const PENYIMPANAN = 'tema';

function gelapAwal(): boolean {
  try {
    const tersimpan = localStorage.getItem(PENYIMPANAN);
    if (tersimpan === 'gelap') return true;
    if (tersimpan === 'terang') return false;
  } catch {
    /* localStorage may be blocked; fall back to the system setting */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

const Konteks = createContext<{ gelap: boolean; ubah: (gelap: boolean) => void } | null>(null);

export function PenyediaTema({ children }: { children: React.ReactNode }) {
  const [gelap, setGelap] = useState<boolean>(gelapAwal);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', gelap);
    // The browser chrome on phones follows the header colour either way.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#4A1D16');
  }, [gelap]);

  const ubah = useCallback((g: boolean) => {
    setGelap(g);
    try {
      localStorage.setItem(PENYIMPANAN, g ? 'gelap' : 'terang');
    } catch {
      /* ignore when storage is unavailable */
    }
  }, []);

  const nilai = useMemo(() => ({ gelap, ubah }), [gelap, ubah]);
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}

export function useTema() {
  const nilai = useContext(Konteks);
  if (!nilai) throw new Error('useTema harus dipakai di dalam PenyediaTema');
  return nilai;
}
