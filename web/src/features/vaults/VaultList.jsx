import { VaultCard } from './VaultCard.jsx';

export function VaultList({ vaults, onOpenVault }) {
  return (
    <section className="vault-grid" aria-label="Vaults">
      {vaults.map((vault) => (
        <VaultCard key={vault.id} vault={vault} onOpen={onOpenVault} />
      ))}
    </section>
  );
}
