import { Activity } from 'lucide-react';
import { Panel } from '../../components/ui/Panel.jsx';

export function GitStatusPanel({ status }) {
  return (
    <Panel title="Git status" icon={<Activity size={18} aria-hidden="true" />}>
      <div className="metric-grid">
        <Metric label="Dirty" value={status?.dirty ? 'yes' : 'no'} tone={status?.dirty ? 'warn' : 'ok'} />
        <Metric label="Queue" value={String(status?.queue_len ?? 0)} />
        <Metric label="Last error" value={status?.last_error || 'none'} tone={status?.last_error ? 'danger' : 'muted'} />
      </div>
      {status?.status ? <pre className="code-block">{status.status}</pre> : null}
    </Panel>
  );
}

function Metric({ label, value, tone = 'default' }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
