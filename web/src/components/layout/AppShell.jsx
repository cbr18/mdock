import { useLanguage } from '../../features/i18n/LanguageProvider.jsx';

export function AppShell({ children }) {
  const { t } = useLanguage();

  return (
    <>
      <a className="skip-link" href="#main-content">{t('skipToContent')}</a>
      <main id="main-content" className="workspace-shell">{children}</main>
    </>
  );
}
