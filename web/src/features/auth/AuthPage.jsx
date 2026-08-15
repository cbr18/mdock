import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { login, setupFirstAdmin } from '../../api/auth.js';
import { StatusMessage } from '../../components/ui/StatusMessage.jsx';

export function AuthPage({ onAuthenticated }) {
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [message, setMessage] = useState('');

  async function handleAuth(event) {
    event.preventDefault();
    setMessage(authMode === 'login' ? 'Проверяем доступ...' : 'Создаём первого администратора...');
    try {
      const payload = authMode === 'login'
        ? await login(username, password)
        : await setupFirstAdmin(username, password, setupToken);
      setPassword('');
      setSetupToken('');
      setMessage('');
      onAuthenticated({ username: payload.username, is_admin: payload.user?.is_admin ?? payload.is_admin ?? false });
    } catch (error) {
      if (error.status === 403 && error.message === 'registration_closed') {
        setMessage('Регистрация уже закрыта');
        return;
      }
      setMessage(authMode === 'login' ? 'Не удалось выполнить вход' : 'Не удалось создать администратора');
    }
  }

  return (
    <main className="app-shell auth-shell">
      <section className="auth-panel surface-panel" aria-labelledby="auth-title">
        <div className="brand-row">
          <ShieldCheck aria-hidden="true" size={22} />
          <h1 id="auth-title">mdock</h1>
        </div>
        <div className="mode-switch" role="tablist" aria-label="Режим авторизации">
          <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
            Вход
          </button>
          <button type="button" className={authMode === 'setup' ? 'active' : ''} onClick={() => setAuthMode('setup')}>
            Setup
          </button>
        </div>
        <form onSubmit={handleAuth}>
          <label>
            Логин
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            Пароль
            <input
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {authMode === 'setup' ? (
            <label>
              Setup token
              <input
                autoComplete="one-time-code"
                value={setupToken}
                onChange={(event) => setSetupToken(event.target.value)}
              />
            </label>
          ) : null}
          <button type="submit">{authMode === 'login' ? 'Войти' : 'Создать admin'}</button>
        </form>
        <StatusMessage className="inline-status">{message}</StatusMessage>
      </section>
    </main>
  );
}
