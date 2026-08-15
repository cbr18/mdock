import { useMemo, useState } from 'react';
import { Copy, Database } from 'lucide-react';

export function VaultCard({ vault, onOpen }) {
  const webdavURL = useMemo(() => `${window.location.origin}/webdav/${vault.slug}/`, [vault.slug]);
  const [copied, setCopied] = useState(false);

  async function copyURL() {
    await navigator.clipboard?.writeText(webdavURL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="vault-card">
      <div className="vault-card-header">
        <Database size={20} aria-hidden="true" />
        <button type="button" className="vault-title-button" onClick={() => onOpen(vault.slug)}>
          <h3>{vault.name || vault.slug}</h3>
          <p>{vault.kind} · {vault.role}</p>
        </button>
      </div>
      <label>
        WebDAV URL
        <div className="url-row">
          <input readOnly value={webdavURL} />
          <button type="button" className="icon-button" onClick={copyURL} title="Скопировать WebDAV URL" aria-label="Скопировать WebDAV URL">
            <Copy size={18} aria-hidden="true" />
          </button>
        </div>
      </label>
      {copied ? <p role="status" className="copy-status">Скопировано</p> : null}
    </article>
  );
}
