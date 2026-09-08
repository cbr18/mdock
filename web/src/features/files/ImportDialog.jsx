import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function ImportDialog({ conflictCount, onApply, onCancel }) {
  const { t } = useLanguage();
  const [policy, setPolicy] = useState('rename');
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className="import-dialog-overlay" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="import-dialog-title" ref={dialogRef} tabIndex={-1} className="import-dialog">
        <h2 id="import-dialog-title">{t('importConflictTitle')}</h2>
        <p className="muted">{t('importConflictMessage')}</p>
        <p className="muted">{t('importConflictCount').replace('{count}', String(conflictCount))}</p>
        <fieldset className="import-policy-fieldset">
          <legend className="sr-only">{t('import')}</legend>
          <label className="import-policy-option">
            <input type="radio" name="import-policy" checked={policy === 'rename'} onChange={() => setPolicy('rename')} />
            <span>{t('importRename')}</span>
          </label>
          <label className="import-policy-option">
            <input type="radio" name="import-policy" checked={policy === 'overwrite'} onChange={() => setPolicy('overwrite')} />
            <span>{t('importOverwrite')}</span>
          </label>
          <label className="import-policy-option">
            <input type="radio" name="import-policy" checked={policy === 'skip'} onChange={() => setPolicy('skip')} />
            <span>{t('importSkip')}</span>
          </label>
        </fieldset>
        <div className="import-dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>{t('cancel')}</button>
          <button type="button" className="primary-button" onClick={() => onApply(policy)}>{t('import')}</button>
        </div>
      </div>
    </div>
  );
}