import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { login, setupFirstAdmin } from '../../api/auth.js';
import { StatusMessage } from '../../components/ui/StatusMessage.jsx';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function AuthPage({ onAuthenticated }) {
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [message, setMessage] = useState('');
  const { t } = useLanguage();

  async function handleAuth(event) {
    event.preventDefault();
    setMessage(authMode === 'login' ? t('loading') : t('creatingAdmin'));
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
        setMessage(t('registrationClosed'));
        return;
      }
      setMessage(authMode === 'login' ? t('failedLogin') : t('failedCreateAdmin'));
    }
  }

  return (
    <main className="app-shell auth-shell">
      <section className="auth-panel surface-panel" aria-labelledby="auth-title">
        <div className="brand-row">
          <ShieldCheck aria-hidden="true" size={22} />
          <h1 id="auth-title">mdock</h1>
        </div>
        <div className="mode-switch" role="tablist" aria-label={t('loginMode')}>
          <button type="button" role="tab" aria-selected={authMode === 'login'} className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
            {t('loginMode')}
          </button>
          <button type="button" role="tab" aria-selected={authMode === 'setup'} className={authMode === 'setup' ? 'active' : ''} onClick={() => setAuthMode('setup')}>
            {t('setupMode')}
          </button>
        </div>
        <form onSubmit={handleAuth}>
          <label>
            {t('login')}
            <input
              autoComplete="username"
              name="username"
              required
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            {t('password')}
            <input
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              name="password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {authMode === 'setup' ? (
            <label>
              {t('setupToken')}
              <input
                autoComplete="one-time-code"
                name="setup-token"
                spellCheck={false}
                value={setupToken}
                onChange={(event) => setSetupToken(event.target.value)}
              />
            </label>
          ) : null}
          <button type="submit">{authMode === 'login' ? t('loginAction') : t('createAdmin')}</button>
        </form>
        <StatusMessage className="inline-status">{message}</StatusMessage>
      </section>
    </main>
  );
}
