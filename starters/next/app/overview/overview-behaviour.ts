// The Overview screen's behaviour: the page script of templates/overview.html, ported to TypeScript.
import type { PageState } from '../page-state';
import { $, $$, type Kit } from '../screen-kit';

const KEY = 'ember-whats-new-seen';

export function startOverview({ fire, later, on }: Kit, state: PageState) {
  const { texture, overlays } = fire;

  // Loading: skeletons swap to content after a short first paint.
  const regions = ['ov-chart', 'ov-stats', 'ov-activity'].map((id) => $<HTMLElement>(`#${id}`));
  // The server rendered the blocks for the state asked with ?state= (loading keeps the skeletons).
  if (state !== 'loading') later(() => regions.forEach((el) => texture.setLoading(el, false)), 600);

  // Retry on the failed recent-requests section: the skeleton again, then the data.
  on($('#ov-activity-retry'), 'click', () => {
    texture.setLoading(regions[2], true);
    later(() => {
      $$(':scope > [data-when]', regions[2]).forEach((el) => { el.hidden = el.dataset.when !== 'ready'; });
      texture.setLoading(regions[2], false);
    }, 900);
  });

  // What's new: once per browser, 800ms after load. The band 6 button reopens it any time.
  try {
    if (!localStorage.getItem(KEY)) {
      later(() => {
        if (document.querySelector('dialog[open]')) return;
        overlays.openDialog('dlg-whats-new');
        localStorage.setItem(KEY, '1');
      }, 800);
    }
  } catch { /* storage blocked: the dialog simply never auto-opens */ }
}
