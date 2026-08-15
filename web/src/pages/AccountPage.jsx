import { PageHeader } from '../components/layout/PageHeader.jsx';

export function AccountPage({ user }) {
  return (
    <section className="placeholder-page">
      <PageHeader title="Account" />
      <p>{user?.username}</p>
    </section>
  );
}
