import { useEffect, useState } from 'react';
import { logout, me } from './api/auth.js';
import { listVaults } from './api/vaults.js';
import { AppShell } from './components/layout/AppShell.jsx';
import { Topbar } from './components/layout/Topbar.jsx';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { ThemeProvider } from './features/theme/ThemeProvider.jsx';
import { AccountPage } from './pages/AccountPage.jsx';
import { AdminUsersPage } from './pages/AdminUsersPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { VaultPage } from './pages/VaultPage.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [vaults, setVaults] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState({ name: 'dashboard' });

  useEffect(() => {
    let active = true;
    me()
      .then((payload) => {
        if (!active) return null;
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
    const payload = await listVaults();
    setVaults(payload.vaults || []);
  }

  async function handleAuthenticated(nextUser) {
    const currentUser = await me().catch(() => nextUser);
    setUser(currentUser);
    await loadVaults();
    setPage({ name: 'dashboard' });
  }

  async function handleLogout() {
    await logout().catch(() => null);
    setUser(null);
    setVaults([]);
    setMessage('');
    setPage({ name: 'dashboard' });
  }

  function navigate(nextPage) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (nextPage === 'dashboard' || nextPage === 'admin-users' || nextPage === 'account') {
      setPage({ name: nextPage });
      return;
    }
    if (nextPage.startsWith('vault:')) {
      setPage({ name: 'vault', slug: nextPage.slice('vault:'.length) });
    }
  }

  if (loading) {
    return <main className="app-shell" aria-busy="true" />;
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <AppShell>
      <Topbar user={user} onNavigate={navigate} onLogout={handleLogout} />
      {page.name === 'dashboard' ? (
        <DashboardPage
          vaults={vaults}
          onReloadVaults={loadVaults}
          onOpenVault={(slug) => navigate(`vault:${slug}`)}
          message={message}
          setMessage={setMessage}
        />
      ) : null}
      {page.name === 'vault' ? <VaultPage slug={page.slug} onVaultChanged={loadVaults} /> : null}
      {page.name === 'admin-users' ? <AdminUsersPage /> : null}
      {page.name === 'account' ? <AccountPage user={user} /> : null}
    </AppShell>
  );
}
