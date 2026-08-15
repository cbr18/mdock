export function StatusMessage({ children, className = '' }) {
  if (!children) return null;
  return <p role="status" className={className}>{children}</p>;
}
