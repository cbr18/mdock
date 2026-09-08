import { GitCommitVertical, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { getCommitDetails, restoreFile } from '../../api/git.js';
import { Panel } from '../../components/ui/Panel.jsx';
import { StatusMessage } from '../../components/ui/StatusMessage.jsx';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function CommitList({ slug, commits, groupByDay = false, onRestored }) {
  const { language, t } = useLanguage();
  const [selectedHash, setSelectedHash] = useState('');
  const [details, setDetails] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoringPath, setRestoringPath] = useState('');

  async function selectCommit(hash) {
    setSelectedHash(hash);
    setMessage('');
    setLoading(true);
    try {
      const payload = await getCommitDetails(slug, hash);
      setDetails(payload.commit);
    } catch {
      setDetails(null);
      setMessage(t('commitDetailsFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(file) {
    if (!window.confirm(t('restoreConfirm').replace('{name}', file.path))) {
      return;
    }
    setRestoringPath(file.path);
    setMessage('');
    try {
      await restoreFile(slug, selectedHash, file.path);
      setMessage(t('fileRestored'));
      if (onRestored) {
        onRestored();
      }
    } catch {
      setMessage(t('fileRestoreFailed'));
    } finally {
      setRestoringPath('');
    }
  }

  const grouped = groupByDay && commits ? groupByDayKey(commits, language) : null;

  return (
    <Panel title={t('commits')} icon={<GitCommitVertical size={18} aria-hidden="true" />} className="git-history-panel">
      <div className="git-history-layout">
        <div className="list-stack commit-list">
          {grouped ? grouped.map((group) => (
            <div key={group.day} className="commit-day-group">
              <h3 className="commit-day-header">{group.day}</h3>
              {group.commits.map((commit) => <CommitRow key={commit.hash} commit={commit} selectedHash={selectedHash} onSelect={selectCommit} />)}
            </div>
          )) : (commits || []).map((commit) => <CommitRow key={commit.hash} commit={commit} selectedHash={selectedHash} onSelect={selectCommit} />)}
          {commits?.length ? null : <p className="muted">{t('noCommits')}</p>}
        </div>
        <div className="commit-detail-pane">
          <StatusMessage>{message}</StatusMessage>
          {loading ? <p className="muted">{t('loading')}</p> : null}
          {!loading && !details ? <p className="muted">{t('selectCommit')}</p> : null}
          {details ? (
            <div className="commit-detail">
              <header className="commit-detail-header">
                <div>
                  <strong>{details.subject}</strong>
                  <p>{details.author} · {formatDate(details.created_at, language, t)} · <code>{details.hash.slice(0, 12)}</code></p>
                </div>
              </header>
              <div className="changed-file-list" aria-label={t('changedFiles')}>
                {(details.files || []).map((file) => (
                  <article key={`${file.status}:${file.old_path || ''}:${file.path}`} className="changed-file-row">
                    <span className="file-status-badge">{file.status}</span>
                    <span>
                      <strong>{file.path}</strong>
                      {file.old_path ? <small>{file.old_path}</small> : null}
                    </span>
                    <small>{file.binary ? t('binaryFile') : `+${file.adds || 0} -${file.deletes || 0}`}</small>
                    <button type="button" className="icon-button" title={t('restoreFile')} aria-label={`${t('restoreFile')}: ${file.path}`} disabled={restoringPath === file.path} onClick={() => handleRestore(file)}>
                      <RotateCcw size={15} aria-hidden="true" />
                    </button>
                  </article>
                ))}
                {details.files?.length ? null : <p className="muted">{t('noChangedFiles')}</p>}
              </div>
              <pre className="git-diff-view" aria-label={t('commitDiff')}><code>{details.diff || t('noDiff')}</code></pre>
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function CommitRow({ commit, selectedHash, onSelect }) {
  return (
    <button
      key={commit.hash}
      type="button"
      className={`list-row commit-row ${selectedHash === commit.hash ? 'active' : ''}`}
      onClick={() => onSelect(commit.hash)}
    >
      <span>
        <strong>{commit.subject}</strong>
        <small>{commit.author}</small>
      </span>
      <code>{commit.hash.slice(0, 7)}</code>
    </button>
  );
}

function groupByDayKey(commits, language) {
  const groups = [];
  const indexByDay = new Map();
  for (const commit of commits) {
    const day = formatDay(commit.created_at, language);
    if (!indexByDay.has(day)) {
      indexByDay.set(day, groups.length);
      groups.push({ day, commits: [] });
    }
    groups[indexByDay.get(day)].commits.push(commit);
  }
  return groups;
}

function formatDate(value, language, t) {
  if (!value) return t('unknown');
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ru-RU', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}

function formatDay(value, language) {
  if (!value) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ru-RU', {
    dateStyle: 'full'
  }).format(new Date(value));
}
