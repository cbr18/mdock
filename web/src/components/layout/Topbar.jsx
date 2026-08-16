import { LogOut, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher, useLanguage } from '../../features/i18n/LanguageProvider.jsx';
import { ThemeSwitcher } from '../../features/theme/ThemeSwitcher.jsx';

export function Topbar({ user, onNavigate, onLogout }) {
  const { t } = useLanguage();

  function handleNavClick(event, page) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    onNavigate(page);
  }

  return (
    <header className="topbar">
      <a className="brand-button" href="/" onClick={(event) => handleNavClick(event, 'dashboard')} aria-label="Dashboard">
        <ShieldCheck aria-hidden="true" size={22} />
        <span>mdock</span>
      </a>
      <nav className="topnav" aria-label={t('mainNav')}>
        <a href="/" onClick={(event) => handleNavClick(event, 'dashboard')}>{t('vaults')}</a>
        {user?.is_admin ? <a href="/?page=admin-users" onClick={(event) => handleNavClick(event, 'admin-users')}>{t('users')}</a> : null}
        <a href="/?page=account" onClick={(event) => handleNavClick(event, 'account')}>{t('account')}</a>
      </nav>
      <div className="user-actions">
        <ThemeSwitcher />
        <LanguageSwitcher />
        <span>{user?.username}</span>
        <button type="button" className="icon-button" onClick={onLogout} title={t('logout')} aria-label={t('logout')}>
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
