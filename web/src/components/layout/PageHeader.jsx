export function PageHeader({ title, actions }) {
  return (
    <section className="page-header">
      <h2>{title}</h2>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </section>
  );
}
