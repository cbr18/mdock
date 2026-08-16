import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function CreateVaultForm({ onCreate }) {
  const [vaultName, setVaultName] = useState('');
  const { t } = useLanguage();

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreate(vaultName);
    setVaultName('');
  }

  return (
    <form className="create-vault" onSubmit={handleSubmit}>
      <label>
        {t('newVault')}
        <input
          required
          name="vault-name"
          autoComplete="off"
          value={vaultName}
          onChange={(event) => setVaultName(event.target.value)}
        />
      </label>
      <button type="submit" className="icon-text-button">
        <Plus size={18} aria-hidden="true" />
        {t('create')}
      </button>
    </form>
  );
}
