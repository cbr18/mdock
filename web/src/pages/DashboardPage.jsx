import { createVault } from '../api/vaults.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { StatusMessage } from '../components/ui/StatusMessage.jsx';
import { CreateVaultForm } from '../features/vaults/CreateVaultForm.jsx';
import { VaultList } from '../features/vaults/VaultList.jsx';

export function DashboardPage({ vaults, onReloadVaults, onOpenVault, message, setMessage }) {
  async function handleCreateVault(name) {
    setMessage('Создаём vault...');
    try {
      await createVault(name);
      await onReloadVaults();
      setMessage('');
    } catch {
      setMessage('Не удалось создать vault');
    }
  }

  return (
    <>
      <PageHeader title="Vaults" actions={<CreateVaultForm onCreate={handleCreateVault} />} />
      <StatusMessage className="page-status">{message}</StatusMessage>
      <VaultList vaults={vaults} onOpenVault={onOpenVault} />
    </>
  );
}
