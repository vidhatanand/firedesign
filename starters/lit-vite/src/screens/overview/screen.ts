import { overlays, texture } from 'fire-design';
import { FireLight } from '../../lib/fire-light';
import { overviewView } from './view';

const SEEN = 'ember-whats-new-seen';

/**
 * Overview: stats, a credits chart, recent requests. The markup is static (view.ts); Fire draws the chart from the
 * JSON inside it and the skeletons from `data-fd-loading`. This component only takes the skeletons away after a
 * moment, as a real screen would when its data arrives, and shows "What's new" once per browser.
 */
export class ScreenOverview extends FireLight {
  private timers: number[] = [];

  protected override render() {
    return overviewView();
  }

  protected override firstUpdated(): void {
    const regions = ['ov-chart', 'ov-stats', 'ov-activity'].map((id) => this.querySelector<HTMLElement>(`#${id}`));
    this.timers.push(window.setTimeout(() => regions.forEach((el) => texture.setLoading(el, false)), 600));
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
