import { Suspense, lazy, useEffect, useState } from 'react';
import { logout, me } from './api/auth.js';
import { listVaults } from './api/vaults.js';
import { AppShell } from './components/layout/AppShell.jsx';
import { Topbar } from './components/layout/Topbar.jsx';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { LanguageProvider, useLanguage } from './features/i18n/LanguageProvider.jsx';
import { ThemeProvider } from './features/theme/ThemeProvider.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';

const AccountPage = lazy(() => import('./pages/AccountPage.jsx').then((module) => ({ default: module.AccountPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.jsx').then((module) => ({ default: module.AdminUsersPage })));
const VaultPage = lazy(() => import('./pages/VaultPage.jsx').then((module) => ({ default: module.VaultPage })));

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [vaults, setVaults] = useState([]);
  const [archivedVaults, setArchivedVaults] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(() => pageFromLocation());

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

  useEffect(() => {
    function handlePopState() {
      setPage(pageFromLocation());
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  async function loadVaults() {
    const [activePayload, archivedPayload] = await Promise.all([listVaults(), listVaults('only')]);
    setVaults(activePayload.vaults || []);
    setArchivedVaults(archivedPayload.vaults || []);
  }

  async function handleAuthenticated(nextUser) {
    const currentUser = await me().catch(() => nextUser);
    setUser(currentUser);
    await loadVaults();
    navigate('dashboard', { replace: true });
  }

  async function handleLogout() {
    await logout().catch(() => null);
    setUser(null);
    setVaults([]);
    setArchivedVaults([]);
    setMessage('');
    navigate('dashboard', { replace: true });
  }

  function navigate(nextPage, options = {}) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const next = pageFromName(nextPage);
    const nextURL = urlForPage(next);
    if (options.replace) {
      window.history.replaceState(null, '', nextURL);
    } else {
      window.history.pushState(null, '', nextURL);
    }
    setPage(next);
  }

  function pageFromName(nextPage) {
    if (nextPage === 'dashboard' || nextPage === 'admin-users' || nextPage === 'account') {
      return { name: nextPage };
    }
    if (nextPage.startsWith('vault:')) {
      return { name: 'vault', slug: nextPage.slice('vault:'.length) };
    }
    return { name: 'dashboard' };
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
      <Suspense fallback={<p role="status" className="page-status">{t('loading')}</p>}>
        {page.name === 'dashboard' ? (
          <DashboardPage
            vaults={vaults}
            archivedVaults={archivedVaults}
            onReloadVaults={loadVaults}
            onOpenVault={(slug) => navigate(`vault:${slug}`)}
            message={message}
            setMessage={setMessage}
          />
        ) : null}
        {page.name === 'vault' ? <VaultPage slug={page.slug} onNavigate={navigate} onVaultChanged={loadVaults} /> : null}
        {page.name === 'admin-users' ? <AdminUsersPage /> : null}
        {page.name === 'account' ? <AccountPage user={user} /> : null}
      </Suspense>
    </AppShell>
  );
}

function pageFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('page') || 'dashboard';
  if (name === 'vault') {
    return { name: 'vault', slug: params.get('slug') || '' };
  }
  if (name === 'admin-users' || name === 'account') {
    return { name };
  }
  return { name: 'dashboard' };
}

function urlForPage(page) {
  const params = new URLSearchParams();
  if (page.name === 'vault') {
    params.set('page', 'vault');
    params.set('slug', page.slug);
    return `/?${params.toString()}`;
  }
  if (page.name === 'admin-users' || page.name === 'account') {
    params.set('page', page.name);
    return `/?${params.toString()}`;
  }
  return '/';
}
