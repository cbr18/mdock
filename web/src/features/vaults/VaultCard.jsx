import { useMemo, useState } from 'react';
import { Copy, Database } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function VaultCard({ vault, onOpen }) {
  const webdavURL = useMemo(() => `${window.location.origin}/webdav/${vault.slug}/`, [vault.slug]);
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  async function copyURL() {
    await navigator.clipboard?.writeText(webdavURL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="vault-card surface-panel">
      <div className="vault-card-header">
        <Database size={20} aria-hidden="true" />
        <button type="button" className="vault-title-button" onClick={() => onOpen(vault.slug)}>
          <h3>{vault.name || vault.slug}</h3>
          <p>{vault.kind} · {vault.role}{vault.archived ? ` · ${t('archived')}` : ''}</p>
        </button>
      </div>
      <label>
        {t('webdavURL')}
        <div className="url-row">
          <input readOnly name={`webdav-url-${vault.slug}`} aria-label={t('webdavURL')} value={webdavURL} />
          <button type="button" className="icon-button" onClick={copyURL} title={t('copyWebDAV')} aria-label={t('copyWebDAV')}>
            <Copy size={18} aria-hidden="true" />
          </button>
        </div>
      </label>
      {copied ? <p role="status" className="copy-status">{t('copied')}</p> : null}
    </article>
  );
}
