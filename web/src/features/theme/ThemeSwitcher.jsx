import { Palette } from 'lucide-react';
import { ACCENT_COLORS, BACKGROUND_THEMES, useTheme } from './ThemeProvider.jsx';

export function ThemeSwitcher() {
  const { theme, setTheme, accent, setAccent } = useTheme();

  return (
    <details className="theme-switcher">
      <summary className="icon-button" aria-label="Настройки темы" title="Настройки темы">
        <Palette size={18} aria-hidden="true" />
      </summary>
      <div className="theme-popover">
        <fieldset>
          <legend>Фон</legend>
          <div className="theme-options">
            {BACKGROUND_THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={theme === item.id ? 'selected' : ''}
                onClick={() => setTheme(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Акцент</legend>
          <div className="accent-options">
            {ACCENT_COLORS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={accent === item.id ? 'selected' : ''}
                data-accent-option={item.id}
                onClick={() => setAccent(item.id)}
                aria-label={item.label}
                title={item.label}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </details>
  );
}
