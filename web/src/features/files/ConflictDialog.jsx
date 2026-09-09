import { AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function ConflictDialog({ onReload, onContinueWithDraft }) {
  const { t } = useLanguage();
  return (
    <div className="conflict-dialog-overlay" role="alertdialog" aria-labelledby="conflict-title" aria-describedby="conflict-message">
      <div className="conflict-dialog">
        <div className="conflict-icon">
          <AlertCircle size={32} aria-hidden="true" />
        </div>
        <h2 id="conflict-title" className="conflict-title">{t('editorConflictTitle')}</h2>
        <p id="conflict-message" className="conflict-message">{t('editorConflictMessage')}</p>
        <div className="conflict-actions">
          <button
            type="button"
            className="conflict-button secondary"
            onClick={onReload}
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span>{t('editorReloadFromServer')}</span>
          </button>
          <button
            type="button"
            className="conflict-button primary"
            onClick={onContinueWithDraft}
          >
            <FileText size={16} aria-hidden="true" />
            <span>{t('editorContinueWithDraft')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function IdleWarningDialog({ onContinue, onClose }) {
  const { t } = useLanguage();
  return (
    <div className="idle-warning-overlay" role="alertdialog" aria-labelledby="idle-title" aria-describedby="idle-message">
      <div className="idle-warning-dialog">
        <div className="conflict-icon">
          <AlertCircle size={32} aria-hidden="true" />
        </div>
        <h2 id="idle-title" className="conflict-title">{t('editorIdleWarning')}</h2>
        <div className="conflict-actions">
          <button type="button" className="conflict-button primary" onClick={onContinue}>
            {t('editorIdleContinue')}
          </button>
          <button type="button" className="conflict-button secondary" onClick={onClose}>
            {t('editorIdleClose')}
          </button>
        </div>
      </div>
    </div>
  );
}