import { useState } from 'react';
import { createVault } from '../api/vaults.js';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { StatusMessage } from '../components/ui/StatusMessage.jsx';
import { useLanguage } from '../features/i18n/LanguageProvider.jsx';
import { CreateVaultForm } from '../features/vaults/CreateVaultForm.jsx';
import { VaultList } from '../features/vaults/VaultList.jsx';

export function DashboardPage({ vaults, archivedVaults, onReloadVaults, onOpenVault, message, setMessage }) {
  const [mode, setMode] = useState('active');
  const { t } = useLanguage();

  async function handleCreateVault(name) {
    setMessage(t('creatingVault'));
    try {
      await createVault(name);
      await onReloadVaults();
      setMessage('');
    } catch {
      setMessage(t('failedCreateVault'));
    }
  }

  const visibleVaults = mode === 'archive' ? archivedVaults : vaults;

  return (
    <>
      <PageHeader title={t('vaults')} actions={<CreateVaultForm onCreate={handleCreateVault} />} />
      <StatusMessage className="page-status">{message}</StatusMessage>
      <div className="page-tabs" role="tablist" aria-label={t('vaults')}>
        <button type="button" role="tab" aria-selected={mode === 'active'} className={mode === 'active' ? 'active' : ''} onClick={() => setMode('active')}>{t('active')}</button>
        <button type="button" role="tab" aria-selected={mode === 'archive'} className={mode === 'archive' ? 'active' : ''} onClick={() => setMode('archive')}>{t('archive')}</button>
      </div>
      <VaultList vaults={visibleVaults} onOpenVault={onOpenVault} />
    </>
  );
}
