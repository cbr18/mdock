import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createUser, disableUser, enableUser, listUsers, revokeUserSessions, setUserPassword } from '../api/admin.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { StatusMessage } from '../components/ui/StatusMessage.jsx';
import { CreateUserForm } from '../features/admin/CreateUserForm.jsx';
import { UserList } from '../features/admin/UserList.jsx';
import { useLanguage } from '../features/i18n/LanguageProvider.jsx';

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const payload = await listUsers();
    setUsers(payload.users || []);
  }

  async function run(action, successMessage) {
    setMessage(t('loading'));
    try {
      await action();
      await loadUsers();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error.message === 'last_active_admin' ? t('lastAdminError') : t('operationFailed'));
    }
  }

  return (
    <>
      <PageHeader title={t('users')} />
      <StatusMessage className="page-status">{message}</StatusMessage>
      <div className="dashboard-grid">
        <Panel title={t('createUser')} icon={<Users size={18} aria-hidden="true" />}>
          <CreateUserForm onCreate={(username, password) => run(() => createUser(username, password), t('userCreated'))} />
        </Panel>
        <Panel title={t('accounts')}>
          <UserList
            users={users}
            onDisable={(login) => run(() => disableUser(login), t('userDisabled'))}
            onEnable={(login) => run(() => enableUser(login), t('userEnabled'))}
            onResetPassword={(login, password) => run(() => setUserPassword(login, password), t('passwordChanged'))}
            onRevokeSessions={(login) => run(() => revokeUserSessions(login), t('sessionsRevoked'))}
          />
        </Panel>
      </div>
    </>
  );
}
