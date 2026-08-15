import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const BACKGROUND_THEMES = [
  { id: 'dark', label: 'Темно-серый' },
  { id: 'black', label: 'Чёрный' },
  { id: 'warm', label: 'Бежевый' },
  { id: 'light', label: 'Белый' }
];

export const ACCENT_COLORS = [
  { id: 'violet', label: 'Violet' },
  { id: 'blue', label: 'Blue' },
  { id: 'cyan', label: 'Cyan' },
  { id: 'green', label: 'Green' },
  { id: 'amber', label: 'Amber' },
  { id: 'rose', label: 'Rose' }
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
