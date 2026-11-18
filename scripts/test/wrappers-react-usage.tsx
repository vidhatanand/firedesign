// Type check of wrappers/react (run by wrappers-react.test.mjs with tsc --noEmit --jsx react-jsx). Not executed.
import { useRef, useState } from 'react';
import {
  FireChart, FireCode, FireIcon, FireTexture, ccAttr, ccText, ccTruthy, jsonForScript, loadFire, useFire, useFireEvent,
  type FireChartProps,
} from '../../wrappers/react/index.js';
import type { FdChart, FdIcon } from '../../fire/elements.js';

export function Usage() {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<FdChart>(null);
  const iconRef = useRef<FdIcon>(null);
  const [visible, setVisible] = useState<string[]>([]);
  useFire(ref);
  useFireEvent(ref, 'fd:select', (event) => {
    const action: string | undefined = event.detail.action;
    const row: HTMLTableRowElement | null | undefined = event.detail.row;
    if (action === 'delete' && row) event.preventDefault();
  });
  useFireEvent(ref, 'fd:copy', (event) => event.detail.value.toUpperCase());
  // @ts-expect-error not a Fire event
  useFireEvent(ref, 'fd:nope', () => {});
  // @ts-expect-error fd:copy carries { value }, not an index
  useFireEvent(ref, 'fd:copy', (event) => event.detail.index);
  void loadFire().then((fire) => fire.init(document));

  const props: FireChartProps = { type: 'area', data: { labels: ['Mon'], series: [{ name: 'Requests', values: [3] }] } };
  return (
    <div ref={ref} className="fd-stack">
      <FireIcon ref={iconRef} icon="search" size="20" className="fd-muted" aria-label="Search" />
      {/* @ts-expect-error not an icon name */}
      <FireIcon icon="serch" />
      {/* @ts-expect-error sizes are the documented steps */}
      <FireIcon icon="search" size="18" />
      {/* @ts-expect-error no style props: custom properties go in data-fd-vars */}
      <FireIcon icon="search" style={{ color: 'red' }} />
      <FireChart
        ref={chartRef}
        {...props}
        legend
        height={180}
        yFormat="compact"
        onSelect={(event) => event.detail.index}
        onHover={(event) => event.detail.index}
        onChange={(event) => {
          const d = event.detail;
          if ('visible' in d) setVisible((v) => [...v, String(d.value)]);
        }}
      />
      <FireChart type="sparkline" data={[3, 5, 4, 8]} area dot tone="success" />
      {/* @ts-expect-error not a chart type */}
      <FireChart type="pie" />
      {/* @ts-expect-error series values are numbers */}
      <FireChart data={{ series: [{ name: 'x', values: ['1'] }] }} />
      <FireCode code={'{ "ok": true }'} language="json" lines copy filename="response.json" />
      {/* @ts-expect-error code is text */}
      <FireCode code={42} />
      <FireTexture pattern="waves" tone="accent" fade="x" inline />
      {/* @ts-expect-error not a tone */}
      <FireTexture tone="loud" />
      <fd-icon icon="x" size="12" class="fd-muted" />
      <fd-chart type="donut" y-format="percent" />
      {/* @ts-expect-error not an icon name */}
      <fd-icon icon="nope" />
      <script type="application/json" dangerouslySetInnerHTML={{ __html: jsonForScript({ a: '</script>' }) }} />
      <span data-x={ccAttr(true)}>{ccText(null)}{ccTruthy([]) ? 'yes' : 'no'}{visible.length}</span>
    </div>
  );
}
