import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const BACKGROUND_THEMES = [
  { id: 'dark', labelKey: 'dark' },
  { id: 'black', labelKey: 'black' },
  { id: 'warm', labelKey: 'warm' },
  { id: 'light', labelKey: 'light' }
];

export const ACCENT_COLORS = [
  { id: 'violet', labelKey: 'violet' },
  { id: 'blue', labelKey: 'blue' },
  { id: 'cyan', labelKey: 'cyan' },
  { id: 'green', labelKey: 'green' },
  { id: 'amber', labelKey: 'amber' },
  { id: 'rose', labelKey: 'rose' }
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('mdock.theme') || 'dark');
  const [accent, setAccent] = useState(() => localStorage.getItem('mdock.accent') || 'violet');

  useEffect(() => {
    localStorage.setItem('mdock.theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('mdock.accent', accent);
  }, [accent]);

  const value = useMemo(() => ({ theme, setTheme, accent, setAccent }), [theme, accent]);

  return (
    <ThemeContext.Provider value={value}>
      <div className="theme-root" data-theme={theme} data-accent={accent}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
}
