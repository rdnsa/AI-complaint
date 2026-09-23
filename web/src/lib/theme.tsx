import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Light or dark theme.
 *
 * Light is the default for everyone; dark is only used once a visitor picks
 * it with the toggle, and that choice is stored per browser. The `dark` class
 * on <html> is what the palette variables in index.css react to, so switching
 * costs no re-render of individual components.
 */
const STORAGE_KEY = 'theme';

function initialDark(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark';
  } catch {
    return false; // localStorage may be blocked; stay on the light default
  }
}

const Context = createContext<{ dark: boolean; setDark: (dark: boolean) => void } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDarkState] = useState<boolean>(initialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    // The browser chrome on phones follows the header colour either way.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#4A1D16');
  }, [dark]);

  const setDark = useCallback((d: boolean) => {
    setDarkState(d);
    try {
      localStorage.setItem(STORAGE_KEY, d ? 'dark' : 'light');
    } catch {
      /* ignore when storage is unavailable */
    }
  }, []);

  const value = useMemo(() => ({ dark, setDark }), [dark, setDark]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTheme() {
  const value = useContext(Context);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
