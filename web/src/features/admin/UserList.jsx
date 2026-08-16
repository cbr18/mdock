import { KeyRound, Power, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function UserList({ users, onDisable, onEnable, onResetPassword, onRevokeSessions }) {
  const [passwords, setPasswords] = useState({});
  const { t } = useLanguage();

  return (
    <div className="list-stack">
      {(users || []).map((user) => (
        <article key={user.id} className="list-row user-row">
          <div>
            <strong>{user.login}</strong>
            <p>{user.is_admin ? t('admin') : t('regularUser')} · {user.disabled ? t('disabled') : t('enabled')}</p>
          </div>
          <div className="row-actions">
            <input
              aria-label={`${t('newPassword')} ${user.login}`}
              type="password"
              name={`new-password-${user.login}`}
              placeholder={t('newPassword')}
              autoComplete="new-password"
              value={passwords[user.login] || ''}
              onChange={(event) => setPasswords({ ...passwords, [user.login]: event.target.value })}
            />
            <button type="button" className="icon-button" title={t('changePassword')} aria-label={`${t('changePassword')} ${user.login}`} onClick={() => onResetPassword(user.login, passwords[user.login] || '')}>
              <KeyRound size={16} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button" title={t('revokeSessions')} aria-label={`${t('revokeSessions')} ${user.login}`} onClick={() => onRevokeSessions(user.login)}>
              <RotateCcw size={16} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button" title={user.disabled ? t('enabled') : t('disable')} aria-label={`${user.disabled ? t('enabled') : t('disable')} ${user.login}`} onClick={() => (user.disabled ? onEnable(user.login) : onDisable(user.login))}>
              <Power size={16} aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
