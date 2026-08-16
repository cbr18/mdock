import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function CreateUserForm({ onCreate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useLanguage();

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreate(username, password);
    setUsername('');
    setPassword('');
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <label>
        {t('login')}
        <input required name="username" autoComplete="username" spellCheck={false} value={username} onChange={(event) => setUsername(event.target.value)} />
      </label>
      <label>
        {t('password')}
        <input required name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <button type="submit" className="icon-text-button">
        <UserPlus size={18} aria-hidden="true" />
        {t('create')}
      </button>
    </form>
  );
}
