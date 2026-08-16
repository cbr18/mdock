import { KeyRound, User } from 'lucide-react';
import { useState } from 'react';
import { changePassword } from '../api/auth.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { StatusMessage } from '../components/ui/StatusMessage.jsx';
import { useLanguage } from '../features/i18n/LanguageProvider.jsx';

export function AccountPage({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const { t } = useLanguage();

  async function handleChangePassword(event) {
    event.preventDefault();
    setMessage(t('passwordChanging'));
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setMessage(t('passwordChanged'));
    } catch {
      setMessage(t('failedPassword'));
    }
  }

  return (
    <>
      <PageHeader title={t('account')} />
      <StatusMessage className="page-status">{message}</StatusMessage>
      <div className="dashboard-grid">
        <Panel title={t('profile')} icon={<User size={18} aria-hidden="true" />}>
          <dl className="metadata-list">
            <div><dt>{t('login')}</dt><dd>{user?.username}</dd></div>
            <div><dt>{t('admin')}</dt><dd>{user?.is_admin ? t('yes') : t('no')}</dd></div>
          </dl>
        </Panel>
        <Panel title={t('password')} icon={<KeyRound size={18} aria-hidden="true" />}>
          <form className="stack-form" onSubmit={handleChangePassword}>
            <label>
              {t('currentPassword')}
              <input type="password" name="current-password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </label>
            <label>
              {t('newPassword')}
              <input type="password" name="new-password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            <button type="submit">{t('changePassword')}</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
