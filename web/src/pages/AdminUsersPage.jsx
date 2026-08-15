import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createUser, disableUser, enableUser, listUsers, revokeUserSessions, setUserPassword } from '../api/admin.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { StatusMessage } from '../components/ui/StatusMessage.jsx';
import { CreateUserForm } from '../features/admin/CreateUserForm.jsx';
import { UserList } from '../features/admin/UserList.jsx';

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const payload = await listUsers();
    setUsers(payload.users || []);
  }

  async function run(action, successMessage) {
    setMessage('Выполняем...');
    try {
      await action();
      await loadUsers();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error.message === 'last_active_admin' ? 'Нельзя отключить последнего активного admin' : 'Операция не выполнена');
    }
  }

  return (
    <>
      <PageHeader title="Users" />
      <StatusMessage className="page-status">{message}</StatusMessage>
      <div className="dashboard-grid">
        <Panel title="Create user" icon={<Users size={18} aria-hidden="true" />}>
          <CreateUserForm onCreate={(username, password) => run(() => createUser(username, password), 'Пользователь создан')} />
        </Panel>
        <Panel title="Accounts">
          <UserList
            users={users}
            onDisable={(login) => run(() => disableUser(login), 'Пользователь отключён')}
            onEnable={(login) => run(() => enableUser(login), 'Пользователь включён')}
            onResetPassword={(login, password) => run(() => setUserPassword(login, password), 'Пароль изменён')}
            onRevokeSessions={(login) => run(() => revokeUserSessions(login), 'Сессии отозваны')}
          />
        </Panel>
      </div>
    </>
  );
}
