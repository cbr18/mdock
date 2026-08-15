import { Archive, Copy, Database, Pencil, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { archiveVault, getMembers, getVault, getWebDAV, renameVault, unarchiveVault } from '../api/vaults.js';
import { getCommits, getRemote, getStatus, pushRemote, setRemote } from '../api/git.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { StatusMessage } from '../components/ui/StatusMessage.jsx';
import { CommitList } from '../features/git/CommitList.jsx';
import { GitStatusPanel } from '../features/git/GitStatusPanel.jsx';
import { RemoteSettings } from '../features/git/RemoteSettings.jsx';

export function VaultPage({ slug, onVaultChanged }) {
  const [vault, setVault] = useState(null);
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState(null);
  const [commits, setCommits] = useState([]);
  const [remote, setRemoteState] = useState(null);
  const [webdav, setWebDAV] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadVault();
  }, [slug]);

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
    setRemoteState(activeVault.archived ? null : remotePayload);
    setWebDAV(activeVault.archived ? null : webdavPayload.webdav);
  }

  async function handleRename(event) {
    event.preventDefault();
    setMessage('Переименовываем vault...');
    try {
      await renameVault(slug, name);
      await onVaultChanged();
      await loadVault();
      setMessage('');
    } catch {
      setMessage('Не удалось переименовать vault');
    }
  }

  async function handleArchiveToggle() {
    setMessage(vault?.archived ? 'Возвращаем vault...' : 'Архивируем vault...');
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
      setMessage('Не удалось изменить архивный статус');
    }
  }

  async function handleSaveRemote(url) {
    setMessage('Сохраняем remote...');
    try {
      await setRemote(slug, url);
      const payload = await getRemote(slug);
      setRemoteState(payload);
      setMessage('');
    } catch {
      setMessage('Не удалось сохранить remote');
    }
  }

  async function handlePushRemote() {
    setMessage('Пушим remote...');
    try {
      await pushRemote(slug);
      await loadVault();
      setMessage('');
    } catch {
      const payload = await getRemote(slug).catch(() => null);
      if (payload) setRemoteState(payload);
      setMessage('Не удалось выполнить push');
    }
  }

  async function copyWebDAV() {
    const url = webdav?.url || `${window.location.origin}/webdav/${slug}/`;
    await navigator.clipboard?.writeText(url);
    setMessage('WebDAV URL скопирован');
  }

  if (!vault) {
    return <StatusMessage className="page-status">Загружаем vault...</StatusMessage>;
  }

  const webdavURL = webdav?.url || `${window.location.origin}/webdav/${vault.slug}/`;

  return (
    <>
      <PageHeader
        title={vault.name || vault.slug}
        actions={(
          <button type="button" className="secondary-button" onClick={handleArchiveToggle}>
            {vault.archived ? <RotateCcw size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
            {vault.archived ? 'Вернуть' : 'В архив'}
          </button>
        )}
      />
      <StatusMessage className="page-status">{message}</StatusMessage>
      <div className="dashboard-grid">
        <Panel title="Vault" icon={<Database size={18} aria-hidden="true" />}>
          <form className="stack-form" onSubmit={handleRename}>
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <button type="submit" className="icon-text-button">
              <Pencil size={16} aria-hidden="true" />
              Сохранить
            </button>
          </form>
          <dl className="metadata-list">
            <div><dt>Slug</dt><dd>{vault.slug}</dd></div>
            <div><dt>Path</dt><dd>{vault.path}</dd></div>
            <div><dt>Role</dt><dd>{vault.role}</dd></div>
            <div><dt>Archived</dt><dd>{vault.archived ? 'yes' : 'no'}</dd></div>
          </dl>
          <label>
            WebDAV URL
            <div className="url-row">
              <input readOnly value={webdavURL} />
              <button type="button" className="icon-button" onClick={copyWebDAV} title="Скопировать WebDAV URL" aria-label="Скопировать WebDAV URL">
                <Copy size={18} aria-hidden="true" />
              </button>
            </div>
          </label>
        </Panel>
        <Panel title="Members">
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
          <Panel title="Git">
            <p className="muted">Архивный vault скрыт от рабочих git/WebDAV операций.</p>
          </Panel>
        ) : (
          <>
            <GitStatusPanel status={status} />
            <RemoteSettings
              remoteURL={remote?.remote_url || ''}
              lastPushAt={remote?.last_push_at || ''}
              lastPushError={remote?.last_push_error || ''}
              onSave={handleSaveRemote}
              onPush={handlePushRemote}
            />
            <CommitList commits={commits} />
          </>
        )}
      </div>
    </>
  );
}
