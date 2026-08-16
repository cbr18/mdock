import { GitCommitVertical } from 'lucide-react';
import { Panel } from '../../components/ui/Panel.jsx';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function CommitList({ commits }) {
  const { language, t } = useLanguage();
  return (
    <Panel title={t('commits')} icon={<GitCommitVertical size={18} aria-hidden="true" />}>
      <div className="list-stack">
        {(commits || []).map((commit) => (
          <article key={commit.hash} className="list-row">
            <div>
              <strong>{commit.subject}</strong>
              <p>{commit.author} · {formatDate(commit.created_at, language, t)}</p>
            </div>
            <code>{commit.hash.slice(0, 7)}</code>
          </article>
        ))}
        {commits?.length ? null : <p className="muted">{t('noCommits')}</p>}
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
