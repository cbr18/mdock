import { CloudUpload } from 'lucide-react';
import { useState } from 'react';
import { Panel } from '../../components/ui/Panel.jsx';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function RemoteSettings({ remoteURL, lastPushAt, lastPushError, onSave, onPush }) {
  const [url, setURL] = useState(remoteURL || '');
  const { t } = useLanguage();

  return (
    <Panel title={t('remoteBackup')} icon={<CloudUpload size={18} aria-hidden="true" />}>
      <form className="stack-form" onSubmit={(event) => {
        event.preventDefault();
        onSave(url);
      }}>
        <label>
          {t('remoteURL')}
          <input
            name="remote-url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(event) => setURL(event.target.value)}
            placeholder="git@host:owner/repo.git…"
          />
        </label>
        <div className="button-row">
          <button type="submit">{t('save')}</button>
          <button type="button" className="secondary-button" onClick={onPush}>{t('push')}</button>
        </div>
      </form>
      <dl className="metadata-list">
        <div>
          <dt>{t('lastPush')}</dt>
          <dd>{lastPushAt || t('never')}</dd>
        </div>
        <div>
          <dt>{t('lastError')}</dt>
          <dd>{lastPushError || t('none')}</dd>
        </div>
      </dl>
    </Panel>
  );
}
