// The Activity logs screen's behaviour: the page script of templates/logs.html, ported to TypeScript. The fd:select
// and fd:change handlers are not added here: the screen's component binds them with useFireEvent (onSelect, onChange).
import type { FireEventMap } from 'fire-design';
import { $, $$, $maybe, esc, type Kit } from '../screen-kit';

type State = 'loaded' | 'loading' | 'empty' | 'error';
interface Range { preset: string; start?: string; end?: string }
interface Log {
  id: string; key: string; status: string; code: number; at: Date; when: string; endpoint: string; target: string;
  credits: string; seconds: number; duration: string;
}

export interface LogsBehaviour {
  onSelect(event: FireEventMap['fd:select']): void;
  onChange(event: FireEventMap['fd:change']): void;
}

export function startLogs({ fire, on, later }: Kit): LogsBehaviour {
  const { init, overlays, data, nav, code, copyText } = fire;
  const { toast, openDialog, closeDialog } = overlays;
  const { renderJSON } = code;

  const table = $<HTMLTableElement>('#logs-table');
  const body = $('#logs-body');
  const skeleton = $('#logs-skeleton');
  const stateBody = $('#logs-state');
  const rows = $$<HTMLTableRowElement>('tr', body);
  const applied = $('#logs-applied');
  const searchInput = $<HTMLInputElement>('#logs-search');
  const info = $('#logs-info');
  const prev = $<HTMLButtonElement>('#logs-prev');
  const next = $<HTMLButtonElement>('#logs-next');
  const switcher = $('#logs-state-switch');

  const NOW = new Date('2026-11-14T16:35:00'); // the demo data is fixed to this moment
  const filters: { endpoint: string[]; key: string[]; status: string[]; range: Range } = { endpoint: [], key: [], status: [], range: { preset: '7d' } };
  let state: State = 'loading';
  let page = 1;
  let query = '';

  /* ---------- Table states: loaded, loading, empty, error ---------- */
  const emptyRow = (filtered: boolean) => `<tr class="fd-table-state"><td colspan="8"><div class="fd-table-empty">
      <div class="fd-ascii" data-fd-ascii="waves" data-fade="x" aria-hidden="true"></div>
      <span class="fd-table-empty-icon"><i data-icon="clock"></i></span>
      <p class="fd-table-empty-title">No activity logs found</p>
      <p class="fd-table-empty-text">${filtered ? 'Nothing matches these filters. Try a wider date range or clear them.' : 'Requests to the Ember API appear here a few seconds after they finish.'}</p>
      ${filtered ? '<button class="fd-btn" type="button" data-action="clear-filters"><span>Clear filters</span></button>' : '<a class="fd-btn" href="playground.html?endpoint=scrape"><i data-icon="play"></i><span>Send a test request</span></a>'}
    </div></td></tr>`;
  const errorRow = () => `<tr class="fd-table-state" data-state="error"><td colspan="8"><div class="fd-table-empty" data-tone="danger" role="alert">
      <span class="fd-table-empty-icon"><i data-icon="triangle-alert"></i></span>
      <p class="fd-table-empty-title">Couldn’t load activity logs</p>
      <p class="fd-table-empty-text">The request timed out after 10 seconds. Check your connection, then try again.</p>
      <button class="fd-btn" type="button" data-action="reload"><i data-icon="refresh-cw"></i><span>Retry</span></button>
    </div></td></tr>`;

  const isFiltered = () => Boolean(query.trim() || filters.endpoint.length || filters.key.length || filters.status.length || filters.range.preset !== '7d');

  function setState(nextState: State) {
    state = nextState;
    data.clearSelection(table);
    table.setAttribute('aria-busy', String(state === 'loading'));
    body.hidden = state !== 'loaded';
    skeleton.hidden = state !== 'loading';
    stateBody.hidden = state === 'loaded' || state === 'loading';
    // Markup inserted by hand (L4): Fire draws its icons and textures in init.
    if (state === 'empty') stateBody.innerHTML = emptyRow(false);
    if (state === 'error') stateBody.innerHTML = errorRow();
    if (state === 'loaded') apply(); else init(stateBody);
    nav.selectSegment($(`.fd-segmented-item[data-value="${state}"]`, switcher), { silent: true });
    syncFoot();
  }

  function syncFoot(shown = rows.filter((tr) => !tr.hidden).length) {
    const filtered = isFiltered();
    if (state === 'loading') info.textContent = 'Loading requests';
    else if (state === 'error') info.textContent = 'Results unavailable';
    else if (state === 'empty') info.innerHTML = 'Page <b>1</b> of 1 · 0 results';
    else if (filtered) info.innerHTML = `Page <b>1</b> of 1 · ${shown.toLocaleString('en-US')} results`;
    else info.innerHTML = `Page <b>${page}</b> of 12 · 1,204 results`;
    const paged = state === 'loaded' && !filtered;
    prev.disabled = !paged || page === 1;
    next.disabled = !paged || page === 12;
  }

  /* ---------- Search and filters ---------- */
  const sortValue = (tr: HTMLTableRowElement) => $('[data-sort-value]', tr).dataset.sortValue ?? '';
  function inRange(tr: HTMLTableRowElement) {
    const at = new Date(sortValue(tr));
    const { preset, start = '', end = '' } = filters.range;
    if (preset === '24h') return at >= new Date(NOW.getTime() - 864e5);
    if (preset === '7d') return at >= new Date(NOW.getTime() - 7 * 864e5);
    if (preset === 'month') return at.getMonth() === NOW.getMonth();
    if (preset === 'custom') { const day = sortValue(tr).slice(0, 10); return day >= start && day <= end; }
    return true;
  }

  function matches(tr: HTMLTableRowElement, q: string) {
    if (tr.dataset.deleted) return false;
    if (filters.endpoint.length && !filters.endpoint.includes(tr.children[2].textContent?.trim() ?? '')) return false;
    if (filters.key.length && !filters.key.includes(tr.dataset.key ?? '')) return false;
    if (filters.status.length && !filters.status.includes(tr.dataset.status ?? '')) return false;
    if (!inRange(tr)) return false;
    return !q || (tr.textContent ?? '').toLowerCase().includes(q) || (tr.dataset.key ?? '').toLowerCase().includes(q);
  }

  function apply() {
    const q = query.trim().toLowerCase();
    let shown = 0;
    for (const tr of rows) { tr.hidden = !matches(tr, q); if (!tr.hidden) shown += 1; }
    if (state === 'loaded') {
      stateBody.hidden = shown > 0;
      if (!shown) { stateBody.innerHTML = emptyRow(true); init(stateBody); }
    }
    syncFoot(shown);
  }

  function renderTokens() {
    const tokens = (['endpoint', 'key', 'status'] as const).flatMap((key) => filters[key].map((value) => [key, value]));
    applied.hidden = tokens.length === 0;
    applied.innerHTML = tokens.map(([key, value]) =>
      `<span class="fd-filter-token"><span class="fd-filter-token-key">${key}</span><span class="fd-filter-token-value">${esc(value)}</span><button class="fd-filter-token-remove" type="button" aria-label="Remove ${key}: ${esc(value)}"><i data-icon="x" data-size="12"></i></button></span>`).join('')
      + '<button class="fd-btn-text" type="button" data-filter-clear-all>Clear all</button>';
    init(applied);
  }

  on(searchInput, 'input', () => { query = searchInput.value; apply(); });

  function onChange(event: FireEventMap['fd:change']) {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    const detail = event.detail as unknown as { value: unknown; source?: string };
    const list = el.closest<HTMLElement>('[data-fd-filter-list]');
    if (list && el === list) {
      filters[list.dataset.filter as 'endpoint' | 'key' | 'status'] = detail.value as string[];
      renderTokens();
      apply();
      return;
    }
    if (el.matches('[data-fd-daterange]')) { filters.range = detail.value as Range; apply(); return; }
    if (el === applied && detail.source === 'filters') {
      // A token was removed (or Clear all): untick the matching rows in each popover.
      const left = new Set((detail.value as Array<{ key: string; value: string }>).map((t) => `${t.key}:${t.value}`));
      for (const key of ['endpoint', 'key', 'status'] as const) {
        for (const value of [...filters[key]]) {
          if (!left.has(`${key}:${value}`)) $maybe(`#pop-${key} .fd-checklist-item[data-value="${CSS.escape(value)}"]`)?.click();
        }
      }
      return;
    }
    if (el === switcher && detail.value !== state) setState(detail.value as State);
  }

  /* ---------- Paging (the sample data covers page 1; the swap shows the loading state) ---------- */
  function goToPage(n: number) {
    page = n;
    setState('loading');
    later(() => setState('loaded'), 450);
  }
  on(prev, 'click', () => goToPage(Math.max(1, page - 1)));
  on(next, 'click', () => goToPage(Math.min(12, page + 1)));

  /* ---------- Log detail sheet ---------- */
  const STATUS: Record<string, { tone: string; label: string; live?: boolean }> = {
    success: { tone: 'success', label: 'Success' },
    failed: { tone: 'danger', label: 'Failed' },
    running: { tone: 'info', label: 'Running', live: true },
    queued: { tone: 'neutral', label: 'Queued' },
    cached: { tone: 'violet', label: 'Cached' },
  };
  const HTTP: Record<number, string> = { 200: 'OK', 202: 'Accepted', 403: 'Forbidden', 429: 'Too Many Requests', 502: 'Bad Gateway' };
  const CLIENT: Record<string, string> = { 'Production crawler': 'ember-node 2.6.0', Default: 'Playground', CI: 'ember-py 2.4.1' };
  const ERRORS: Record<number, [string, string]> = {
    502: ['UPSTREAM_ERROR', 'The target server returned 502 Bad Gateway after 3 attempts.'],
    403: ['ROBOTS_DISALLOWED', 'The site’s robots.txt disallows crawling this path. Choose another path or set ignoreRobotsTxt for your own domains.'],
    429: ['TARGET_RATE_LIMITED', 'The target returned 429 Too Many Requests. Ember retries rate-limited pages for 60 seconds before it gives up.'],
  };

  function logOf(tr: HTMLTableRowElement): Log {
    const cells = tr.children as HTMLCollectionOf<HTMLElement>;
    return {
      id: tr.dataset.value ?? '',
      key: tr.dataset.key ?? '',
      status: tr.dataset.status ?? '',
      code: Number(tr.dataset.code),
      at: new Date(cells[1].dataset.sortValue ?? ''),
      when: `${(cells[1].textContent ?? '').trim().replace(/^(\w+ \d+),/, '$1, 2026')}`,
      endpoint: (cells[2].textContent ?? '').trim(),
      target: (cells[3].textContent ?? '').trim(),
      credits: (cells[5].textContent ?? '').trim(),
      seconds: Number(cells[6].dataset.sortValue) || 0,
      duration: (cells[6].textContent ?? '').trim(),
    };
  }

  function requestBody(l: Log) {
    const t = l.target;
    switch (l.endpoint) {
      case '/crawl': return { url: t, limit: 120, maxDiscoveryDepth: 3, scrapeOptions: { formats: ['markdown'] } };
      case '/search': return { query: t, limit: 5, sources: ['web'] };
      case '/extract': return { urls: [t], prompt: 'Extract the product name, price and availability.' };
      case '/agent': return { prompt: t, maxCredits: 200 };
      case '/map': return { url: t, limit: 500 };
      case '/parse': return { file: t, formats: ['markdown'] };
      default: return { url: t, formats: ['markdown', 'links'], onlyMainContent: true, timeout: 30000 };
    }
  }

  function responseBody(l: Log) {
    if (l.status === 'failed') { const [errorCode, message] = ERRORS[l.code]; return { success: false, error: { code: errorCode, message, status: l.code }, creditsUsed: Number(l.credits) || 0 }; }
    if (l.status === 'running') return { success: true, id: l.id, status: 'scraping', completed: 31, total: 120, creditsUsed: Number(l.credits) };
    if (l.status === 'queued') return { success: true, id: l.id, status: 'queued', position: 3, estimatedStart: '~40 s' };
    const base = { success: true, id: l.id, cached: l.status === 'cached', creditsUsed: Number(l.credits) || 0 };
    if (l.endpoint === '/search') return { ...base, data: { web: [{ title: 'Vector databases compared', url: 'https://example.org/vector-dbs', position: 1 }, { title: 'Choosing a vector store for agents', url: 'https://example.net/agents/vector-store', position: 2 }] } };
    if (l.endpoint === '/extract') return { ...base, data: { name: 'Trail Runner 2', price: 129, currency: 'USD', inStock: true } };
    if (l.endpoint === '/map') return { ...base, links: 412, data: ['https://northwind.io/', 'https://northwind.io/plans', 'https://northwind.io/docs'] };
    return { ...base, data: { url: l.target, title: 'Page title', statusCode: 200, markdown: '# Page title\n\nClean markdown of the page…', links: 42 } };
  }

  const clock = (l: Log, offsetSeconds: number) => new Date(l.at.getTime() + 12000 + offsetSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const phase = (title: string, time: string, text: string, tone?: string, extra = '') => `<li class="fd-timeline-item"${tone ? ` data-tone="${tone}"` : ''}${extra}><span class="fd-timeline-node"></span><div class="fd-timeline-main"><div class="fd-timeline-head"><span class="fd-timeline-title">${title}</span><time class="fd-timeline-time">${time}</time></div>${text ? `<p class="fd-timeline-body">${text}</p>` : ''}</div></li>`;

  function timeline(l: Log) {
    const d = l.seconds || 1;
    const received = phase('Request received', clock(l, 0), `${esc(l.key)} · ${l.endpoint}`);
    const queued = phase('Queued', clock(l, 0.012), 'Waited 12 ms for a worker in eu-west-1.');
    if (l.status === 'queued') return phase('Waiting for a worker', 'now', 'Position 3 in the queue · starts in about 40 s.', 'info', ' data-live') + queued + received;
    if (l.status === 'cached') return phase('Responded', clock(l, d), 'Served from cache · 0 credits.', 'success') + phase('Cache hit', clock(l, 0.01), 'Fresh copy from 12 min ago.', 'info') + received;
    if (l.status === 'running') return phase('Fetching pages', 'now', '31 of about 120 pages · 48 credits so far.', 'info', ' data-live') + phase('Crawl started', clock(l, 0.4), 'Following links to depth 3.') + queued + received;
    if (l.status === 'failed') {
      return phase('Request failed', clock(l, d), `${l.code} ${HTTP[l.code]} · ${esc(ERRORS[l.code][0])}`, 'danger').replace('<span class="fd-timeline-node"></span>', '<span class="fd-timeline-node"><i data-icon="x"></i></span>')
        + phase('Retried 2 times', clock(l, d * 0.7), 'Different proxy each attempt.', 'warning')
        + phase('Fetching page', clock(l, 0.1), esc(l.target)) + queued + received;
    }
    return phase('Responded', clock(l, d), `${l.code} ${HTTP[l.code]} · ${l.credits} credit${l.credits === '1' ? '' : 's'} charged`, 'success')
      + phase('Extracted', clock(l, d * 0.85), 'Markdown and links.')
      + phase('Rendered page', clock(l, d * 0.6), 'Waited for network idle.')
      + phase('Fetching page', clock(l, 0.1), esc(l.target)) + queued + received;
  }

  /* A crawl's stages, as a small pipeline in the overview. */
  const JOB: Record<string, [string, string, string]> = {
    passed: ['success', 'circle-check', 'Passed'], failed: ['danger', 'circle-x', 'Failed'], running: ['info', 'loader-circle', 'Running'],
    queued: ['neutral', 'circle-dashed', 'Queued'], skipped: ['neutral', 'circle-minus', 'Skipped'],
  };
  function crawlStages(l: Log) {
    const blocked = l.status === 'failed' && l.code === 403;
    const failed = l.status === 'failed';
    const done = l.status === 'success' || l.status === 'cached';
    const after = done ? 'passed' : failed ? 'skipped' : 'queued';
    const fetch = l.status === 'running' ? ['passed', 'running'] : failed && !blocked ? ['passed', 'failed'] : [after, after];
    const stages: Array<[string, string | null, Array<[string, string]>]> = [
      ['Discover', null, [['Read robots.txt', blocked ? 'failed' : l.status === 'queued' ? 'queued' : 'passed'], ['Read sitemap', blocked ? 'skipped' : l.status === 'queued' ? 'queued' : 'passed']]],
      ['Fetch', null, [['Worker 1', blocked ? 'skipped' : fetch[0]], ['Worker 2', blocked ? 'skipped' : fetch[1]]]],
      ['Extract', null, [['Markdown', after]]],
      ['Deliver', null, [['Webhook', after]]],
      ['On failure', 'failure', [['Notify', failed ? 'passed' : done ? 'skipped' : 'queued']]],
    ];
    const job = ([name, jobState]: [string, string]) => {
      const [tone, glyph, word] = JOB[jobState];
      return `<li><span class="fd-pipeline-job" data-tone="${tone}"${jobState === 'running' ? ' data-live' : ''}${jobState === 'skipped' ? ' data-state="skipped"' : ''}><i data-icon="${glyph}"></i><span class="fd-pipeline-job-name">${name}</span><span class="fd-sr-only">${word}</span></span></li>`;
    };
    return `<div class="fd-stack" data-gap="2"><p class="fd-label">Stages</p>
      <div class="fd-pipeline" data-size="sm" role="group" aria-label="Crawl stages"><ol class="fd-pipeline-stages">${stages.map(([label, when, jobs]) =>
        `<li class="fd-pipeline-stage"${when ? ` data-when="${when}"` : ''}><p class="fd-pipeline-stage-label">${label}</p><ul class="fd-pipeline-jobs">${jobs.map(job).join('')}</ul></li>`).join('')}</ol></div></div>`;
  }

  let current: Log | null = null;
  function openLog(tr: HTMLTableRowElement) {
    const l = (current = logOf(tr));
    const s = STATUS[l.status];
    const pill = $('#lg-status');
    pill.dataset.tone = s.tone;
    pill.toggleAttribute('data-live', Boolean(s.live));
    pill.textContent = String(l.code);
    $('#lg-id').textContent = l.id;
    $('#lg-desc').innerHTML = `<span class="fd-mono">POST ${l.endpoint}</span> · ${esc(l.when)} · ${esc(l.duration)}`;
    $<HTMLAnchorElement>('#lg-playground').href = `playground.html?endpoint=${l.endpoint.slice(1)}`;
    $('#lg-overview').innerHTML = `<dl class="fd-kv" data-cols="2">
        <div class="fd-kv-item"><dt class="fd-kv-key">Request ID</dt><dd class="fd-kv-value" data-copy>${l.id}</dd></div>
        <div class="fd-kv-item"><dt class="fd-kv-key">Endpoint</dt><dd class="fd-kv-value" data-mono>${l.endpoint}</dd></div>
        <div class="fd-kv-item"><dt class="fd-kv-key">Status</dt><dd class="fd-kv-value"><span class="fd-status" data-size="sm" data-tone="${s.tone}"${s.live ? ' data-live' : ''}>${s.label}</span></dd></div>
        <div class="fd-kv-item"><dt class="fd-kv-key">HTTP</dt><dd class="fd-kv-value fd-num">${l.code} ${HTTP[l.code]}</dd></div>
        <div class="fd-kv-item"><dt class="fd-kv-key">Target</dt><dd class="fd-kv-value" data-copy="${esc(l.target)}">${esc(l.target)}</dd></div>
        <div class="fd-kv-item"><dt class="fd-kv-key">Started</dt><dd class="fd-kv-value">${esc(l.when)}</dd></div>
        <div class="fd-kv-item"><dt class="fd-kv-key">Duration</dt><dd class="fd-kv-value fd-num">${esc(l.duration)}</dd></div>
        <div class="fd-kv-item"><dt class="fd-kv-key">Credits</dt><dd class="fd-kv-value fd-num">${l.credits}</dd></div>
        <div class="fd-kv-item"><dt class="fd-kv-key">API key</dt><dd class="fd-kv-value">${esc(l.key)}</dd></div>
        <div class="fd-kv-item"><dt class="fd-kv-key">Client</dt><dd class="fd-kv-value" data-mono>${CLIENT[l.key]}</dd></div>
      </dl>
      ${l.status === 'failed' ? `<div class="fd-callout" data-tone="danger" role="alert"><i class="fd-callout-icon" data-icon="circle-alert"></i><div class="fd-callout-content"><p class="fd-callout-title">${ERRORS[l.code][0]}</p><p class="fd-callout-body">${esc(ERRORS[l.code][1])}</p></div></div>` : ''}
      ${l.endpoint === '/crawl' ? crawlStages(l) : ''}`;
    renderJSON($('#lg-request-json'), requestBody(l), { depth: 3 });
    renderJSON($('#lg-response-json'), responseBody(l), { depth: 3 });
    $('#lg-timeline-list').innerHTML = timeline(l);
    init($('#sheet-log'));
    openDialog('sheet-log', { trigger: tr });
  }

  const retry = (ids: string[]) => toast.promise(new Promise((resolve) => setTimeout(resolve, 1400)), {
    loading: ids.length > 1 ? `Re-queuing ${ids.length} requests` : `Re-queuing ${ids[0]}`,
    success: { title: ids.length > 1 ? `${ids.length} requests re-queued` : 'Request re-queued', description: 'New runs appear at the top of the log.' },
    error: 'Could not retry',
  });

  on($('#lg-copy'), 'click', () => { if (current) copyText(current.id).then(() => toast.success('Request ID copied')); });
  on($('#lg-retry'), 'click', () => { if (current) retry([current.id]); closeDialog('sheet-log'); });

  /* ---------- Row, bulk and menu actions ---------- */
  function remove(ids: string[]) {
    data.clearSelection(table);
    const gone = rows.filter((tr) => ids.includes(tr.dataset.value ?? ''));
    gone.forEach((tr) => { tr.dataset.deleted = '1'; });
    apply();
    toast({
      title: gone.length > 1 ? `${gone.length} logs deleted` : 'Log deleted',
      tone: 'neutral',
      action: { label: 'Undo', onClick: () => { gone.forEach((tr) => delete tr.dataset.deleted); apply(); } },
    });
  }

  function onSelect(event: FireEventMap['fd:select']) {
    const { action, value, row, item, trigger } = event.detail || {};
    const values = Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];   // a log line sends its number; rows send strings
    if (action === 'open' && row?.closest('#logs-table')) { event.preventDefault(); openLog(row); return; }
    if (action === 'clear-filters') { clearFilters(); return; }
    if (action === 'reload') { setState('loading'); later(() => setState('loaded'), 900); return; }
    if (action === 'retry') { retry(values); return; }
    if (action === 'export') { toast.success(`Exported ${values.length} request${values.length === 1 ? '' : 's'}`, { description: 'activity-logs-selection.csv' }); return; }
    if (action === 'delete') { remove(values); return; }
    if (item?.closest('#menu-log-row')) {
      const tr = trigger?.closest('tr');
      if (!tr) return;
      const id = tr.dataset.value ?? '';
      const choice = item.dataset.value;
      if (choice === 'open') requestAnimationFrame(() => openLog(tr));
      if (choice === 'copy') copyText(id).then(() => toast.success('Request ID copied', { description: id }));
      if (choice === 'retry') retry([id]);
      if (choice === 'delete') remove([id]);
    }
  }

  function clearFilters() {
    searchInput.value = '';
    query = '';
    for (const key of ['endpoint', 'key', 'status']) $maybe(`#pop-${key} [data-fd-filter-clear]`)?.click();
    if (filters.range.preset !== '7d') {
      $('#pop-range [data-preset="7d"]').click();
      $('#pop-range [data-fd-daterange-apply]').click();
    }
    apply();
  }

  /* ---------- Export ---------- */
  on($('#logs-export'), 'click', () => {
    const count = rows.filter((tr) => !tr.hidden).length;
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2200)), {
      loading: { title: 'Preparing export', description: `${isFiltered() ? count : '1,204'} requests` },
      success: { title: 'activity-logs.csv is ready', description: `${isFiltered() ? count : '1,204'} rows · 94 KB`, action: { label: 'Download' } },
      error: 'Export failed',
    });
  });

  /* ---------- First paint: skeleton rows for ~600 ms, then the data ---------- */
  setState('loading');
  later(() => { if (state === 'loading') setState('loaded'); }, 600);

  return { onSelect, onChange };
}
