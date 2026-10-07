export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="cms-loading">
      <span className="cms-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
