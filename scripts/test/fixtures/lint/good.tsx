import { useState } from 'react';
const a: Array<string> = []; const lt = a.length < 3 && a.length > 1;
export function A({ x, items }: { x: string; items: string[] }) {
  const [n, setN] = useState<number>(0);
  return (
    <div className={`fd-table ${x}`} data-density="compact">
      <button className="fd-btn" data-icon-only aria-label="Close"><fd-icon icon="x" /></button>
      <button className={clsx('fd-btn', x && 'fd-btn-group')} data-variant={x}>{"don't"} save</button>
      {items.map((i) => <span key={i} className="fd-badge" data-tone="info">{i}</span>)}
      <button className="fd-btn" data-icon-only>{n}</button>
      {/* <i data-icon="x" /> */}
    </div>
  );
}
