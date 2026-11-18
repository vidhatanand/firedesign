export function B({ x }: { x: string }) {
  return (
    <div className={`fd-tabel ${x}`} style={{ color: 'red' }}
         data-size={`sm`}>
      <i data-icon="home" />
      <button className="fd-btn" data-variant="primary" data-icon-only><fd-icon icon="x" /></button>
      <fd-chart />
      <span className={cond ? "fd-nope" : "fd-badge"} data-tone="loud">x</span>
    </div>
  );
}
