export function Panel({ title, icon, actions, children, className = '' }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || actions) ? (
        <div className="panel-header">
          <div className="panel-title">
            {icon}
            {title ? <h3>{title}</h3> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
