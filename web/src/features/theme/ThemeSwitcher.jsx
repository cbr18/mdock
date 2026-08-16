import { Palette } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider.jsx';
import { ACCENT_COLORS, BACKGROUND_THEMES, useTheme } from './ThemeProvider.jsx';

export function ThemeSwitcher() {
  const { theme, setTheme, accent, setAccent } = useTheme();
  const { t } = useLanguage();

  return (
    <details className="theme-switcher">
      <summary className="icon-button" aria-label={t('themeSettings')} title={t('themeSettings')}>
        <Palette size={18} aria-hidden="true" />
      </summary>
      <div className="theme-popover">
        <fieldset>
          <legend>{t('background')}</legend>
          <div className="theme-options">
            {BACKGROUND_THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={theme === item.id ? 'selected' : ''}
                onClick={() => setTheme(item.id)}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('accent')}</legend>
          <div className="accent-options">
            {ACCENT_COLORS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={accent === item.id ? 'selected' : ''}
                data-accent-option={item.id}
                onClick={() => setAccent(item.id)}
                aria-label={t(item.labelKey)}
                title={t(item.labelKey)}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </details>
  );
}
