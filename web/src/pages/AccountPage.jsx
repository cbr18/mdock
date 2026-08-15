import { KeyRound, User } from 'lucide-react';
import { useState } from 'react';
import { changePassword } from '../api/auth.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { StatusMessage } from '../components/ui/StatusMessage.jsx';

export function AccountPage({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleChangePassword(event) {
    event.preventDefault();
    setMessage('Меняем пароль...');
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Пароль изменён, активные сессии отозваны');
    } catch {
      setMessage('Не удалось изменить пароль');
    }
  }

  return (
    <>
      <PageHeader title="Account" />
      <StatusMessage className="page-status">{message}</StatusMessage>
      <div className="dashboard-grid">
        <Panel title="Profile" icon={<User size={18} aria-hidden="true" />}>
          <dl className="metadata-list">
            <div><dt>Login</dt><dd>{user?.username}</dd></div>
            <div><dt>Admin</dt><dd>{user?.is_admin ? 'yes' : 'no'}</dd></div>
          </dl>
        </Panel>
        <Panel title="Password" icon={<KeyRound size={18} aria-hidden="true" />}>
          <form className="stack-form" onSubmit={handleChangePassword}>
            <label>
              Current password
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </label>
            <label>
              New password
              <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </label>
            <button type="submit">Сменить пароль</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
