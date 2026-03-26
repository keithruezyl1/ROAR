'use client';

import * as React from 'react';

type ThemeContextValue = {
  dark: boolean;
  setDark: (v: boolean) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem('theme');
    const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored === 'dark' || (!stored && preferDark);
    setDark(initial);
    setReady(true);
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    if (!ready) return;
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark, ready]);

  return <ThemeContext.Provider value={{ dark, setDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('ThemeProvider missing');
  return ctx;
}
