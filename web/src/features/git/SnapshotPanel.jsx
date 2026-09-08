import { Camera } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createSnapshot, listSnapshots } from '../../api/git.js';
import { Panel } from '../../components/ui/Panel.jsx';
import { StatusMessage } from '../../components/ui/StatusMessage.jsx';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function SnapshotPanel({ slug }) {
  const { t } = useLanguage();
  const [snapshots, setSnapshots] = useState([]);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, [slug]);

  async function load() {
    try {
      const payload = await listSnapshots(slug);
      setSnapshots(payload.snapshots || []);
    } catch {
      setSnapshots([]);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setMessage('');
    try {
      const payload = await createSnapshot(slug);
      setMessage(t('snapshotCreated').replace('{tag}', payload.tag));
      await load();
    } catch {
      setMessage(t('snapshotCreateFailed'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Panel title={t('snapshots')} icon={<Camera size={18} aria-hidden="true" />}>
      <StatusMessage>{message}</StatusMessage>
      <button type="button" className="icon-text-button" disabled={creating} onClick={handleCreate}>
        <Camera size={16} aria-hidden="true" />
        {t('createSnapshot')}
      </button>
      <div className="list-stack snapshot-list">
        {snapshots.map((tag) => (
          <article key={tag} className="list-row">
            <code>{tag}</code>
          </article>
        ))}
        {snapshots.length ? null : <p className="muted">{t('noSnapshots')}</p>}
      </div>
    </Panel>
  );
}