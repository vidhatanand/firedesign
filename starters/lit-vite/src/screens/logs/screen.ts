import { html, nothing, type PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { code, copyText, data, nav, overlays } from 'fire-design';
import { FireLight } from '../../lib/fire-light';
import { logOf, requestBody, responseBody, type LogRow } from './detail';
import { emptyRow, errorRow } from './states';
import { logsView } from './view';

const { toast, openDialog, closeDialog } = overlays;

type TableState = 'loading' | 'loaded' | 'empty' | 'error';
type Range = { preset: string; start?: string; end?: string };
type Filters = { endpoint: string[]; key: string[]; status: string[]; range: Range };
type Select = HTMLElementEventMap['fd:select'];
type Change = HTMLElementEventMap['fd:change'];

/** The demo data is fixed to this moment, so "last 7 days" always means the same rows. */
const NOW = new Date('2026-11-14T16:35:00');
const DAY = 864e5;
const FILTER_KEYS = ['endpoint', 'key', 'status'] as const;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Activity logs: a table with search, filters, selection, row actions and a detail sheet.
 *
 * The table rows stay in the DOM as plain Fire markup (view.ts) instead of being rendered from data: Fire sorts,
 * selects and filters them in place, and moving nodes that a framework rendered is what breaks reconciliation (spec
 * O2). So the component shows and hides rows, and renders everything else (state, footer, filter tokens, the detail
 * sheet) from its properties.
 */
export class ScreenLogs extends FireLight {
  static override properties = {
    tableState: { state: true },
    page: { state: true },
    query: { state: true },
    filters: { state: true },
    deleted: { state: true },
    detail: { state: true },
  };
  declare tableState: TableState;
  declare page: number;
  declare query: string;
  declare filters: Filters;
  declare deleted: Set<string>;
  declare detail: LogRow | null;
  /** How many rows pass the search and filters; set before each render. */
  shown = 0;

  constructor() {
    super();
    this.tableState = 'loading';
    this.page = 1;
    this.query = '';
    this.filters = { endpoint: [], key: [], status: [], range: { preset: '7d' } };
    this.deleted = new Set();
    this.detail = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // First paint: skeleton rows for a moment, then the data.
    setTimeout(() => this.tableState === 'loading' && this.setTableState('loaded'), 600);
  }

  /* ------------------------------------------------------------------ derived values */

  private get table() { return this.querySelector<HTMLTableElement>('#logs-table'); }
  private get rows() { return [...this.querySelectorAll<HTMLTableRowElement>('#logs-body > tr')]; }
  private get filtered() {
    const f = this.filters;
    return Boolean(this.query.trim() || f.endpoint.length || f.key.length || f.status.length || f.range.preset !== '7d');
  }
  get tokens() { return FILTER_KEYS.flatMap((key) => this.filters[key].map((value) => ({ key, value }))); }
  get paged() { return this.tableState === 'loaded' && !this.filtered; }
  get prevDisabled() { return !this.paged || this.page === 1; }
  get nextDisabled() { return !this.paged || this.page === 12; }
  get stateHidden() { return this.tableState === 'loaded' ? this.shown > 0 : this.tableState === 'loading'; }

  private inRange(tr: HTMLTableRowElement): boolean {
    const stamp = tr.querySelector<HTMLElement>('[data-sort-value]')?.dataset.sortValue ?? '';
    const at = new Date(stamp);
    const { preset, start = '', end = '' } = this.filters.range;
    if (preset === '24h') return at.getTime() >= NOW.getTime() - DAY;
    if (preset === '7d') return at.getTime() >= NOW.getTime() - 7 * DAY;
    if (preset === 'month') return at.getMonth() === NOW.getMonth();
    if (preset === 'custom') return stamp.slice(0, 10) >= start && stamp.slice(0, 10) <= end;
    return true;
  }

  private passes(tr: HTMLTableRowElement, q: string): boolean {
    const { endpoint, key, status } = this.filters;
    if (this.deleted.has(tr.dataset.value ?? '')) return false;
    if (endpoint.length && !endpoint.includes(tr.children[2].textContent?.trim() ?? '')) return false;
    if (key.length && !key.includes(tr.dataset.key ?? '')) return false;
    if (status.length && !status.includes(tr.dataset.status ?? '')) return false;
    if (!this.inRange(tr)) return false;
    return !q || (tr.textContent ?? '').toLowerCase().includes(q) || (tr.dataset.key ?? '').toLowerCase().includes(q);
  }

  protected override willUpdate(): void {
    const q = this.query.trim().toLowerCase();
    this.shown = 0;
    for (const tr of this.rows) {
      tr.hidden = !this.passes(tr, q);
      if (!tr.hidden) this.shown += 1;
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('tableState')) {
      const item = this.querySelector<HTMLElement>(`#logs-state-switch .fd-segmented-item[data-value="${this.tableState}"]`);
      if (item) nav.selectSegment(item, { silent: true });
    }
    if (changed.has('detail') && this.detail) {
      // Fire draws a JSON tree into these containers; it owns their content.
      code.renderJSON(this.querySelector<HTMLElement>('#lg-request-json')!, requestBody(this.detail), { depth: 3 });
      code.renderJSON(this.querySelector<HTMLElement>('#lg-response-json')!, responseBody(this.detail), { depth: 3 });
    }
  }

  /* ------------------------------------------------------------------ rendering (used by view.ts) */

  protected override render() {
    return logsView(this);
  }

  stateRows() {
    if (this.tableState === 'empty') return emptyRow(false);
    if (this.tableState === 'error') return errorRow();
    return this.tableState === 'loaded' && this.shown === 0 ? emptyRow(true) : nothing;
  }

  info() {
    if (this.tableState === 'loading') return 'Loading requests';
    if (this.tableState === 'error') return 'Results unavailable';
    if (this.tableState === 'empty') return html`Page <b>1</b> of 1 · 0 results`;
    if (this.filtered) return html`Page <b>1</b> of 1 · ${this.shown.toLocaleString('en-US')} results`;
    return html`Page <b>${this.page}</b> of 12 · 1,204 results`;
  }

  /** The applied filters as removable tokens. Fire removes a token itself, so the list is re-created when it changes. */
  tokenList() {
    if (!this.tokens.length) return nothing;
    return keyed(JSON.stringify(this.tokens), html`${this.tokens.map(({ key, value }) => html`<span class="fd-filter-token"><span class="fd-filter-token-key">${key}</span><span class="fd-filter-token-value">${value}</span><button class="fd-filter-token-remove" type="button" aria-label="Remove ${key}: ${value}"><svg class="fd-icon" data-size="12" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button></span>`)}<button class="fd-btn-text" type="button" data-filter-clear-all>Clear all</button>`);
  }

  /* ------------------------------------------------------------------ state changes */

  private setTableState(next: TableState): void {
    if (this.table) data.clearSelection(this.table);
    this.tableState = next;
  }

  private goToPage(n: number): void {
    this.page = n;
    this.setTableState('loading');
    setTimeout(() => this.setTableState('loaded'), 450);
  }

  /* ------------------------------------------------------------------ events (bound in view.ts) */

  onSearch = (event: Event): void => { this.query = (event.target as HTMLInputElement).value; };
  onPrev = (): void => this.goToPage(Math.max(1, this.page - 1));
  onNext = (): void => this.goToPage(Math.min(12, this.page + 1));
  onState = (event: Change): void => {
    if (event.target === event.currentTarget && 'value' in event.detail) this.setTableState(String(event.detail.value) as TableState);
  };

  /** Filter lists, the date range and the applied-filter tokens all send fd:change. */
  onChange = (event: Change): void => {
    const el = event.currentTarget as HTMLElement;
    const detail = event.detail;
    if (el.matches('[data-fd-filter-list]') && event.target === el && 'value' in detail && Array.isArray(detail.value)) {
      this.filters = { ...this.filters, [el.dataset.filter as string]: detail.value as string[] };
    } else if (el.matches('[data-fd-daterange]') && event.target === el && 'value' in detail && !Array.isArray(detail.value)) {
      this.filters = { ...this.filters, range: detail.value as Range };
    } else if (el.id === 'logs-applied' && event.target === el && 'source' in detail && detail.source === 'filters') {
      // A token was removed (or Clear all): untick the matching rows in each popover, which updates the filters.
      const left = new Set(detail.value.map((t) => `${t.key}:${t.value}`));
      for (const { key, value } of this.tokens) {
        if (!left.has(`${key}:${value}`)) this.querySelector<HTMLElement>(`#pop-${key} .fd-checklist-item[data-value="${CSS.escape(value)}"]`)?.click();
      }
    }
  };

  /** Row actions, bulk actions, the row menu and the empty state's buttons all send fd:select. */
  onSelect = (event: Select): void => {
    const { action, value, row, item, trigger } = event.detail;
    if (action === 'open' && row) { event.preventDefault(); this.open(row); return; }
    if (action === 'clear-filters') return this.clearFilters();
    if (action === 'reload') { this.setTableState('loading'); setTimeout(() => this.setTableState('loaded'), 900); return; }
    const ids = Array.isArray(value) ? value : [];
    if (action === 'retry') return this.retry(ids);
    if (action === 'delete') return this.removeLogs(ids);
    if (action === 'export') { toast.success(`Exported ${ids.length} request${ids.length === 1 ? '' : 's'}`, { description: 'activity-logs-selection.csv' }); return; }
    if (item?.closest('#menu-log-row')) {
      const tr = trigger?.closest('tr');
      if (!tr) return;
      const id = tr.dataset.value ?? '';
      if (item.dataset.value === 'open') requestAnimationFrame(() => this.open(tr));
      if (item.dataset.value === 'copy') copyText(id).then(() => toast.success('Request ID copied', { description: id }));
      if (item.dataset.value === 'retry') this.retry([id]);
      if (item.dataset.value === 'delete') this.removeLogs([id]);
    }
  };

  onCopy = (): void => { if (this.detail) copyText(this.detail.id).then(() => toast.success('Request ID copied')); };
  onRetryOpen = (): void => { if (this.detail) { this.retry([this.detail.id]); closeDialog('sheet-log'); } };
  onExport = (): void => {
    const count = this.filtered ? this.shown : '1,204';
    toast.promise(wait(2200), {
      loading: { title: 'Preparing export', description: `${count} requests` },
      success: { title: 'activity-logs.csv is ready', description: `${count} rows · 94 KB`, action: { label: 'Download' } },
      error: 'Export failed',
    });
  };

  private open(tr: HTMLTableRowElement): void {
    this.detail = logOf(tr);
    this.updateComplete.then(() => openDialog('sheet-log', { trigger: tr }));
  }

  private retry(ids: string[]): void {
    toast.promise(wait(1400), {
      loading: ids.length > 1 ? `Re-queuing ${ids.length} requests` : `Re-queuing ${ids[0]}`,
      success: { title: ids.length > 1 ? `${ids.length} requests re-queued` : 'Request re-queued', description: 'New runs appear at the top of the log.' },
      error: 'Could not retry',
    });
  }

  private removeLogs(ids: string[]): void {
    if (this.table) data.clearSelection(this.table);
    this.deleted = new Set([...this.deleted, ...ids]);
    toast({
      title: ids.length > 1 ? `${ids.length} logs deleted` : 'Log deleted',
      tone: 'neutral',
      action: { label: 'Undo', onClick: () => { this.deleted = new Set([...this.deleted].filter((id) => !ids.includes(id))); } },
    });
  }

  private clearFilters(): void {
    this.query = '';
    const search = this.querySelector<HTMLInputElement>('#logs-search');
    if (search) search.value = '';
    for (const key of FILTER_KEYS) this.querySelector<HTMLElement>(`#pop-${key} [data-fd-filter-clear]`)?.click();
    if (this.filters.range.preset !== '7d') {
      this.querySelector<HTMLElement>('#pop-range [data-preset="7d"]')?.click();
      this.querySelector<HTMLElement>('#pop-range [data-fd-daterange-apply]')?.click();
    }
  }
}

customElements.define('screen-logs', ScreenLogs);
