import { useEffect, useMemo, useState } from 'react';
import { Copy, Database, LogOut, Plus, ShieldCheck } from 'lucide-react';

async function api(path, options = {}) {
  const method = options.method || 'GET';
  const csrfToken = method === 'GET' || method === 'HEAD' ? '' : getCookie('mdock_csrf');
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  let payload = null;
  const text = await response.text();
  if (text) {
    payload = JSON.parse(text);
  }
  if (!response.ok) {
    const error = new Error(payload?.error || 'request_failed');
    error.status = response.status;
    throw error;
  }
  return payload;
}

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') || '';
}

export default function App() {
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [vaults, setVaults] = useState([]);
  const [vaultName, setVaultName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api('/api/auth/me')
      .then((payload) => {
        if (!active) return;
        setUser(payload);
        return loadVaults();
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadVaults() {
    const payload = await api('/api/vaults');
    setVaults(payload.vaults || []);
  }

  async function handleAuth(event) {
    event.preventDefault();
    setMessage(authMode === 'login' ? 'Проверяем доступ...' : 'Создаём пользователя...');
    try {
      const payload = await api(authMode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      setUser({ username: payload.username });
      setPassword('');
      await loadVaults();
      setMessage('');
    } catch (error) {
      setMessage(error.status === 409 ? 'Такой пользователь уже есть' : 'Не удалось выполнить вход');
    }
  }

  async function handleCreateVault(event) {
    event.preventDefault();
    setMessage('Создаём vault...');
    try {
      await api('/api/vaults', {
        method: 'POST',
        body: JSON.stringify({ name: vaultName })
      });
      setVaultName('');
      await loadVaults();
      setMessage('');
    } catch {
      setMessage('Не удалось создать vault');
    }
  }

  async function handleLogout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => null);
    setUser(null);
    setVaults([]);
    setMessage('');
  }

  if (loading) {
    return <main className="app-shell" aria-busy="true" />;
  }

  if (!user) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="brand-row">
            <ShieldCheck aria-hidden="true" size={22} />
            <h1 id="auth-title">mdock</h1>
          </div>
          <div className="mode-switch" role="tablist" aria-label="Режим авторизации">
            <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Вход
            </button>
            <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
              Регистрация
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
            <button type="submit">{authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
          </form>
          {message ? <p role="status">{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div className="brand-row">
          <ShieldCheck aria-hidden="true" size={22} />
          <h1>mdock</h1>
        </div>
        <div className="user-actions">
          <span>{user.username}</span>
          <button type="button" className="icon-button" onClick={handleLogout} title="Выйти" aria-label="Выйти">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="vault-toolbar" aria-labelledby="vaults-title">
        <div>
          <h2 id="vaults-title">Vaults</h2>
        </div>
        <form className="create-vault" onSubmit={handleCreateVault}>
          <label>
            Новый vault
            <input
              required
              value={vaultName}
              onChange={(event) => setVaultName(event.target.value)}
            />
          </label>
          <button type="submit" className="icon-text-button">
            <Plus size={18} aria-hidden="true" />
            Создать
          </button>
        </form>
      </section>

      {message ? <p role="status" className="page-status">{message}</p> : null}

      <section className="vault-grid" aria-label="Vaults">
        {vaults.map((vault) => (
          <VaultCard key={vault.id} vault={vault} />
        ))}
      </section>
    </main>
  );
}

function VaultCard({ vault }) {
  const webdavURL = useMemo(() => `${window.location.origin}/webdav/${vault.slug}/`, [vault.slug]);
  const [copied, setCopied] = useState(false);

  async function copyURL() {
    await navigator.clipboard?.writeText(webdavURL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="vault-card">
      <div className="vault-card-header">
        <Database size={20} aria-hidden="true" />
        <div>
          <h3>{vault.slug}</h3>
          <p>{vault.kind} · {vault.role}</p>
        </div>
      </div>
      <label>
        WebDAV URL
        <div className="url-row">
          <input readOnly value={webdavURL} />
          <button type="button" className="icon-button" onClick={copyURL} title="Скопировать WebDAV URL" aria-label="Скопировать WebDAV URL">
            <Copy size={18} aria-hidden="true" />
          </button>
        </div>
      </label>
      {copied ? <p role="status" className="copy-status">Скопировано</p> : null}
    </article>
  );
}
