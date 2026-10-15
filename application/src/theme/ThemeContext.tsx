import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeMode } from '../data/types';

/** Stored user choice: explicit light/dark, or follow the browser default. */
export type ThemePreference = ThemeMode | 'browser';

interface ThemeContextValue {
  /** Resolved light/dark used for rendering. */
  theme: ThemeMode;
  /** Persisted preference, including browser default. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Cycles light → dark → browser → light. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'k8s-reference-architecture-app-theme';

function readBrowserTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function readInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'browser';
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'browser') {
    return stored;
  }
  // Migrate the previous "system" storage value.
  if (stored === 'system') {
    return 'browser';
  }
  return 'browser';
}

function resolveTheme(preference: ThemePreference): ThemeMode {
  return preference === 'browser' ? readBrowserTheme() : preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readInitialPreference);
  const [theme, setTheme] = useState<ThemeMode>(() =>
    resolveTheme(readInitialPreference()),
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, preference);
    setTheme(resolveTheme(preference));

    if (preference !== 'browser' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('pf-v6-theme-dark');
    } else {
      root.classList.remove('pf-v6-theme-dark');
    }
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferenceState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'browser';
      return 'light';
    });
  }, []);

  const value = useMemo(
    () => ({ theme, preference, setPreference, toggleTheme }),
    [theme, preference, setPreference, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
