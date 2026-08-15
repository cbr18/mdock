import { Plus } from 'lucide-react';
import { useState } from 'react';

export function CreateVaultForm({ onCreate }) {
  const [vaultName, setVaultName] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreate(vaultName);
    setVaultName('');
  }

  return (
    <form className="create-vault" onSubmit={handleSubmit}>
      <label>
        Новый vault
        <input
          required
          value={vaultName}
          onChange={(event) => setVaultName(event.target.value)}
        />
      </label>
      <button type="submit" className="icon-text-button">
        <Plus size={18} aria-hidden="true" />
        Создать
      </button>
    </form>
  );
}
