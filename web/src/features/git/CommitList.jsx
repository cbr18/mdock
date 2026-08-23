import { GitCommitVertical } from 'lucide-react';
import { useState } from 'react';
import { getCommitDetails } from '../../api/git.js';
import { Panel } from '../../components/ui/Panel.jsx';
import { StatusMessage } from '../../components/ui/StatusMessage.jsx';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function CommitList({ slug, commits }) {
  const { language, t } = useLanguage();
  const [selectedHash, setSelectedHash] = useState('');
  const [details, setDetails] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <Panel title={t('commits')} icon={<GitCommitVertical size={18} aria-hidden="true" />} className="git-history-panel">
      <div className="git-history-layout">
        <div className="list-stack commit-list">
          {(commits || []).map((commit) => (
            <button
              key={commit.hash}
              type="button"
              className={`list-row commit-row ${selectedHash === commit.hash ? 'active' : ''}`}
              onClick={() => selectCommit(commit.hash)}
            >
              <span>
                <strong>{commit.subject}</strong>
                <small>{commit.author} · {formatDate(commit.created_at, language, t)}</small>
              </span>
              <code>{commit.hash.slice(0, 7)}</code>
            </button>
          ))}
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
                <button type="button" className="secondary-button" disabled title={t('restoreFromCommitLater')}>
                  {t('restoreFile')}
                </button>
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

function formatDate(value, language, t) {
  if (!value) return t('unknown');
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ru-RU', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}
