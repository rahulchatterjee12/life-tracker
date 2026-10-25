'use client';

import { createContext, useContext, useEffect, useSyncExternalStore, useCallback } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({
  theme: 'light',
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = () => callback();
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('lifemetric-theme') as Theme | null;
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getServerSnapshot(): Theme {
  return 'light';
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => {
    const current = getSnapshot();
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem('lifemetric-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    notify();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
