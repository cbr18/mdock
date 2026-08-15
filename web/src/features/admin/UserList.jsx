import { KeyRound, Power, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function UserList({ users, onDisable, onEnable, onResetPassword, onRevokeSessions }) {
  const [passwords, setPasswords] = useState({});

  return (
    <div className="list-stack">
      {(users || []).map((user) => (
        <article key={user.id} className="list-row user-row">
          <div>
            <strong>{user.login}</strong>
            <p>{user.is_admin ? 'admin' : 'user'} · {user.disabled ? 'disabled' : 'enabled'}</p>
          </div>
          <div className="row-actions">
            <input
              aria-label={`Новый пароль для ${user.login}`}
              type="password"
              placeholder="new password"
              value={passwords[user.login] || ''}
              onChange={(event) => setPasswords({ ...passwords, [user.login]: event.target.value })}
            />
            <button type="button" className="icon-button" title="Сменить пароль" aria-label={`Сменить пароль ${user.login}`} onClick={() => onResetPassword(user.login, passwords[user.login] || '')}>
              <KeyRound size={16} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button" title="Отозвать сессии" aria-label={`Отозвать сессии ${user.login}`} onClick={() => onRevokeSessions(user.login)}>
              <RotateCcw size={16} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button" title={user.disabled ? 'Включить' : 'Отключить'} aria-label={`${user.disabled ? 'Включить' : 'Отключить'} ${user.login}`} onClick={() => (user.disabled ? onEnable(user.login) : onDisable(user.login))}>
              <Power size={16} aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
