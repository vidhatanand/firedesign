import { html, nothing } from 'lit';

/** One request, read from a table row (the rows are Fire markup; see screen.ts for why they stay in the DOM). */
export interface LogRow {
  id: string;
  key: string;
  status: string;
  code: number;
  endpoint: string;
  target: string;
  credits: string;
  duration: string;
  when: string;
  at: Date;
  tone: string;
  live: boolean;
  label: string;
}

const STATUS: Record<string, { tone: string; label: string; live?: boolean }> = {
  success: { tone: 'success', label: 'Success' },
  failed: { tone: 'danger', label: 'Failed' },
  running: { tone: 'info', label: 'Running', live: true },
  queued: { tone: 'neutral', label: 'Queued' },
  cached: { tone: 'violet', label: 'Cached' },
};
const HTTP: Record<number, string> = { 200: 'OK', 202: 'Accepted', 403: 'Forbidden', 429: 'Too Many Requests', 502: 'Bad Gateway' };

export function logOf(tr: HTMLTableRowElement): LogRow {
  const cells = tr.children as HTMLCollectionOf<HTMLElement>;
  const status = tr.dataset.status ?? 'success';
  const { tone, label, live } = STATUS[status] ?? STATUS.success;
  return {
    id: tr.dataset.value ?? '',
    key: tr.dataset.key ?? '',
    status,
    code: Number(tr.dataset.code),
    endpoint: cells[2].textContent?.trim() ?? '',
    target: cells[3].textContent?.trim() ?? '',
    credits: cells[5].textContent?.trim() ?? '',
    duration: cells[6].textContent?.trim() ?? '',
    when: (cells[1].textContent ?? '').trim().replace(/^(\w+ \d+),/, '$1, 2026'),
    at: new Date(cells[1].dataset.sortValue ?? ''),
    tone,
    live: Boolean(live),
    label,
  };
}

/** The Overview tab: a key-value list. Fire's copy buttons are added to the `data-copy` values by `init`. */
export const overview = (l: LogRow) => html`
  <dl class="fd-kv" data-cols="2">
    <div class="fd-kv-item"><dt class="fd-kv-key">Request ID</dt><dd class="fd-kv-value" data-copy>${l.id}</dd></div>
    <div class="fd-kv-item"><dt class="fd-kv-key">Endpoint</dt><dd class="fd-kv-value" data-mono>${l.endpoint}</dd></div>
    <div class="fd-kv-item"><dt class="fd-kv-key">Status</dt><dd class="fd-kv-value"><span class="fd-status" data-size="sm" data-tone=${l.tone} ?data-live=${l.live}>${l.label}</span></dd></div>
    <div class="fd-kv-item"><dt class="fd-kv-key">HTTP</dt><dd class="fd-kv-value fd-num">${l.code} ${HTTP[l.code]}</dd></div>
    <div class="fd-kv-item"><dt class="fd-kv-key">Target</dt><dd class="fd-kv-value" data-copy=${l.target}>${l.target}</dd></div>
    <div class="fd-kv-item"><dt class="fd-kv-key">Started</dt><dd class="fd-kv-value">${l.when}</dd></div>
    <div class="fd-kv-item"><dt class="fd-kv-key">Duration</dt><dd class="fd-kv-value fd-num">${l.duration}</dd></div>
    <div class="fd-kv-item"><dt class="fd-kv-key">Credits</dt><dd class="fd-kv-value fd-num">${l.credits}</dd></div>
    <div class="fd-kv-item"><dt class="fd-kv-key">API key</dt><dd class="fd-kv-value">${l.key}</dd></div>
  </dl>
`;

const phase = (title: string, text: string, tone?: string) => html`
  <li class="fd-timeline-item" data-tone=${tone ?? nothing}>
    <span class="fd-timeline-node"></span>
    <div class="fd-timeline-main">
      <div class="fd-timeline-head"><span class="fd-timeline-title">${title}</span></div>
      <p class="fd-timeline-body">${text}</p>
    </div>
  </li>`;

/** The Timeline tab, newest first. A real app would list the phases it recorded. */
export const timeline = (l: LogRow) => html`
  ${l.status === 'failed' ? phase('Request failed', `${l.code} ${HTTP[l.code]}`, 'danger') : phase('Responded', `${l.code} ${HTTP[l.code]} · ${l.credits} credits`, 'success')}
  ${phase('Fetching page', l.target)}
  ${phase('Request received', `${l.key} · ${l.endpoint}`)}
`;

/** What the Request and Response tabs show (sample data). */
export const requestBody = (l: LogRow) => ({ url: l.target, formats: ['markdown', 'links'], onlyMainContent: true });
export const responseBody = (l: LogRow) => (l.status === 'failed'
  ? { success: false, error: { status: l.code, message: HTTP[l.code] } }
  : { success: true, id: l.id, creditsUsed: Number(l.credits) || 0, data: { url: l.target, statusCode: 200 } });
