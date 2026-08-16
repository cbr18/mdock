import { Activity } from 'lucide-react';
import { Panel } from '../../components/ui/Panel.jsx';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function GitStatusPanel({ status }) {
  const { t } = useLanguage();
  return (
    <Panel title={t('gitStatus')} icon={<Activity size={18} aria-hidden="true" />}>
      <div className="metric-grid">
        <Metric label={t('dirty')} value={status?.dirty ? t('yes') : t('no')} tone={status?.dirty ? 'warn' : 'ok'} />
        <Metric label={t('queue')} value={String(status?.queue_len ?? 0)} />
        <Metric label={t('lastError')} value={status?.last_error || t('none')} tone={status?.last_error ? 'danger' : 'muted'} />
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
