import { CloudUpload } from 'lucide-react';
import { useState } from 'react';
import { Panel } from '../../components/ui/Panel.jsx';

export function RemoteSettings({ remoteURL, lastPushAt, lastPushError, onSave, onPush }) {
  const [url, setURL] = useState(remoteURL || '');

  return (
    <Panel title="Remote backup" icon={<CloudUpload size={18} aria-hidden="true" />}>
      <form className="stack-form" onSubmit={(event) => {
        event.preventDefault();
        onSave(url);
      }}>
        <label>
          Remote URL
          <input value={url} onChange={(event) => setURL(event.target.value)} placeholder="git@host:owner/repo.git" />
        </label>
        <div className="button-row">
          <button type="submit">Сохранить</button>
          <button type="button" className="secondary-button" onClick={onPush}>Push</button>
        </div>
      </form>
      <dl className="metadata-list">
        <div>
          <dt>Last push</dt>
          <dd>{lastPushAt || 'never'}</dd>
        </div>
        <div>
          <dt>Last error</dt>
          <dd>{lastPushError || 'none'}</dd>
        </div>
      </dl>
    </Panel>
  );
}
