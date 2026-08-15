import { LogOut, ShieldCheck } from 'lucide-react';
import { ThemeSwitcher } from '../../features/theme/ThemeSwitcher.jsx';

export function Topbar({ user, onNavigate, onLogout }) {
  return (
    <header className="topbar">
      <button type="button" className="brand-button" onClick={() => onNavigate('dashboard')} aria-label="Dashboard">
        <ShieldCheck aria-hidden="true" size={22} />
        <span>mdock</span>
      </button>
      <nav className="topnav" aria-label="Основная навигация">
        <button type="button" onClick={() => onNavigate('dashboard')}>Vaults</button>
        {user?.is_admin ? <button type="button" onClick={() => onNavigate('admin-users')}>Users</button> : null}
        <button type="button" onClick={() => onNavigate('account')}>Account</button>
      </nav>
      <div className="user-actions">
        <ThemeSwitcher />
        <span>{user?.username}</span>
        <button type="button" className="icon-button" onClick={onLogout} title="Выйти" aria-label="Выйти">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
