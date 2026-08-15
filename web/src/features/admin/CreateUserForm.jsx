import { UserPlus } from 'lucide-react';
import { useState } from 'react';

export function CreateUserForm({ onCreate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreate(username, password);
    setUsername('');
    setPassword('');
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        Логин
        <input required value={username} onChange={(event) => setUsername(event.target.value)} />
      </label>
      <label>
        Пароль
        <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <button type="submit" className="icon-text-button">
        <UserPlus size={18} aria-hidden="true" />
        Создать
      </button>
    </form>
  );
}
