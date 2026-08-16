import { VaultCard } from './VaultCard.jsx';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function VaultList({ vaults, onOpenVault }) {
  const { t } = useLanguage();

  return (
    <section className="vault-grid" aria-label={t('vaultList')}>
      {vaults.map((vault) => (
        <VaultCard key={vault.id} vault={vault} onOpen={onOpenVault} />
      ))}
    </section>
  );
}
