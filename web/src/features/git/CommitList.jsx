import { GitCommitVertical } from 'lucide-react';
import { Panel } from '../../components/ui/Panel.jsx';

export function CommitList({ commits }) {
  return (
    <Panel title="Commits" icon={<GitCommitVertical size={18} aria-hidden="true" />}>
      <div className="list-stack">
        {(commits || []).map((commit) => (
          <article key={commit.hash} className="list-row">
            <div>
              <strong>{commit.subject}</strong>
              <p>{commit.author} · {formatDate(commit.created_at)}</p>
            </div>
            <code>{commit.hash.slice(0, 7)}</code>
          </article>
        ))}
        {commits?.length ? null : <p className="muted">Коммитов пока нет</p>}
      </div>
    </Panel>
  );
}

function formatDate(value) {
  if (!value) return 'unknown';
  return new Date(value).toLocaleString();
}
