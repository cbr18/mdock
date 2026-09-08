import { Archive, ArrowLeft, Copy, Database, Pencil, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { archiveVault, getMembers, getVault, getWebDAV, renameVault, unarchiveVault } from '../api/vaults.js';
import { getCommits, getRemote, getStatus, pushRemote, setRemote } from '../api/git.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { StatusMessage } from '../components/ui/StatusMessage.jsx';
import { CommitList } from '../features/git/CommitList.jsx';
import { GitStatusPanel } from '../features/git/GitStatusPanel.jsx';
import { RemoteSettings } from '../features/git/RemoteSettings.jsx';
import { SnapshotPanel } from '../features/git/SnapshotPanel.jsx';
import { VaultFilesPanel } from '../features/files/VaultFilesPanel.jsx';
import { useLanguage } from '../features/i18n/LanguageProvider.jsx';

export function VaultPage({ slug, onNavigate, onVaultChanged }) {
  const [vault, setVault] = useState(null);
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState(null);
  const [commits, setCommits] = useState([]);
  const [activityCommits, setActivityCommits] = useState(null);
  const [remote, setRemoteState] = useState(null);
  const [webdav, setWebDAV] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [section, setSection] = useState(() => sectionFromLocation());
  const { t } = useLanguage();

  useEffect(() => {
    loadVault();
  }, [slug]);

  useEffect(() => {
    setSection(sectionFromLocation());
  }, [slug]);

  useEffect(() => {
    if (section === 'activity' && !activityCommits) {
      getCommits(slug, 200)
        .then((payload) => setActivityCommits(payload.commits || []))
        .catch(() => setActivityCommits([]));
    }
  }, [slug, section, activityCommits]);

  useEffect(() => {
    function handlePopState() {
      setSection(sectionFromLocation());
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  async function loadVault() {
    setMessage('');
    const vaultPayload = await getVault(slug);
    const activeVault = vaultPayload.vault;
    const requests = [getMembers(slug)];
    if (!activeVault.archived) {
      requests.push(getStatus(slug), getCommits(slug, 20), getRemote(slug), getWebDAV(slug));
    }
    const [membersPayload, statusPayload, commitsPayload, remotePayload, webdavPayload] = await Promise.all(requests);
    setVault(vaultPayload.vault);
    setName(vaultPayload.vault.name || vaultPayload.vault.slug);
    setMembers(membersPayload.members || []);
    setStatus(activeVault.archived ? null : statusPayload);
    setCommits(activeVault.archived ? [] : commitsPayload.commits || []);
    setActivityCommits(null);
    setRemoteState(activeVault.archived ? null : remotePayload);
    setWebDAV(activeVault.archived ? null : webdavPayload.webdav);
  }

  async function reloadActivity() {
    try {
      const payload = await getCommits(slug, 200);
      setActivityCommits(payload.commits || []);
    } catch {
      setActivityCommits([]);
    }
  }

  async function handleRename(event) {
    event.preventDefault();
    setMessage(t('loading'));
    try {
      await renameVault(slug, name);
      await onVaultChanged();
      await loadVault();
      setMessage('');
    } catch {
      setMessage(t('failedRename'));
    }
  }

  async function handleArchiveToggle() {
    if (!vault?.archived && !window.confirm(t('confirmArchive'))) {
      return;
    }
    setMessage(vault?.archived ? t('restoring') : t('vaultArchived'));
    try {
      if (vault?.archived) {
        await unarchiveVault(slug);
      } else {
        await archiveVault(slug);
      }
      await onVaultChanged();
      await loadVault();
      setMessage('');
    } catch {
      setMessage(t('failedArchive'));
    }
  }

  async function handleSaveRemote(url) {
    setMessage(t('remoteSaving'));
    try {
      await setRemote(slug, url);
      const payload = await getRemote(slug);
      setRemoteState(payload);
      setMessage('');
    } catch {
      setMessage(t('failedRemote'));
    }
  }

  async function handlePushRemote() {
    setMessage(t('pushing'));
    try {
      await pushRemote(slug);
      await loadVault();
      setMessage('');
    } catch {
      const payload = await getRemote(slug).catch(() => null);
      if (payload) setRemoteState(payload);
      setMessage(t('failedPush'));
    }
  }

  async function copyWebDAV() {
    const url = webdav?.url || `${window.location.origin}/webdav/${slug}/`;
    await navigator.clipboard?.writeText(url);
    setMessage(t('webdavCopied'));
  }

  function handleInternalNavigation(event, page) {
    if (shouldUseNativeNavigation(event)) return;
    event.preventDefault();
    onNavigate(page);
  }

  function handleSectionChange(nextSection) {
    setSection(nextSection);
    updateSearchParam('section', nextSection);
  }

  if (!vault) {
    return <StatusMessage className="page-status">{t('loading')}</StatusMessage>;
  }

  const webdavURL = webdav?.url || `${window.location.origin}/webdav/${vault.slug}/`;

  return (
    <>
      <PageHeader
        title={vault.name || vault.slug}
        actions={(
          <>
            <a className="secondary-button" href="/" onClick={(event) => handleInternalNavigation(event, 'dashboard')}>
              <ArrowLeft size={16} aria-hidden="true" />
              {t('back')}
            </a>
            <button type="button" className="secondary-button" onClick={handleArchiveToggle}>
              {vault.archived ? <RotateCcw size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
              {vault.archived ? t('restore') : t('archiveVault')}
            </button>
          </>
        )}
      />
      <nav className="breadcrumbs" aria-label={t('breadcrumbs')}>
        <a href="/" onClick={(event) => handleInternalNavigation(event, 'dashboard')}>{t('vaults')}</a>
        <span>/</span>
        <span>{vault.name || vault.slug}</span>
      </nav>
      <StatusMessage className="page-status">{message}</StatusMessage>
      <div className="page-tabs vault-section-tabs" role="tablist" aria-label={t('vault')}>
        <button type="button" role="tab" aria-selected={section === 'editor'} className={section === 'editor' ? 'active' : ''} onClick={() => handleSectionChange('editor')}>
          {t('vaultEditor')}
        </button>
        <button type="button" role="tab" aria-selected={section === 'activity'} className={section === 'activity' ? 'active' : ''} onClick={() => handleSectionChange('activity')}>
          {t('activity')}
        </button>
        <button type="button" role="tab" aria-selected={section === 'settings'} className={section === 'settings' ? 'active' : ''} onClick={() => handleSectionChange('settings')}>
          {t('vaultSettings')}
        </button>
      </div>
      {section === 'editor' && !vault.archived ? <VaultFilesPanel slug={slug} defaultFileRoot={webdav?.default_file_root} /> : null}
      {section === 'editor' && vault.archived ? (
        <div className="vault-settings-grid">
          <Panel title={t('git')}>
            <p className="muted">{t('archivedNotice')}</p>
          </Panel>
        </div>
      ) : null}
      {section === 'activity' && !vault.archived ? (
        <div className="vault-activity-wrap">
          <CommitList slug={slug} commits={activityCommits || []} groupByDay onRestored={reloadActivity} />
        </div>
      ) : null}
      {section === 'activity' && vault.archived ? (
        <div className="vault-settings-grid">
          <Panel title={t('git')}>
            <p className="muted">{t('archivedNotice')}</p>
          </Panel>
        </div>
      ) : null}
      {section === 'settings' ? (
        <div className="vault-settings-grid">
          <Panel title={t('vault')} icon={<Database size={18} aria-hidden="true" />}>
            <form className="stack-form" onSubmit={handleRename}>
              <label>
                {t('name')}
                <input name="vault-name" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <button type="submit" className="icon-text-button">
                <Pencil size={16} aria-hidden="true" />
                {t('save')}
              </button>
            </form>
            <dl className="metadata-list">
              <div><dt>{t('slug')}</dt><dd>{vault.slug}</dd></div>
              <div><dt>{t('path')}</dt><dd>{vault.path}</dd></div>
              <div><dt>{t('role')}</dt><dd>{vault.role}</dd></div>
              <div><dt>{t('archived')}</dt><dd>{vault.archived ? t('yes') : t('no')}</dd></div>
            </dl>
            <label>
              {t('webdavURL')}
              <div className="url-row">
                <input readOnly name="webdav-url" aria-label={t('webdavURL')} value={webdavURL} />
                <button type="button" className="icon-button" onClick={copyWebDAV} title={t('copyWebDAV')} aria-label={t('copyWebDAV')}>
                  <Copy size={18} aria-hidden="true" />
                </button>
              </div>
            </label>
          </Panel>
          <Panel title={t('members')}>
            <div className="list-stack">
              {members.map((member) => (
                <article key={member.user_id} className="list-row">
                  <div>
                    <strong>{member.login}</strong>
                    <p>{member.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
          {vault.archived ? (
            <Panel title={t('git')}>
              <p className="muted">{t('archivedNotice')}</p>
            </Panel>
          ) : (
            <>
              <GitStatusPanel status={status} />
              <SnapshotPanel slug={slug} />
              <RemoteSettings
                remoteURL={remote?.remote_url || ''}
                lastPushAt={remote?.last_push_at || ''}
                lastPushError={remote?.last_push_error || ''}
                onSave={handleSaveRemote}
                onPush={handlePushRemote}
              />
              <CommitList slug={slug} commits={commits} />
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

function sectionFromLocation() {
  const section = new URLSearchParams(window.location.search).get('section');
  return section === 'settings' || section === 'activity' ? section : 'editor';
}

function updateSearchParam(key, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.pushState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
}

function shouldUseNativeNavigation(event) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}
