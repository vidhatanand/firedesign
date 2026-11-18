// The Overview screen's behaviour: the page script of templates/overview.html, ported to TypeScript.
import { $, type Kit } from '../screen-kit';

const KEY = 'ember-whats-new-seen';

export function startOverview({ fire, later }: Kit) {
  const { texture, overlays } = fire;

  // Loading: skeletons swap to content after a short first paint.
  const regions = ['ov-chart', 'ov-stats', 'ov-activity'].map((id) => $<HTMLElement>(`#${id}`));
  later(() => regions.forEach((el) => texture.setLoading(el, false)), 600);

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
