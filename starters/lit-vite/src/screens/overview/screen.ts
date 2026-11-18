import { overlays, texture } from 'fire-design';
import { FireLight } from '../../lib/fire-light';
import { askedState, type PageState } from '../../lib/page-state';
import { overviewView } from './view';

const SEEN = 'ember-whats-new-seen';

/** The three regions that load on their own, and what each shows for the page's state. */
export type Region = 'chart' | 'stats' | 'activity';
const STATES = ['loading', 'empty', 'error'] as const satisfies readonly PageState[];

/**
 * Overview: stats, a credits chart, recent requests. The markup is static (view.ts); Fire draws the chart from the
 * JSON inside it and the skeletons from `data-fd-loading`. This component only takes the skeletons away after a
 * moment, as a real screen would when its data arrives, and shows "What's new" once per browser.
 *
 * `?state=` picks the state (see lib/page-state.ts): `loading` keeps the skeletons, `empty` is a team with no traffic
 * yet, `error` is the recent-requests section failing alone, with Retry, while the rest is up to date.
 */
export class ScreenOverview extends FireLight {
  private timers: number[] = [];

  static override properties = { state: { state: true } };
  declare state: PageState;

  constructor() {
    super();
    this.state = askedState(STATES) ?? 'ready';
  }

  /** What a region shows: its data, the empty state or the error. While `loading` the data blocks stay under the skeletons. */
  region(name: Region): PageState {
    if (this.state === 'empty') return 'empty';
    if (this.state === 'error' && name === 'activity') return 'error';
    return 'ready';
  }

  protected override render() {
    return overviewView(this);
  }

  /** Retry: skeleton again, then the data. */
  onRetry = (): void => {
    const activity = this.querySelector<HTMLElement>('#ov-activity');
    texture.setLoading(activity, true);
    this.timers.push(window.setTimeout(() => { this.state = 'ready'; this.updateComplete.then(() => texture.setLoading(activity, false)); }, 900));
  };

  protected override firstUpdated(): void {
    const regions = ['ov-chart', 'ov-stats', 'ov-activity'].map((id) => this.querySelector<HTMLElement>(`#${id}`));
    if (this.state !== 'loading') this.timers.push(window.setTimeout(() => regions.forEach((el) => texture.setLoading(el, false)), 600));
    try {
      if (!localStorage.getItem(SEEN)) {
        this.timers.push(window.setTimeout(() => {
          if (document.querySelector('dialog[open]')) return;
          overlays.openDialog('dlg-whats-new');
          localStorage.setItem(SEEN, '1');
        }, 800));
      }
    } catch { /* storage is blocked: the dialog simply never opens by itself */ }
  }

  override disconnectedCallback(): void {
    this.timers.forEach(clearTimeout);
    super.disconnectedCallback();
  }
}

customElements.define('screen-overview', ScreenOverview);
