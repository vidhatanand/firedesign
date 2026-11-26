/* Fire forms — behaviour for the Forms family.
 *
 * Everything is opt-in through markup and runs from delegated listeners on
 * `document`, so markup inserted later works. `init(root)` upgrades what needs
 * a one-time render (check marks, slider fill, tokens, masks) and is idempotent;
 * a MutationObserver calls it for nodes added afterwards.
 *
 * Markup contracts
 * ----------------
 * Textarea auto-grow     <textarea class="fd-textarea" data-fd-autogrow data-max-rows="8">
 * Character counter      <span class="fd-field-counter"></span> inside the .fd-field of an input/textarea with maxlength
 * Search                 <div class="fd-search"><i data-icon="search"></i><input class="fd-search-input" type="search"
 *                          placeholder="Search" data-fd-search-hotkey><button class="fd-search-clear" type="button" aria-label="Clear">…</button><kbd class="fd-kbd">/</kbd></div>
 *                        data-fd-search-hotkey            "/" focuses the first visible one
 *                        data-fd-search-hotkey="mod+k"    ⌘K / Ctrl+K instead
 * Checkbox / radio       <label class="fd-checkbox"><input type="checkbox"><span class="fd-checkbox-box"></span>
 *                          <span class="fd-checkbox-text"><span class="fd-checkbox-label">…</span><span class="fd-checkbox-desc">…</span></span></label>
 *                        (the check SVG is injected into .fd-checkbox-box and .fd-choice-mark)
 *                        <input type="checkbox" data-fd-checkall="#group input"> selects/deselects the matching boxes and shows indeterminate
 * Slider                 <div class="fd-slider" data-variant="steps" data-labels="Low,Medium,High" data-bubble="off" data-suffix=" pages">
 *                          <input type="range" min max step value></div>
 *                        optional <div class="fd-slider-ticks"><span data-value="5">5</span>…</div>; <output for="id"> mirrors the value.
 *                        Sets --fd-slider-p (0..1) on the wrapper.
 * Number                 <div class="fd-number"><button class="fd-number-step" data-fd-step="-1">…</button><input class="fd-number-input" type="number">
 *                          <button class="fd-number-step" data-fd-step="1">…</button></div>
 * Combobox               <div class="fd-combobox" data-fd-combobox [data-multiple] data-name="model" data-empty="No matches">
 *                          <div class="fd-input-group"><input class="fd-input" role="combobox">…</div>
 *                          <div class="fd-listbox" popover="manual"><div class="fd-option" data-value="…" [aria-selected="true"]>…</div></div></div>
 *                        Multiple: use <div class="fd-tag-input"><input class="fd-tag-input-field" role="combobox"></div> instead of the group.
 * Tag input              <div class="fd-tag-input" data-fd-tag-input data-name="domains" data-value="a.com,b.com" data-max="10" data-pattern="…">
 *                          <input class="fd-tag-input-field"></div>
 *                        In a posted form, put one named text area inside instead (one value per line). Without script it
 *                        is that text area; with it, the text area becomes the tokens and one hidden input of the same
 *                        name carries the values joined by new lines, or a JSON array with data-format="json" (the text
 *                        area may then hold a JSON array too). id, placeholder, disabled, readonly, aria-describedby,
 *                        aria-invalid and required carry over (required applies only while the list is empty).
 *                          <div class="fd-tag-input" data-fd-tag-input [data-format="json"] [data-mono] [data-pattern] [data-max]>
 *                            <textarea name="redirect_uris" id="f-redirects" rows="3">https://app.example.com/callback</textarea></div>
 * Pairs                  <div class="fd-pairs" data-fd-pairs [data-format="json"] data-key-label="Scope" data-value-label="What people see"
 *                          [data-key-placeholder] [data-value-placeholder] [data-add-label="Add scope"] [data-mono="key|value|both"] [data-size="sm"]>
 *                          <textarea name="scopes" id="f-scopes" rows="4">read:runs = Read your runs</textarea></div>
 *                        Without script: a text area, one "name = value" per line (split on the first "="). With it: a
 *                        head (.fd-pairs-head), one .fd-pairs-row per pair (key input, value input, remove button), an
 *                        add button (.fd-pairs-add) and one hidden input with the text area's name holding the same lines,
 *                        or a JSON object with data-format="json". Rows with an empty key are left out; a key used twice
 *                        marks both keys aria-invalid and the group data-invalid, and stops the form posting.
 *                        id (to the first key), disabled, readonly and aria-describedby carry over; reset restores the pairs.
 * Code field             <div class="fd-codefield" [data-fd-json]>
 *                          <div class="fd-codefield-head"><span class="fd-codefield-lang">JSON</span>
 *                            [<button class="fd-btn" type="button" data-variant="ghost" data-size="xs" data-fd-codefield-format>Format</button>]</div>
 *                          <textarea class="fd-codefield-input" name="config" spellcheck="false" autocapitalize="off">{}</textarea></div>
 *                        Tab inserts two spaces (Escape, then Tab, leaves the field). data-fd-json checks the value on blur
 *                        and on submit and writes "This isn't valid JSON: <reason>, line N." into the .fd-field-error of the
 *                        enclosing .fd-field. Format pretty-prints valid JSON with two spaces, keeping every literal as
 *                        written. The script sets data-ready on the field; the Format button is hidden until it does.
 * Choice card            <label class="fd-choice"><input type="radio"><span class="fd-choice-mark"></span><span class="fd-choice-body">…</span></label>
 * Secret / copy field    <div class="fd-secret" data-fd-secret data-value="…" [data-mask="partial|full|end"] [data-state="revealed"]> with buttons
 *                        carrying data-fd-field-action="reveal|copy|rotate"; works the same on .fd-copy-field.
 *                        data-mask="end" [data-mask-keep="4"] [data-mask-from="/"]: shows the start up to the last
 *                        data-mask-from, eight dots and the last data-mask-keep characters, and masks even with no reveal
 *                        button. The value is drawn as .fd-secret-start + .fd-secret-end (.fd-copy-field-start / -end):
 *                        the start shortens with an ellipsis, the end never does. Copy always copies data-value.
 *                        A copy field with data-copy-next="…" (0.13) shows that step in the .fd-copy-next line after it
 *                        once Copy is pressed, announced with the copy as one message (fire/js/code.js does it, on fd:copy).
 *                        Entry: <div class="fd-secret" data-mode="entry" [data-noun="password"]><input class="fd-secret-input"
 *                        type="password" name id autocomplete="new-password"><div class="fd-secret-actions"><button
 *                        data-fd-field-action="reveal"></div></div>. Reveal switches the input to text and back (aria-pressed);
 *                        it is masked again on submit and reset. No data-value, no copy, no rotate. Posts as a plain field.
 * Dropzone               <label class="fd-dropzone" data-fd-dropzone data-list="#files" data-max-mb="50"><input type="file" multiple accept=".pdf,.docx">…</label>
 *                        <ul class="fd-filelist" id="files"></ul>
 * File row               <li class="fd-file" data-state="uploading|paused|done|error"> .fd-file-icon · .fd-file-main (.fd-file-name,
 *                          .fd-file-meta > .fd-file-size + .fd-file-status, .fd-file-bar) · the remove button, or (0.13)
 *                          <div class="fd-file-actions"> with several icon buttons (Pause, Resume, Try again, Cancel, Open),
 *                          each named for its file. Fire wires only data-fd-file-remove; the product listens for the others
 *                          and drives the row with setFileProgress(row, pct, { state, message }). "paused" holds the bar
 *                          where it stopped and says "Paused at 42%" (or the message); a message on "uploading" replaces
 *                          "Uploading 42%" ("42% · 12.3 MB/s · about 2 min left"). The demo upload of a row stops while it
 *                          is paused and goes on from where it was when the row is set back to "uploading".
 * Logo field (0.8)       the dropzone as one setting row: a preview, an Upload button and a Remove button, for one image.
 *                        <div class="fd-field"><span class="fd-field-label" id="logo-l">Team logo</span>
 *                         <div class="fd-dropzone" data-fd-dropzone data-layout="logo" data-max-mb="2" role="group" aria-labelledby="logo-l">
 *                          <input type="file" accept="image/png,image/svg+xml,image/jpeg" tabindex="-1" aria-label="Team logo file">
 *                          <span class="fd-dropzone-preview"><img src alt="Current logo">   (optional: the logo now in use)
 *                           <span class="fd-tile" data-size="44" data-fd-initial="Quarry Labs"></span></span>   (shown when there is no <img>)
 *                          <span class="fd-dropzone-text"><span class="fd-dropzone-hint">PNG, SVG or JPEG, up to 2 MB.</span>
 *                           <span class="fd-file-bar" role="progressbar" aria-label="Uploading logo"><span></span></span><span class="fd-file-status"></span></span>
 *                          <span class="fd-dropzone-actions"><button type="button" class="fd-btn" data-fd-file-pick>Upload</button>
 *                           <button type="button" class="fd-btn" data-variant="ghost" data-fd-file-clear>Remove</button></span></div>
 *                         <p class="fd-field-error" hidden></p></div>
 *                        The Upload button opens the file input; a file dropped on the row counts too. The file is checked against
 *                        accept and data-max-mb: a refusal goes into the field's error and nothing changes. An accepted file shows
 *                        in the preview at once (an object URL, revoked when it is replaced or removed), the row takes
 *                        data-state="uploading", and fd:files { files, rows: [] } (cancelable) and fd:change { value: [file] } fire
 *                        on the row. Nothing is uploaded: cancel fd:files, send the file, and call setFileProgress(row, pct,
 *                        { state, message }) with the row itself ("done" shows the message; "error" shows it in red). Without a
 *                        listener the row plays a short demo upload. Remove empties the preview back to the initial tile and
 *                        fires fd:change { value: [] }. States: data-state="dragover | uploading | done | error"; aria-disabled
 *                        on the row (and disabled buttons) switches it off.
 * One-time code          <div class="fd-otp" data-fd-otp data-length="6" [data-type="numeric|alphanumeric"]> (inputs are generated when empty)
 *                         In a form: data-name="code" adds a hidden input that carries the whole code. Or put one ordinary
 *                         named input inside (<input name="code" required>): it works as a plain field without script and
 *                         becomes the boxes with it, keeping its name, id, value, required, disabled, readonly, autofocus
 *                         and aria-invalid. Resetting the form clears the carried code too.
 * Date field            <div class="fd-datefield" data-fd-datefield [data-min-date="today"] [data-max-date="2027-11-18"]>
 *                          <div class="fd-input-group"><input class="fd-input" type="text" name="pause_until" inputmode="numeric"
 *                            placeholder="2026-12-01" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" autocomplete="off">
 *                            <span class="fd-input-affix" data-kind="action"><button class="fd-btn" type="button" data-variant="ghost"
 *                              data-size="sm" data-icon-only aria-label="Choose date" data-fd-popover="pause-cal"
 *                              data-placement="bottom-end"><i data-icon="calendar"></i></button></span></div>
 *                          <div class="fd-popover" id="pause-cal" popover data-size="auto" aria-label="Choose a date">
 *                            <div class="fd-datefield-panel" data-fd-datepanel><div class="fd-calendar"></div>
 *                              <div class="fd-datefield-foot"><button data-fd-datepanel-today>Today</button>
 *                              <button data-fd-datepanel-clear>Clear</button></div></div></div></div>
 *                        Without script it is a text box that posts the ISO date (YYYY-MM-DD) and the calendar button is hidden.
 *                        With it (data-ready is set on the root) the calendar opens from the button or with ArrowDown in the
 *                        field (overlays.js draws it); typing accepts 2026-11-18, 2026/11/18, "Nov 18, 2026" and "18 Nov 2026"
 *                        and is written back as the ISO date when the field is left or the form is sent. data-min-date and
 *                        data-max-date (an ISO date or "today") are checked with setCustomValidity, so required, data-fd-validate and the
 *                        browser's own submit check all see them. The message goes into the field's .fd-field-error.
 * Colour                 <div class="fd-color" data-fd-color><div class="fd-input-group">
 *                          <span class="fd-input-affix" data-kind="action"><input class="fd-color-picker" type="color" inert
 *                            aria-label="Pick a colour" value="#14342b" data-fd-color-picker></span>
 *                          <input class="fd-input" type="text" name="brand_color" value="#14342b" data-fd-color-hex maxlength="7"
 *                            spellcheck="false" autocomplete="off" pattern="#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})"></div>
 *                          <ul class="fd-color-checks" data-fd-color-feedback></ul></div>
 *                        The hex text box carries the name and posts "#rrggbb" (lower case) as a plain field; the native picker
 *                        has no name and is inert until the script runs. With script the two stay in step, a short or
 *                        hash-less hex is completed, a bad one marks the field invalid, and [data-fd-color-feedback] lists the
 *                        contrast of the colour on the page (--fd-bg) and against the accent (--fd-accent), re-measured
 *                        when the theme, palette or accent changes: 4.5:1 reads as text (palette-rules TEXT_MIN), 3:1 as
 *                        marks and large text (FAINT_MIN).
 * Confirm on the page    <form class="fd-confirm-inline" method="post" data-fd-confirm-inline data-confirm="ember-prod"> … a field
 *                          with <span class="fd-confirm-phrase">ember-prod</span> in its label, <input class="fd-input"
 *                          name="confirm" data-fd-confirm-input autocomplete="off" required>, <p class="fd-confirm-inline-rule"
 *                          data-fd-confirm-rule>Type it exactly as shown. Case counts.</p> and <button class="fd-btn"
 *                          data-variant="danger" type="submit" data-fd-confirm-submit>Delete team</button></form>
 *                        Without script the button is enabled and the server checks the posted text. With it the button is
 *                        disabled until the text, trimmed, equals data-confirm (or the input's data-match), and the rule line
 *                        says where it stands: it matches so far, where it first differs, or that it matches. The form is
 *                        not sent while the text does not match. data-state on the form: idle | partial | mismatch | match.
 * Disabled with a reason <div class="fd-reason"><button class="fd-btn" disabled aria-describedby="why">Rotate key</button>
 *                          <p class="fd-reason-text" id="why"><i data-icon="lock"></i><span><span class="fd-reason-why">…</span>
 *                          <span class="fd-reason-who">…</span></span></p></div>. A control marked aria-disabled="true" (instead of
 *                        disabled, so keyboard users can reach it and hear the reason) inside a .fd-reason does nothing when
 *                        activated: the script stops its click, so a link without href or a button of type submit is safe too.
 * Recovery codes         <section class="fd-codes" data-fd-codes data-filename="ember-recovery-codes.txt"> head with
 *                          <h3 class="fd-codes-title">, actions [data-fd-codes-copy] and [data-fd-codes-download] (hidden until the
 *                          script runs), <ol class="fd-codes-list"><li class="fd-codes-item" [data-used]><code>…</code></li></ol>
 *                          and <p class="fd-codes-note">. Copy all and Download use the codes not marked data-used, one per line;
 *                          Download makes a text file through a Blob URL. Without script the codes stay selectable text.
 * Validation             <form data-fd-validate> validates on blur and submit with native constraint validation and fills .fd-field-error
 * Unsaved changes        <form data-fd-dirty> toggles [data-dirty] and shows .fd-form-actions[data-variant="sticky"]
 *
 * Events (all bubble, from the component root)
 *   fd:change   { value }                       combobox, tag input, otp ({ value, complete }), number, slider, search, dropzone,
 *                                               pairs (an object of name → value)
 *   fd:select   { value, item }                 combobox option chosen
 *   fd:open / fd:close                          combobox popover
 *   fd:copy     { value }                       secret / copy field
 *   fd:rotate   {}                              secret rotate button (replace the value with setSecret)
 *   fd:files    { files }  (cancelable)         dropzone accepted files (a logo row: { files, rows: [] }); cancel to run your own upload and drive setFileProgress
 *   fd:change   { value, valid }                date field: the ISO date ("" when empty); colour: "#rrggbb" or the text typed
 *   fd:change   { value, matched }              confirm on the page, on the form
 *   fd:copy     { value }                       recovery codes, Copy all (the codes joined by new lines)
 *   fd:download { filename, value }             recovery codes, after Download
 *   fd:invalid  { fields } / fd:valid           validated form
 *   fd:dirty    { dirty }                       form[data-fd-dirty]
 */
import { $, $$, on, once, emit, ensureId, position, autoUpdate, copyText, clamp, reducedMotion, label as fdLabel } from './core.js';
import { icon, setIcon } from './icons.js';
import { contrast } from './palettes.js';
import { TEXT_MIN, FAINT_MIN } from './palette-rules.js';

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const each = (root, selector, fn) => {
  if (root.matches?.(selector)) fn(root);
  $$(selector, root).forEach(fn);
};
const timers = new WeakMap();
const later = (el, key, fn, ms) => {
  const map = timers.get(el) ?? timers.set(el, {}).get(el);
  clearTimeout(map[key]);
  map[key] = setTimeout(fn, ms);
};
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
const HAS_POPOVER = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

/* ==========================================================================
   Check marks
   ========================================================================== */

const CHECK_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path class="fd-check-tick" pathLength="1" d="M4.25 8.5l2.5 2.5 5-5.5"/><path class="fd-check-dash" pathLength="1" d="M4.5 8h7"/></svg>';

function enhanceChecks(root) {
  each(root, '.fd-checkbox-box, .fd-choice-mark', (el) => { if (!el.querySelector('svg')) el.insertAdjacentHTML('beforeend', CHECK_SVG); });
}

/** Set a checkbox to indeterminate (the browser clears it on the next click). */
export function setIndeterminate(input, value = true) {
  input.indeterminate = value;
}

let propagating = false;

function syncCheckAll(target) {
  if (propagating) return;
  const parents = $$('input[data-fd-checkall]');
  if (target.matches?.('input[data-fd-checkall]')) {
    const children = $$(target.dataset.fdCheckall).filter((el) => el !== target && !el.disabled);
    children.forEach((child) => { child.checked = target.checked; });
    target.indeterminate = false;
    propagating = true;
    children.forEach((child) => fire(child, 'change'));
    propagating = false;
    return;
  }
  parents.forEach((parent) => {
    const children = $$(parent.dataset.fdCheckall).filter((el) => el !== parent && !el.disabled);
    if (!children.includes(target)) return;
    const checked = children.filter((el) => el.checked).length;
    parent.checked = checked === children.length && children.length > 0;
    parent.indeterminate = checked > 0 && checked < children.length;
  });
}

/* ==========================================================================
   Textarea auto-grow and counters
   ========================================================================== */

/** Resize a textarea to fit its content, up to its max height (CSS max-height or data-max-rows). */
export function autogrow(el) {
  if (!el || !el.isConnected || !el.getClientRects().length) return;
  el.style.height = 'auto';
  const cs = getComputedStyle(el);
  const line = parseFloat(cs.lineHeight) || 20;
  const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  let max = parseFloat(cs.maxHeight);
  if (el.dataset.maxRows) max = Number(el.dataset.maxRows) * line + pad;
  if (!Number.isFinite(max)) max = Infinity;
  const natural = el.scrollHeight;
  el.style.height = `${Math.min(natural, max)}px`;
  el.style.overflowY = natural > max ? 'auto' : 'hidden';
}

function updateCounter(control) {
  const field = control.closest('.fd-field');
  const counter = field && $('.fd-field-counter', field);
  if (!counter) return;
  const max = control.maxLength > 0 ? control.maxLength : Number(counter.dataset.max) || 0;
  const length = control.value.length;
  counter.textContent = max ? `${length.toLocaleString('en-US')} / ${max.toLocaleString('en-US')}` : length.toLocaleString('en-US');
  counter.dataset.state = max && length >= max ? 'limit' : max && length >= max * 0.9 ? 'near' : '';
}

/* ==========================================================================
   Search
   ========================================================================== */

function enhanceSearch(root) {
  each(root, '.fd-search-input', (input) => { if (!input.hasAttribute('placeholder')) input.setAttribute('placeholder', ' '); });
}

const isTyping = (el) => el instanceof HTMLElement && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));

function hotkey(event) {
  if (event.defaultPrevented || event.altKey) return;
  const key = event.key || '';
  const mod = (event.metaKey || event.ctrlKey) && key.toLowerCase() === 'k';
  const slash = key === '/' && !event.metaKey && !event.ctrlKey && !isTyping(event.target);
  if (!mod && !slash) return;
  const candidates = $$('[data-fd-search-hotkey]').filter((el) => !el.disabled && el.getClientRects().length);
  const target = candidates.find((el) => (mod ? el.dataset.fdSearchHotkey === 'mod+k' : el.dataset.fdSearchHotkey !== 'mod+k'));
  if (!target) return;
  event.preventDefault();
  target.focus();
  target.select?.();
}

function clearSearch(input) {
  input.value = '';
  fire(input, 'input');
  input.focus();
}

/* ==========================================================================
   Slider
   ========================================================================== */

const sliderInput = (el) => $('input[type="range"]', el);

function sliderText(el, input) {
  const min = Number(input.min || 0);
  const step = Number(input.step) || 1;
  const labels = el.dataset.labels?.split(',').map((s) => s.trim());
  if (labels?.length) return labels[clamp(Math.round((Number(input.value) - min) / step), 0, labels.length - 1)];
  return `${el.dataset.prefix ?? ''}${Number(input.value).toLocaleString('en-US')}${el.dataset.suffix ?? ''}`;
}

/** Re-read a slider's input and update fill, bubble, ticks, aria-valuetext and any <output for>. */
export function syncSlider(el) {
  const input = sliderInput(el);
  if (!input) return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const p = max > min ? clamp((Number(input.value) - min) / (max - min), 0, 1) : 0;
  const text = sliderText(el, input);
  el.style.setProperty('--fd-slider-p', String(p));
  const bubble = $('.fd-slider-bubble', el);
  if (bubble) bubble.textContent = text;
  if (el.dataset.labels || el.dataset.suffix || el.dataset.prefix) input.setAttribute('aria-valuetext', text);
  $$('.fd-slider-ticks > *', el).forEach((tick) => {
    const value = tick.dataset.value;
    tick.toggleAttribute('data-active', value !== undefined && Number(value) === Number(input.value));
  });
  if (input.id) $$('output[for]').forEach((out) => { if (out.htmlFor.contains(input.id)) out.textContent = text; });
}

function setupSlider(el) {
  if (!once(el, 'slider')) return;
  const input = sliderInput(el);
  if (!input) return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const step = Number(input.step) || 1;
  if (el.dataset.bubble !== 'off' && !$('.fd-slider-bubble', el)) {
    input.insertAdjacentHTML('afterend', '<output class="fd-slider-bubble" aria-hidden="true"></output>');
  }
  const labels = el.dataset.labels?.split(',').map((s) => s.trim());
  let ticks = $('.fd-slider-ticks', el);
  if (labels?.length && !ticks) {
    el.insertAdjacentHTML('beforeend', `<div class="fd-slider-ticks" aria-hidden="true">${labels.map((label, i) => `<span data-value="${min + i * step}">${esc(label)}</span>`).join('')}</div>`);
    ticks = $('.fd-slider-ticks', el);
  }
  if (el.dataset.variant === 'steps') el.style.setProperty('--fd-slider-n', String(Math.max(1, Math.round((max - min) / step))));
  if (ticks) {
    ticks.setAttribute('aria-hidden', 'true');
    const items = [...ticks.children];
    items.forEach((tick, i) => {
      const value = tick.dataset.value !== undefined ? Number(tick.dataset.value) : null;
      const t = value !== null && max > min ? (value - min) / (max - min) : items.length > 1 ? i / (items.length - 1) : 0;
      tick.style.setProperty('--_f-t', String(clamp(t, 0, 1)));
      if (value === null) tick.dataset.value = String(min + Math.round(t * (max - min) / step) * step);
    });
  }
  syncSlider(el);
}

/* ==========================================================================
   Number
   ========================================================================== */

const numberInput = (el) => $('.fd-number-input', el);

/** Enable / disable the steppers according to min, max and the current value. */
export function syncNumber(el) {
  const input = numberInput(el);
  if (!input) return;
  const value = parseFloat(input.value);
  const min = input.min !== '' ? Number(input.min) : -Infinity;
  const max = input.max !== '' ? Number(input.max) : Infinity;
  const dec = $('[data-fd-step="-1"]', el);
  const inc = $('[data-fd-step="1"]', el);
  if (dec) dec.disabled = input.disabled || input.readOnly || (!Number.isNaN(value) && value <= min);
  if (inc) inc.disabled = input.disabled || input.readOnly || (!Number.isNaN(value) && value >= max);
}

function stepNumber(el, direction) {
  const input = numberInput(el);
  if (!input || input.disabled || input.readOnly) return;
  const before = input.value;
  try {
    if (direction > 0) input.stepUp(); else input.stepDown();
  } catch {
    const step = Number(input.step) || 1;
    input.value = String((parseFloat(input.value) || 0) + direction * step);
  }
  if (input.value !== before) { fire(input, 'input'); fire(input, 'change'); }
  syncNumber(el);
}

let repeatDelay;
let repeatTimer;
const stopRepeat = () => { clearTimeout(repeatDelay); clearInterval(repeatTimer); };

/* ==========================================================================
   One-time code
   ========================================================================== */

const otpInputs = (el) => $$(':scope > input:not([type="hidden"])', el);
const otpCarrier = (el) => $(':scope > input[type="hidden"]', el);
const otpClean = (el, text) => (el.dataset.type === 'alphanumeric' ? text.replace(/[^a-z0-9]/gi, '') : text.replace(/\D/g, ''));
const otpValue = (el) => otpInputs(el).map((input) => input.value).join('');

function setupOtp(el) {
  if (!once(el, 'otp')) return;
  const length = Number(el.dataset.length) || 6;
  // A form a server rendered may hold one ordinary named input, so the field works without script. It becomes
  // the boxes here, and its name moves to a hidden input that carries the whole code.
  const plain = otpInputs(el).length === 1 && otpInputs(el)[0].name ? otpInputs(el)[0] : null;
  if (plain) {
    if (!el.dataset.name) el.dataset.name = plain.name;
    el.removeChild(plain);
  }
  if (!otpInputs(el).length) {
    el.insertAdjacentHTML('beforeend', Array.from({ length }, () => '<input>').join(''));
  }
  const inputs = otpInputs(el);
  if (el.dataset.name && !otpCarrier(el)) {
    const carrier = document.createElement('input');
    carrier.type = 'hidden';
    carrier.name = el.dataset.name;
    el.append(carrier);
  }
  if (plain) {
    if (plain.id) inputs[0].id = plain.id;
    [...otpClean(el, plain.value)].slice(0, inputs.length).forEach((char, i) => { inputs[i].value = char; });
    inputs.forEach((input) => { input.required = plain.required; input.disabled = plain.disabled; input.readOnly = plain.readOnly; });
    if (plain.disabled && otpCarrier(el)) otpCarrier(el).disabled = true;   // a disabled field posts nothing
    if (plain.getAttribute('aria-invalid') === 'true') setOtpInvalid(el, true);
    const describedBy = plain.getAttribute('aria-describedby');
    if (describedBy && !el.hasAttribute('aria-describedby')) el.setAttribute('aria-describedby', describedBy);
    if (otpCarrier(el)) otpCarrier(el).value = otpValue(el);
    if (plain.autofocus) inputs[0].focus();
  }
  if (!el.hasAttribute('role')) el.setAttribute('role', 'group');
  inputs.forEach((input, i) => {
    input.setAttribute('inputmode', el.dataset.type === 'alphanumeric' ? 'text' : 'numeric');
    input.setAttribute('autocomplete', i === 0 ? 'one-time-code' : 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    if (!input.hasAttribute('aria-label')) input.setAttribute('aria-label', fdLabel(el, 'otp.char', 'Character {n} of {total}', { n: i + 1, total: inputs.length }));
  });
}

/** Mark a one-time-code group invalid (or clear it). */
export function setOtpInvalid(el, invalid = true) {
  otpInputs(el).forEach((input) => (invalid ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid')));
}

/** Clear every box and focus the first. */
export function resetOtp(el) {
  const inputs = otpInputs(el);
  inputs.forEach((input) => { input.value = ''; });
  const carrier = otpCarrier(el);
  if (carrier) carrier.value = '';
  setOtpInvalid(el, false);
  inputs[0]?.focus();
}

function otpFill(el, start, text) {
  const inputs = otpInputs(el);
  const chars = [...text].slice(0, inputs.length - start);
  chars.forEach((char, i) => { inputs[start + i].value = char; });
  const next = Math.min(start + chars.length, inputs.length - 1);
  inputs[next].focus();
  inputs[next].select();
}

function otpChanged(el) {
  const value = otpValue(el);
  const carrier = otpCarrier(el);
  if (carrier) carrier.value = value;
  emit(el, 'fd:change', { value, complete: value.length === otpInputs(el).length });
}

/* ==========================================================================
   Tokens: tag input
   ========================================================================== */

const tokenHTML = (el, label, value, fresh) =>
  `<span class="fd-token" data-value="${esc(value)}"${fresh ? ' data-new' : ''}><span class="fd-token-label">${esc(label)}</span><button type="button" class="fd-token-remove" tabindex="-1" aria-label="${esc(fdLabel(el, 'token.remove', 'Remove {label}', { label }))}">${icon('x')}</button></span>`;

/* A list written by a server as a text area: its initial values, and whether it was required. */
const lists = new WeakMap();
const carrierOf = (root) => $(':scope > input[data-fd-carrier]', root);

/** Read a list from text: one value per line, or a JSON array of strings when `json` is set. */
export function parseList(text, { json = false } = {}) {
  const source = String(text ?? '').trim();
  if (json && source.startsWith('[')) {
    try {
      const array = JSON.parse(source);
      if (Array.isArray(array)) return array.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)).trim()).filter(Boolean);
    } catch { /* not JSON after all: read it as lines */ }
  }
  return source.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
}

/** The text a list posts: the values on separate lines, or a JSON array with data-format="json". */
export const formatList = (root, values) => (root.dataset.format === 'json' ? JSON.stringify(values) : values.join('\n'));

const uniqueValues = (values) => [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];

function markPatterns(root) {
  const pattern = root.dataset.pattern ? new RegExp(root.dataset.pattern) : null;
  $$(':scope > .fd-token', root).forEach((token) => token.toggleAttribute('data-invalid', Boolean(pattern) && !pattern.test(token.dataset.value)));
}

function syncHidden(root, values) {
  $$(':scope > input[data-fd-hidden]', root).forEach((el) => el.remove());
  const carrier = carrierOf(root);
  if (carrier) {
    carrier.value = formatList(root, values);
    const field = $(':scope > .fd-tag-input-field', root);
    if (field && lists.get(root)?.required) {
      field.required = !values.length;   // native validation says "fill this in" only on an empty list
      if (field.hasAttribute('aria-invalid') && field.closest('form[data-fd-validate]')) validateControl(field);
    }
  }
  const name = root.dataset.name;
  if (!name) return;
  values.forEach((value) => root.insertAdjacentHTML('beforeend', `<input type="hidden" name="${esc(name)}" value="${esc(value)}" data-fd-hidden>`));
}

function announce(root, text) {
  let live = $(':scope > .fd-sr-only[data-fd-live]', root);
  if (!live) {
    root.insertAdjacentHTML('beforeend', '<span class="fd-sr-only" role="status" aria-live="polite" data-fd-live></span>');
    live = $(':scope > .fd-sr-only[data-fd-live]', root);
  }
  live.textContent = text;
}

/** Current values of a tag input. */
export const tagValues = (el) => $$(':scope > .fd-token', el).map((token) => token.dataset.value);

/** Replace the values of a tag input. */
export function setTags(el, values, { silent = true } = {}) {
  $$(':scope > .fd-token', el).forEach((token) => token.remove());
  const field = $(':scope > .fd-tag-input-field', el);
  values.forEach((value) => field.insertAdjacentHTML('beforebegin', tokenHTML(field, value, value, false)));
  markPatterns(el);
  syncHidden(el, tagValues(el));
  if (!silent) emit(el, 'fd:change', { value: tagValues(el) });
}

function addTags(el, raw, { user = true } = {}) {
  const field = $(':scope > .fd-tag-input-field', el);
  const max = Number(el.dataset.max) || Infinity;
  const pattern = el.dataset.pattern ? new RegExp(el.dataset.pattern) : null;
  const existing = new Set(tagValues(el));
  const added = [];
  for (const piece of raw) {
    const value = piece.trim();
    if (!value || existing.has(value) || existing.size >= max) continue;
    existing.add(value);
    field.insertAdjacentHTML('beforebegin', tokenHTML(field, value, value, user));
    if (pattern && !pattern.test(value)) $(`:scope > .fd-token[data-value="${CSS.escape(value)}"]`, el)?.setAttribute('data-invalid', '');
    added.push(value);
  }
  if (!added.length) return false;
  syncHidden(el, tagValues(el));
  announce(el, `Added ${added.join(', ')}`);
  emit(el, 'fd:change', { value: tagValues(el) });
  return true;
}

function removeToken(token) {
  const owner = token.closest('[data-fd-tag-input], [data-fd-combobox]');
  if (!owner) return;
  const value = token.dataset.value;
  if (owner.matches('[data-fd-combobox]')) {
    const state = comboFor(owner);
    if (state) { state.selected.delete(value); commitCombo(state); emit(owner, 'fd:change', { value: [...state.selected.keys()] }); }
    return;
  }
  token.remove();
  syncHidden(owner, tagValues(owner));
  announce(owner, `Removed ${value}`);
  emit(owner, 'fd:change', { value: tagValues(owner) });
}

const CARRY = ['placeholder', 'aria-describedby', 'aria-invalid', 'aria-label', 'aria-labelledby', 'spellcheck', 'autocapitalize', 'title'];

/* A text area a server rendered, so the list works without script: it becomes the tokens, its name moves to a
   hidden input that carries every value in the shape the text area would have posted. */
function listFromTextarea(el, area) {
  const values = uniqueValues(parseList(area.value, { json: el.dataset.format === 'json' }));
  const field = document.createElement('input');
  field.type = 'text';
  field.className = 'fd-tag-input-field';
  field.setAttribute('autocomplete', 'off');
  CARRY.forEach((name) => { if (area.hasAttribute(name)) field.setAttribute(name, area.getAttribute(name)); });
  field.disabled = area.disabled;
  field.readOnly = area.readOnly;
  const carrier = document.createElement('input');
  carrier.type = 'hidden';
  carrier.name = area.name;
  carrier.disabled = area.disabled;   // a disabled field posts nothing
  carrier.setAttribute('data-fd-carrier', '');
  if (area.hasAttribute('form')) carrier.setAttribute('form', area.getAttribute('form'));
  lists.set(el, { required: area.required, initial: values });
  const { id, autofocus } = area;
  area.remove();
  if (id) field.id = id;   // the label still points at the place people type
  el.append(field, carrier);
  setTags(el, values);
  if (autofocus) field.focus();
}

/** Put a list written as a text area back to the values it was rendered with (a form reset). */
function resetList(el) {
  const state = lists.get(el);
  if (state) setTags(el, state.initial);
}

function setupTagInput(el) {
  if (!once(el, 'tags')) return;
  const area = $(':scope > textarea', el);
  if (area && !$(':scope > .fd-tag-input-field', el)) { listFromTextarea(el, area); return; }
  if (el.dataset.value) setTags(el, el.dataset.value.split(',').map((v) => v.trim()).filter(Boolean));
  else syncHidden(el, tagValues(el));
}

/* ==========================================================================
   Field errors written by a component (pairs, code field)
   ========================================================================== */

const ownErrors = new WeakMap();   // owner (a code field's text area, a pairs editor) -> the message this module wrote

/**
 * Show (message) or clear (null) a component's own error in the error slot of the field around `owner`.
 * `control` is the input the message is about; it points at the slot with aria-describedby.
 */
function setOwnError(owner, control, message) {
  const field = owner.closest('.fd-field');
  if (message) {
    ownErrors.set(owner, message);
    const slot = field && control?.isConnected ? errorSlot(control) : null;
    if (!slot) return;
    const described = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    described.add(slot.id);
    control.setAttribute('aria-describedby', [...described].join(' '));
    if (slot.hidden || slot.dataset.message !== message) slot.innerHTML = `${icon('circle-alert', { size: 14 })}<span>${esc(message)}</span>`;
    slot.dataset.message = message;
    slot.hidden = false;
    return;
  }
  const previous = ownErrors.get(owner);
  ownErrors.delete(owner);
  const slot = field && $('.fd-field-error', field);
  if (slot && previous && slot.dataset.message === previous) slot.hidden = true;
}

/* ==========================================================================
   Pairs: name and value rows
   ========================================================================== */

const pairsState = new WeakMap();
const pairRows = (el) => $$(':scope > .fd-pairs-row', el);
const rowKey = (row) => $(':scope > .fd-pairs-key', row);
const rowValue = (row) => $(':scope > .fd-pairs-value', row);

/** Read pairs from text: one "name = value" per line (split on the first "="), or a JSON object when `json` is set. */
export function parsePairs(text, { json = false } = {}) {
  const source = String(text ?? '').trim();
  if (json && source.startsWith('{')) {
    try {
      const object = JSON.parse(source);
      if (object && typeof object === 'object' && !Array.isArray(object)) {
        return Object.entries(object).map(([key, value]) => [key.trim(), typeof value === 'string' ? value : JSON.stringify(value)]);
      }
    } catch { /* not JSON after all: read it as lines */ }
  }
  return source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const at = line.indexOf('=');
    return at < 0 ? [line, ''] : [line.slice(0, at).trim(), line.slice(at + 1).trim()];
  });
}

/** The text pairs post: "name = value" lines, or a JSON object with data-format="json". Empty names are left out. */
export function formatPairs(root, entries) {
  const kept = entries.filter(([key]) => key);
  if (root.dataset.format === 'json') return JSON.stringify(Object.fromEntries(kept));
  return kept.map(([key, value]) => `${key} = ${value}`.trimEnd()).join('\n');
}

const pairEntries = (el) => pairRows(el).map((row) => [rowKey(row).value.trim(), rowValue(row).value.trim()]);

/** The pairs as an object of name → value (a name used twice keeps its last value). */
export const pairsValue = (el) => Object.fromEntries(pairEntries(el).filter(([key]) => key));

function pairRowHTML(el, key = '', value = '') {
  const { mono, size, keyPlaceholder, valuePlaceholder } = el.dataset;
  const monoAttr = (part) => (mono === part || mono === 'both' ? ' data-mono spellcheck="false" autocapitalize="off"' : '');
  const sizeAttr = size ? ` data-size="${esc(size)}"` : '';
  const placeholder = (text) => (text ? ` placeholder="${esc(text)}"` : '');
  return `<div class="fd-pairs-row">`
    + `<input class="fd-input fd-pairs-key" type="text" autocomplete="off" data-fd-skip value="${esc(key)}"${sizeAttr}${monoAttr('key')}${placeholder(keyPlaceholder)}>`
    + `<input class="fd-input fd-pairs-value" type="text" autocomplete="off" data-fd-skip value="${esc(value)}"${sizeAttr}${monoAttr('value')}${placeholder(valuePlaceholder)}>`
    + `<button type="button" class="fd-btn" data-variant="ghost" data-icon-only${sizeAttr} data-fd-pairs-remove aria-label="${esc(fdLabel(el, 'pairs.remove-row', 'Remove row'))}">${icon('x')}</button>`
    + `</div>`;
}

/** Re-read every row: labels, duplicate names, the carried value, and the id the label points at. */
function syncPairs(el, { notify = false } = {}) {
  const state = pairsState.get(el);
  if (!state) return;
  const rows = pairRows(el);
  const keyLabel = el.dataset.keyLabel || 'Name';
  const valueLabel = el.dataset.valueLabel || 'Value';
  const counts = new Map();
  rows.forEach((row) => { const key = rowKey(row).value.trim(); if (key) counts.set(key, (counts.get(key) || 0) + 1); });
  let firstDuplicate = null;
  rows.forEach((row, i) => {
    const keyInput = rowKey(row);
    const valueInput = rowValue(row);
    const key = keyInput.value.trim();
    const n = i + 1;
    keyInput.setAttribute('aria-label', `${keyLabel} ${n}`);
    valueInput.setAttribute('aria-label', key ? `${valueLabel} for ${key}` : `${valueLabel} ${n}`);
    $(':scope > [data-fd-pairs-remove]', row).setAttribute('aria-label', key ? fdLabel(el, 'pairs.remove-key', 'Remove {key}', { key }) : fdLabel(el, 'pairs.remove-n', 'Remove row {n}', { n }));
    const duplicate = Boolean(key) && counts.get(key) > 1;
    if (duplicate) {
      keyInput.setAttribute('aria-invalid', 'true');
      keyInput.setCustomValidity(`“${key}” is listed twice. Remove one.`);
      firstDuplicate ??= keyInput;
    } else {
      keyInput.removeAttribute('aria-invalid');
      keyInput.setCustomValidity('');
    }
    if (i === 0 && state.id) keyInput.id = state.id;
    else if (state.id && keyInput.id === state.id) keyInput.removeAttribute('id');
  });
  el.toggleAttribute('data-invalid', Boolean(firstDuplicate));
  if (firstDuplicate) setOwnError(el, firstDuplicate, firstDuplicate.validationMessage);
  else if (ownErrors.has(el)) setOwnError(el, null, null);
  if (state.carrier) state.carrier.value = formatPairs(el, pairEntries(el));
  if (notify) emit(el, 'fd:change', { value: pairsValue(el) });
}

function lockRow(el, row) {
  const { disabled, readOnly } = pairsState.get(el);
  [rowKey(row), rowValue(row)].forEach((input) => { input.disabled = disabled; input.readOnly = readOnly; });
  const remove = $(':scope > [data-fd-pairs-remove]', row);
  remove.disabled = disabled;
  remove.hidden = readOnly;
}

function addPairRow(el, after = null, key = '', value = '') {
  const add = $(':scope > .fd-pairs-add', el);
  if (after) after.insertAdjacentHTML('afterend', pairRowHTML(el, key, value));
  else if (add) add.insertAdjacentHTML('beforebegin', pairRowHTML(el, key, value));
  else el.insertAdjacentHTML('beforeend', pairRowHTML(el, key, value));
  const row = after ? after.nextElementSibling : add ? add.previousElementSibling : pairRows(el).pop();
  lockRow(el, row);
  return row;
}

function renderPairs(el, entries) {
  pairRows(el).forEach((row) => row.remove());
  (entries.length ? entries : [['', '']]).forEach(([key, value]) => addPairRow(el, null, key, value));
}

const toEntries = (value) => (Array.isArray(value) ? value : Object.entries(value ?? {})).map(([key, v]) => [String(key).trim(), v == null ? '' : String(v)]);

/** Replace the pairs (an object of name → value, or an array of [name, value]). */
export function setPairs(el, value, { silent = true } = {}) {
  setupPairs(el);
  if (!pairsState.has(el)) return;
  renderPairs(el, toEntries(value));
  syncPairs(el, { notify: !silent });
}

function removePairRow(el, row) {
  const rows = pairRows(el);
  const key = rowKey(row).value.trim();
  if (rows.length === 1) {
    rowKey(row).value = '';
    rowValue(row).value = '';
    syncPairs(el, { notify: true });
    rowKey(row).focus();
  } else {
    const next = row.nextElementSibling?.matches('.fd-pairs-row') ? row.nextElementSibling : null;
    row.remove();
    syncPairs(el, { notify: true });
    (next ? rowKey(next) : $(':scope > .fd-pairs-add > button', el) ?? rowKey(pairRows(el).pop())).focus();
  }
  if (key) announce(el, `Removed ${key}`);
}

function setupPairs(el) {
  if (!once(el, 'pairs')) return;
  const area = $(':scope > textarea', el);
  const json = el.dataset.format === 'json';
  const initial = parsePairs(area ? area.value : '', { json });
  const name = area?.name || el.dataset.name || '';
  const state = { initial, id: area?.id || '', disabled: Boolean(area?.disabled), readOnly: Boolean(area?.readOnly), carrier: null };
  pairsState.set(el, state);
  if (!el.hasAttribute('role')) el.setAttribute('role', 'group');
  if (area) {
    const label = area.id ? $(`label[for="${CSS.escape(area.id)}"]`) : null;
    if (label && !el.hasAttribute('aria-labelledby') && !el.hasAttribute('aria-label')) el.setAttribute('aria-labelledby', ensureId(label, 'fd-label'));
    const describedBy = area.getAttribute('aria-describedby');
    if (describedBy && !el.hasAttribute('aria-describedby')) el.setAttribute('aria-describedby', describedBy);
    area.remove();
  }
  const keyLabel = el.dataset.keyLabel || 'Name';
  const valueLabel = el.dataset.valueLabel || 'Value';
  el.insertAdjacentHTML('afterbegin', `<div class="fd-pairs-head" aria-hidden="true"><span>${esc(keyLabel)}</span><span>${esc(valueLabel)}</span></div>`);
  el.insertAdjacentHTML('beforeend', `<div class="fd-pairs-add"${state.readOnly ? ' hidden' : ''}><button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-fd-pairs-add${state.disabled ? ' disabled' : ''}>${icon('plus')}<span>${esc(el.dataset.addLabel || 'Add row')}</span></button></div>`);
  if (name) {
    const carrier = document.createElement('input');
    carrier.type = 'hidden';
    carrier.name = name;
    carrier.disabled = state.disabled;
    carrier.setAttribute('data-fd-carrier', '');
    if (area?.hasAttribute('form')) carrier.setAttribute('form', area.getAttribute('form'));
    el.append(carrier);
    state.carrier = carrier;
  }
  renderPairs(el, initial);
  syncPairs(el);
}

/** Put pairs written as a text area back to the pairs they were rendered with (a form reset). */
function resetPairs(el) {
  const state = pairsState.get(el);
  if (!state) return;
  renderPairs(el, state.initial);
  syncPairs(el);
}

/* ==========================================================================
   Code field
   ========================================================================== */

const escaped = new WeakSet();   // code fields where Escape was just pressed, so the next Tab leaves

const WS = ' \t\n\r';

/**
 * Find what is wrong with a JSON text: { reason, line } in plain words, or null when it parses. JSON.parse decides
 * validity; a small scanner finds the place, so the message is the same in every browser.
 */
export function jsonProblem(text) {
  try { JSON.parse(text); return null; } catch (error) {
    const found = locateJson(text);
    if (found) return found;
    const message = String(error?.message || '');
    const position = Number(message.match(/position (\d+)/)?.[1]);
    const line = Number(message.match(/line (\d+)/)?.[1]) || (Number.isFinite(position) ? text.slice(0, position).split('\n').length : 1);
    const reason = message.replace(/^JSON(\.parse| Parse error)?:?\s*/i, '').replace(/\s*(in JSON )?at (position|line) [\s\S]*$/i, '').replace(/,\s*".*$/, '').trim();
    return { reason: (reason || 'it could not be read').replace(/^\w/, (c) => c.toLowerCase()), line };
  }
}

function locateJson(text) {
  let i = 0;
  const n = text.length;
  const stop = (reason, at = i) => { throw { reason, at }; };
  const space = () => { while (i < n && WS.includes(text[i])) i++; };
  const what = () => {
    if (text.startsWith('//', i) || text.startsWith('/*', i)) return 'comments are not allowed';
    if (text[i] === "'") return 'use double quotes, not single quotes';
    const word = text.slice(i).match(/^[A-Za-z_$][\w$]*/)?.[0];
    if (word) return `“${word}” is not a JSON value`;
    return `unexpected “${text[i]}”`;
  };
  const string = () => {
    i++;
    while (i < n) {
      const c = text[i];
      if (c === '"') { i++; return; }
      if (c === '\n' || c === '\r') stop('a string runs onto the next line');
      if (c < ' ') stop('a string holds a control character');
      if (c === '\\') {
        const next = text[i + 1];
        if (next === 'u') { if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) stop('a \\u escape needs four hex digits'); i += 6; continue; }
        if (!next || !'"\\/bfnrt'.includes(next)) stop(`“\\${next ?? ''}” is not an escape JSON knows`);
        i += 2;
        continue;
      }
      i++;
    }
    stop('a string is not closed');
  };
  const number = () => {
    const match = text.slice(i).match(/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/);
    if (!match) stop('a number is not written right');
    i += match[0].length;
    if (/^[\d.eE]/.test(text[i] ?? '')) stop('a number is not written right');
  };
  const container = (close) => {
    i++;
    space();
    if (text[i] === close) { i++; return; }
    for (;;) {
      space();
      if (close === '}') {
        if (i >= n) stop('it ends before the closing }');
        if (text[i] === '}') stop('there is a comma before the }');
        if (text[i] !== '"') stop(text[i] === "'" ? 'names need double quotes' : 'expected a name in double quotes');
        string();
        space();
        if (text[i] !== ':') stop(i >= n ? 'it ends before the value' : 'expected a colon after the name');
        i++;
      } else if (text[i] === ']') stop('there is a comma before the ]');
      value();
      space();
      if (text[i] === ',') { i++; continue; }
      if (text[i] === close) { i++; return; }
      if (i >= n) stop(`it ends before the closing ${close}`);
      stop(`expected a comma or ${close}`);
    }
  };
  function value() {
    space();
    if (i >= n) stop('it ends before a value');
    const c = text[i];
    if (c === '{') return container('}');
    if (c === '[') return container(']');
    if (c === '"') return string();
    if (c === '-' || (c >= '0' && c <= '9')) return number();
    for (const word of ['true', 'false', 'null']) if (text.startsWith(word, i) && !/[\w$]/.test(text[i + word.length] ?? '')) { i += word.length; return undefined; }
    return stop(what());
  }
  try {
    value();
    space();
    if (i < n) stop('there is more after the end of the value');
    return null;
  } catch (problem) {
    if (!problem || typeof problem.reason !== 'string') return null;
    return { reason: problem.reason, line: text.slice(0, Math.min(problem.at, n)).split('\n').length };
  }
}

/** Re-indent valid JSON with two spaces. Literals are kept exactly as written (no rounding of big numbers). */
export function formatJson(text) {
  let out = '';
  let depth = 0;
  let i = 0;
  const line = () => `\n${'  '.repeat(depth)}`;
  while (i < text.length) {
    const c = text[i];
    if (WS.includes(c)) { i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === '{' || c === '[') {
      let j = i + 1;
      while (WS.includes(text[j] ?? '-')) j++;
      if (text[j] === (c === '{' ? '}' : ']')) { out += c + text[j]; i = j + 1; continue; }
      depth++;
      out += c + line();
      i++;
    } else if (c === '}' || c === ']') { depth--; out += line() + c; i++; }
    else if (c === ',') { out += `,${line()}`; i++; }
    else if (c === ':') { out += ': '; i++; }
    else {
      let j = i;
      while (j < text.length && !`${WS},:]}`.includes(text[j])) j++;
      out += text.slice(i, j);
      i = j;
    }
  }
  return out;
}

/** Check a JSON code field and show or clear its error. Returns true when the value is empty or valid JSON. */
export function checkJson(area) {
  const problem = area.value.trim() ? jsonProblem(area.value) : null;
  if (problem) {
    const message = `This isn't valid JSON: ${problem.reason}, line ${problem.line}.`;
    area.setCustomValidity(message);
    area.setAttribute('aria-invalid', 'true');
    setOwnError(area, area, message);
    return false;
  }
  if (ownErrors.has(area)) {
    area.setCustomValidity('');
    area.removeAttribute('aria-invalid');
    setOwnError(area, area, null);
  }
  return true;
}

function insertText(area, text) {
  let done = false;
  try { done = document.execCommand('insertText', false, text); } catch { /* not supported */ }   // keeps undo working
  if (!done) {
    area.setRangeText(text, area.selectionStart, area.selectionEnd, 'end');
    fire(area, 'input');
  }
}

function indentCode(area) {
  const { selectionStart: start, selectionEnd: end, value } = area;
  if (start !== end && value.slice(start, end).includes('\n')) {
    const from = value.lastIndexOf('\n', start - 1) + 1;
    const block = value.slice(from, end).replace(/^(?=[^\n])/gm, '  ');
    area.setSelectionRange(from, end);
    insertText(area, block);
    area.setSelectionRange(from, from + block.length);
  } else insertText(area, '  ');
}

function formatCode(area) {
  if (!area.value.trim() || area.readOnly || area.disabled) return;
  if (!checkJson(area)) { area.focus(); return; }
  const pretty = formatJson(area.value);
  if (pretty === area.value) return;
  area.focus();
  area.select();
  insertText(area, pretty);
  area.setSelectionRange(0, 0);
  area.scrollTop = 0;
}

function setupCodefield(el) {
  if (!once(el, 'codefield')) return;
  const area = $(':scope > .fd-codefield-input', el);
  if (!area) return;
  el.setAttribute('data-ready', '');
  if (!area.hasAttribute('spellcheck')) area.setAttribute('spellcheck', 'false');
  if (!area.hasAttribute('autocapitalize')) area.setAttribute('autocapitalize', 'off');
  if (!area.hasAttribute('autocomplete')) area.setAttribute('autocomplete', 'off');
  const note = document.createElement('span');
  note.className = 'fd-sr-only';
  ensureId(note, 'fd-codefield-keys');
  note.textContent = fdLabel(el, 'textarea.tab', 'Tab inserts two spaces. To leave the field, press Escape, then Tab.');
  el.append(note);
  const described = new Set((area.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  described.add(note.id);
  area.setAttribute('aria-describedby', [...described].join(' '));
}

function resetCodefield(area) {
  if (!ownErrors.has(area)) return;
  area.setCustomValidity('');
  area.removeAttribute('aria-invalid');
  setOwnError(area, area, null);
}

/* ==========================================================================
   Combobox
   ========================================================================== */

const combos = new WeakMap();
const openCombos = new Set();

const optionLabel = (option) => option.dataset.label || $('.fd-option-label', option)?.textContent.trim() || option.textContent.trim();
const optionValue = (option) => option.dataset.value ?? optionLabel(option);
const optionsOf = (state) => $$('.fd-option', state.list);
const visibleOptions = (state) => optionsOf(state).filter((o) => !o.hidden && o.getAttribute('aria-disabled') !== 'true');

function comboFor(root) {
  if (!root) return null;
  if (!combos.has(root)) setupCombobox(root);
  return combos.get(root) ?? null;
}

function setupCombobox(root) {
  if (!once(root, 'combobox')) return;
  const input = $('[role="combobox"]', root) || $('input:not([type="hidden"])', root);
  const list = $('.fd-listbox', root);
  if (!input || !list) return;
  const multiple = root.hasAttribute('data-multiple');
  const state = {
    root, input, list, multiple,
    anchor: $('.fd-input-group, .fd-tag-input', root) || input,
    open: false, active: null, stop: null, dirty: false, pointerInList: false,
    selected: new Map(),
  };
  combos.set(root, state);

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-haspopup', 'listbox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('aria-controls', ensureId(list, 'fd-listbox'));
  list.setAttribute('role', 'listbox');
  if (multiple) list.setAttribute('aria-multiselectable', 'true');
  if (!input.hasAttribute('aria-label') && !input.id) input.setAttribute('aria-label', input.getAttribute('placeholder') || fdLabel(root, 'search.options', 'Search options'));
  if (!list.hasAttribute('aria-label') && !list.hasAttribute('aria-labelledby')) list.setAttribute('aria-label', input.getAttribute('aria-label') || fdLabel(root, 'options.list', 'Options'));
  if (HAS_POPOVER) list.setAttribute('popover', 'manual');
  else { list.dataset.fallback = ''; list.hidden = true; }

  let empty = $('.fd-listbox-empty', list);
  if (!empty) {
    list.insertAdjacentHTML('beforeend', `<div class="fd-listbox-empty" hidden>${esc(root.dataset.empty || 'No matches')}</div>`);
    empty = $('.fd-listbox-empty', list);
  }
  empty.setAttribute('role', 'presentation');

  const initial = root.dataset.value?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];
  optionsOf(state).forEach((option) => {
    option.setAttribute('role', 'option');
    ensureId(option, 'fd-option');
    if (!$('.fd-option-check', option)) option.insertAdjacentHTML('beforeend', `<span class="fd-option-check" aria-hidden="true">${icon('check')}</span>`);
    if (option.getAttribute('aria-selected') === 'true' || option.hasAttribute('data-selected') || initial.includes(optionValue(option))) {
      state.selected.set(optionValue(option), optionLabel(option));
    }
  });
  if (!multiple && state.selected.size > 1) {
    const [first] = state.selected;
    state.selected = new Map([first]);
  }
  commitCombo(state);
}

/** Write the selection to the DOM: aria-selected, value attribute, tokens, hidden inputs, input text. */
function commitCombo(state) {
  const { root, input, multiple } = state;
  optionsOf(state).forEach((option) => option.setAttribute('aria-selected', String(state.selected.has(optionValue(option)))));
  const values = [...state.selected.keys()];
  root.dataset.value = values.join(',');
  if (multiple) {
    const container = $('.fd-tag-input', root) || root;
    $$(':scope > .fd-token', container).forEach((token) => token.remove());
    state.selected.forEach((label, value) => input.insertAdjacentHTML('beforebegin', tokenHTML(input, label, value, state.fresh?.has(value))));
    state.fresh = null;
    if (input.dataset.placeholder === undefined) input.dataset.placeholder = input.getAttribute('placeholder') ?? '';
    input.setAttribute('placeholder', values.length ? '' : input.dataset.placeholder);
    input.value = '';
  } else if (!state.open || !state.dirty) {
    input.value = values.length ? state.selected.get(values[0]) : '';
  }
  $$(':scope > input[data-fd-hidden]', root).forEach((el) => el.remove());
  if (root.dataset.name) values.forEach((value) => root.insertAdjacentHTML('beforeend', `<input type="hidden" name="${esc(root.dataset.name)}" value="${esc(value)}" data-fd-hidden>`));
}

function placeCombo(state) {
  if (HAS_POPOVER) position(state.anchor, state.list, { placement: 'bottom-start', matchWidth: true, offset: 6 });
}

function filterOptions(state, query) {
  const q = query.trim().toLowerCase();
  const options = optionsOf(state);
  options.forEach((option) => {
    const haystack = (option.dataset.search ?? option.textContent).toLowerCase();
    option.hidden = Boolean(q) && !haystack.includes(q);
  });
  $$('[role="group"]', state.list).forEach((group) => { group.hidden = !$$('.fd-option', group).some((o) => !o.hidden); });
  const any = options.some((o) => !o.hidden);
  const empty = $('.fd-listbox-empty', state.list);
  if (empty) empty.hidden = any;
}

function setActive(state, option) {
  state.active?.removeAttribute('data-active');
  state.active = option ?? null;
  if (!option) { state.input.removeAttribute('aria-activedescendant'); return; }
  option.setAttribute('data-active', '');
  state.input.setAttribute('aria-activedescendant', option.id);
  const list = state.list;
  const top = option.offsetTop;
  const bottom = top + option.offsetHeight;
  if (top < list.scrollTop + 4) list.scrollTop = Math.max(0, top - 4);
  else if (bottom > list.scrollTop + list.clientHeight - 4) list.scrollTop = bottom - list.clientHeight + 4;
}

function openCombo(state, { activate = 'selected' } = {}) {
  if (state.open || state.input.disabled || state.input.readOnly) return;
  state.open = true;
  openCombos.add(state);
  filterOptions(state, state.dirty ? state.input.value : '');
  if (HAS_POPOVER) { try { if (!state.list.matches(':popover-open')) state.list.showPopover(); } catch { /* already open */ } }
  else state.list.hidden = false;
  state.input.setAttribute('aria-expanded', 'true');
  state.root.dataset.state = 'open';
  placeCombo(state);
  state.stop = autoUpdate(() => placeCombo(state));
  const visible = visibleOptions(state);
  const selected = visible.find((o) => o.getAttribute('aria-selected') === 'true');
  setActive(state, activate === 'last' ? visible[visible.length - 1] : selected ?? visible[0]);
  emit(state.root, 'fd:open', {});
}

function closeCombo(state) {
  if (!state.open) return;
  state.open = false;
  state.pointerInList = false;
  openCombos.delete(state);
  if (HAS_POPOVER) { try { if (state.list.matches(':popover-open')) state.list.hidePopover(); } catch { /* already closed */ } }
  else state.list.hidden = true;
  state.input.setAttribute('aria-expanded', 'false');
  state.root.dataset.state = 'closed';
  state.stop?.();
  state.stop = null;
  setActive(state, null);
  state.dirty = false;
  commitCombo(state);
  emit(state.root, 'fd:close', {});
}

function chooseOption(state, option) {
  if (!option || option.getAttribute('aria-disabled') === 'true') return;
  const value = optionValue(option);
  const label = optionLabel(option);
  if (state.multiple) {
    if (state.selected.has(value)) state.selected.delete(value);
    else state.selected.set(value, label);
    state.dirty = false;
    state.fresh = new Set([value]);
    commitCombo(state);
    filterOptions(state, '');
    setActive(state, option);
  } else {
    state.selected = new Map([[value, label]]);
    state.dirty = false;
    closeCombo(state);
  }
  emit(state.root, 'fd:select', { value, item: option });
  emit(state.root, 'fd:change', { value: state.multiple ? [...state.selected.keys()] : value, label });
}

function moveActive(state, direction) {
  const visible = visibleOptions(state);
  if (!visible.length) return;
  const index = visible.indexOf(state.active);
  const next = index < 0 ? (direction > 0 ? 0 : visible.length - 1) : (index + direction + visible.length) % visible.length;
  setActive(state, visible[next]);
}

/** The value of a combobox: a string, or an array when it is multiple. */
export function comboboxValue(root) {
  const state = comboFor(root);
  if (!state) return null;
  const values = [...state.selected.keys()];
  return state.multiple ? values : values[0] ?? null;
}

/** Select by value (string or array) without opening the popover. */
export function setComboboxValue(root, value) {
  const state = comboFor(root);
  if (!state) return;
  const wanted = Array.isArray(value) ? value : value == null ? [] : [value];
  state.selected = new Map();
  optionsOf(state).forEach((option) => { if (wanted.includes(optionValue(option))) state.selected.set(optionValue(option), optionLabel(option)); });
  if (!state.multiple && state.selected.size > 1) state.selected = new Map([[...state.selected][0]]);
  state.dirty = false;
  commitCombo(state);
}

/* ==========================================================================
   Secret and copy field
   ========================================================================== */

const MASK = '•';

function maskValue(value, mode) {
  if (mode === 'full') return MASK.repeat(Math.min(Math.max(value.length, 24), 48));
  if (value.length <= 20) return MASK.repeat(value.length);
  return value.slice(0, 8) + MASK.repeat(18) + value.slice(-8);
}

/* data-mask="end": keep a readable start (everything up to the last data-mask-from, if given) and the last
   data-mask-keep characters (4), and mask what is between. The value is drawn as a start that may shorten with an
   ellipsis and an end that never does, so on a narrow screen the characters that identify it stay in view. */
function endParts(value, el, revealed) {
  const keep = Math.max(1, Number.parseInt(el.dataset.maskKeep, 10) || 4);
  if (revealed) return value.length > keep ? [value.slice(0, -keep), value.slice(-keep)] : ['', value];
  const from = el.dataset.maskFrom;
  const at = from ? value.lastIndexOf(from) : -1;
  const start = at >= 0 ? value.slice(0, at + from.length) : '';
  const rest = value.slice(start.length);
  return [start, rest.length > keep ? MASK.repeat(8) + rest.slice(-keep) : MASK.repeat(8)];
}

/* Entry mode: the reveal button only switches the input between password and text, so it shows what was typed
   here and never a stored value. */
const isEntry = (el) => el.dataset.mode === 'entry';
function renderEntry(el) {
  const input = $('.fd-secret-input', el);
  const reveal = $('[data-fd-field-action="reveal"]', el);
  const revealed = el.dataset.state === 'revealed';
  if (input) input.type = revealed ? 'text' : 'password';
  if (reveal) {
    const noun = el.dataset.noun || 'password';
    reveal.setAttribute('aria-pressed', String(revealed));
    reveal.setAttribute('aria-label', revealed ? fdLabel(el, 'secret.hide', 'Hide {noun}', { noun }) : fdLabel(el, 'secret.show', 'Show {noun}', { noun }));
    if (input?.id) reveal.setAttribute('aria-controls', input.id);
    setIcon(reveal, revealed ? 'eye-off' : 'eye');
  }
}

function renderSecret(el) {
  if (isEntry(el)) { renderEntry(el); return; }
  const valueEl = $('.fd-secret-value, .fd-copy-field-value', el);
  if (!valueEl) return;
  const value = el.dataset.value ?? '';
  const reveal = $('[data-fd-field-action="reveal"]', el);
  const endMask = el.dataset.mask === 'end';
  // An end mask holds without a reveal button: a field that must never show its value has none.
  const revealed = endMask ? el.dataset.state === 'revealed' && !!reveal : !reveal || el.dataset.state === 'revealed';
  if (endMask) {
    const block = el.classList.contains('fd-copy-field') ? 'fd-copy-field' : 'fd-secret';
    const parts = endParts(value, el, revealed).map((text, i) => {
      const span = document.createElement('span');
      span.className = `${block}-${i ? 'end' : 'start'}`;
      span.textContent = text;
      return span;
    });
    valueEl.replaceChildren(...parts);
  } else {
    valueEl.textContent = revealed ? value : maskValue(value, el.dataset.mask);
  }
  if (reveal) {
    const noun = el.dataset.noun || 'value';
    reveal.setAttribute('aria-pressed', String(revealed));
    reveal.setAttribute('aria-label', revealed ? fdLabel(el, 'secret.hide', 'Hide {noun}', { noun }) : fdLabel(el, 'secret.show', 'Show {noun}', { noun }));
    setIcon(reveal, revealed ? 'eye-off' : 'eye');
  }
  const copy = $('[data-fd-field-action="copy"]', el);
  if (copy && !copy.dataset.state) copy.setAttribute('aria-label', fdLabel(el, 'secret.copy', 'Copy {noun}', { noun: el.dataset.noun || 'value' }));
}

function setupSecret(el) {
  if (!once(el, 'secret')) return;
  if (isEntry(el)) { if (!el.dataset.state) el.dataset.state = 'masked'; renderEntry(el); return; }
  const valueEl = $('.fd-secret-value, .fd-copy-field-value', el);
  if (el.dataset.value === undefined && valueEl) el.dataset.value = valueEl.textContent.trim();
  if ($('[data-fd-field-action="reveal"]', el) && !el.dataset.state) el.dataset.state = 'masked';
  renderSecret(el);
}

/** Replace the value of a secret / copy field (for example after a rotate). */
export function setSecret(el, value) {
  el.dataset.value = value;
  renderSecret(el);
}

async function copySecret(el, button) {
  const value = el.dataset.value ?? '';
  const ok = await copyText(value);
  if (!ok) return;
  const noun = el.dataset.noun || 'value';
  button.dataset.state = 'copied';
  setIcon(button, 'check');
  button.setAttribute('aria-label', fdLabel(el, 'secret.copied', 'Copied {noun}', { noun }));
  later(button, 'copied', () => {
    delete button.dataset.state;
    setIcon(button, 'copy');
    button.setAttribute('aria-label', fdLabel(el, 'secret.copy', 'Copy {noun}', { noun }));
  }, 1400);
  emit(el, 'fd:copy', { value });
}

/* ==========================================================================
   Dropzone
   ========================================================================== */

const formatBytes = (n) => (n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)} MB`);
const fileIconName = (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  if (/^(png|jpe?g|gif|webp|svg|avif)$/.test(ext)) return 'image';
  if (/^(csv|xlsx?|tsv)$/.test(ext)) return 'table';
  if (/^(json)$/.test(ext)) return 'file-json';
  if (/^(html?|xml|js|ts)$/.test(ext)) return 'file-code';
  if (/^(pdf|docx?|txt|md|rtf)$/.test(ext)) return 'file-text';
  return 'file';
};

function listFor(zone) {
  if (zone.dataset.list) return $(zone.dataset.list);
  const next = zone.nextElementSibling;
  return next?.matches('.fd-filelist') ? next : $('.fd-filelist', zone.parentElement);
}

function acceptProblem(zone, file) {
  const input = $('input[type="file"]', zone);
  const accept = (input?.accept || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (accept.length) {
    const name = file.name.toLowerCase();
    const type = (file.type || '').toLowerCase();
    const ok = accept.some((rule) => (rule.startsWith('.') ? name.endsWith(rule) : rule.endsWith('/*') ? type.startsWith(rule.slice(0, -1)) : type === rule));
    if (!ok) return 'File type not supported';
  }
  const maxMb = Number(zone.dataset.maxMb);
  if (maxMb && file.size > maxMb * 1024 * 1024) return `Larger than ${maxMb} MB`;
  return '';
}

/** Update a file row: pct 0-100 and an optional state ("uploading" | "paused" | "done" | "error") and status line. */
export function setFileProgress(row, pct, { state, message } = {}) {
  const next = state ?? (pct >= 100 ? 'done' : 'uploading');
  const previous = row.dataset.state;
  const at = clamp(Number(pct) || 0, 0, 100);
  row.dataset.state = next;
  row.style.setProperty('--fd-progress', String(at));
  const bar = $('.fd-file-bar', row);
  bar?.setAttribute('aria-valuenow', String(Math.round(at)));
  const status = $('.fd-file-status', row);
  if (status) {
    if (next === 'done') status.innerHTML = `${icon('circle-check')}<span>${esc(message ?? 'Ready')}</span>`;
    else if (next === 'error') status.innerHTML = `${icon('circle-alert')}<span>${esc(message ?? 'Upload failed')}</span>`;
    else if (next === 'paused') status.innerHTML = `${icon('circle-pause')}<span>${esc(message ?? `Paused at ${Math.round(at)}%`)}</span>`;
    else status.textContent = message ?? `Uploading ${Math.round(at)}%`;
  }
  // The demo upload stopped at the pause (its timer finds the row not uploading); it goes on from here.
  if (previous === 'paused' && next === 'uploading' && row.fdDemo) simulateUpload(row, at);
}

function fileRow(file, problem) {
  const name = esc(file.name);
  return `<li class="fd-file" data-state="${problem ? 'error' : 'uploading'}">
    <span class="fd-file-icon">${icon(fileIconName(file))}</span>
    <div class="fd-file-main">
      <div class="fd-file-name">${name}</div>
      <div class="fd-file-meta"><span class="fd-file-size">${formatBytes(file.size)}</span><span class="fd-file-status"></span></div>
      <div class="fd-file-bar" role="progressbar" aria-label="Uploading ${name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
    </div>
    <button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only aria-label="Remove ${name}" data-fd-file-remove>${icon('x')}</button>
  </li>`;
}

/* ---------- Logo field: the dropzone as a row with a preview ---------- */
function logoError(zone, message) {
  const input = $('input[type="file"]', zone);
  const slot = errorSlot(zone);
  if (!slot) return;
  if (message) {
    slot.innerHTML = `${icon('circle-alert', { size: 14 })}<span>${esc(message)}</span>`;
    slot.dataset.message = message;
    slot.hidden = false;
    const described = new Set((input?.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    described.add(slot.id);
    input?.setAttribute('aria-describedby', [...described].join(' '));
    input?.setAttribute('aria-invalid', 'true');
  } else {
    slot.hidden = true;
    input?.removeAttribute('aria-invalid');
  }
}
function logoPreview(zone, file) {
  const box = $('.fd-dropzone-preview', zone);
  if (!box) return;
  if (zone.fdObjectUrl) { URL.revokeObjectURL(zone.fdObjectUrl); zone.fdObjectUrl = null; }
  $('img', box)?.remove();
  if (!file) return;
  zone.fdObjectUrl = URL.createObjectURL(file);
  const img = document.createElement('img');
  img.alt = zone.dataset.alt || file.name;
  img.src = zone.fdObjectUrl;
  box.prepend(img);
}
function setLogo(zone, files) {
  const file = [...files][0];
  if (!file) return;
  stopUpload(zone);   // an accepted file starts its own; a refused one leaves an error that nothing may overwrite
  const problem = acceptProblem(zone, file);
  if (problem) { zone.dataset.state = 'error'; logoError(zone, problem); return; }
  logoError(zone, '');
  logoPreview(zone, file);
  zone.fdFile = file;
  setFileProgress(zone, 0);
  const proceed = emit(zone, 'fd:files', { files: [file], rows: [] });
  emit(zone, 'fd:change', { value: [file] });
  if (proceed) simulateUpload(zone);
}
function clearLogo(zone) {
  stopUpload(zone);
  logoPreview(zone, null);
  zone.fdFile = null;
  logoError(zone, '');
  delete zone.dataset.state;
  emit(zone, 'fd:change', { value: [] });
}

/** Add files to a dropzone's list. Accepted files are announced with fd:files; cancel it to handle the upload yourself. */
export function addFiles(zone, files) {
  if (zone.dataset.layout === 'logo') { setLogo(zone, files); return; }
  const list = listFor(zone);
  const multiple = $('input[type="file"]', zone)?.multiple !== false;
  const picked = [...files];
  if (!multiple && list) $$('.fd-file', list).forEach((row) => row.remove());
  const accepted = [];
  picked.slice(0, multiple ? picked.length : 1).forEach((file) => {
    const problem = acceptProblem(zone, file);
    if (!list) { if (!problem) accepted.push(file); return; }
    list.insertAdjacentHTML('beforeend', fileRow(file, problem));
    const row = list.lastElementChild;
    row.fdFile = file;
    if (problem) setFileProgress(row, 0, { state: 'error', message: problem });
    else { setFileProgress(row, 0); accepted.push(file); }
  });
  if (!accepted.length) return;
  const rows = list ? $$('.fd-file[data-state="uploading"]', list).filter((row) => accepted.includes(row.fdFile)) : [];
  const proceed = emit(zone, 'fd:files', { files: accepted, rows });
  emit(zone, 'fd:change', { value: accepted });
  if (proceed) rows.forEach(simulateUpload);
}

/** End the simulated upload running on a row or a logo zone, if one is: its timer finds another run and stops. */
function stopUpload(row) { row.fdUpload = (row.fdUpload || 0) + 1; }
function simulateUpload(row, from = 0) {
  stopUpload(row);
  row.fdDemo = true;
  const run = row.fdUpload;
  let pct = from;
  const speed = 6 + Math.random() * 10;
  const tick = () => {
    // A logo zone stays in the page when its picture is removed or replaced, so being connected is not enough: the
    // run must still be the row's own, and the row still uploading (a page may have set done or error itself).
    if (!row.isConnected || row.fdUpload !== run || row.dataset.state !== 'uploading') return;
    pct = Math.min(100, pct + speed * (0.5 + Math.random()));
    setFileProgress(row, pct);
    if (pct < 100) setTimeout(tick, 180 + Math.random() * 160);
  };
  setTimeout(tick, 200);
}

/* ==========================================================================
   Validation
   ========================================================================== */

const SKIP_VALIDATION = '.fd-otp > input, .fd-search-input, .fd-tag-input-field:not([required]),[role="combobox"], [data-fd-skip], input[type="hidden"], input[type="submit"], input[type="button"], input[type="reset"], input[type="file"]';
const validatable = (el) => el instanceof HTMLElement && /^(input|select|textarea)$/i.test(el.tagName) && !el.matches(SKIP_VALIDATION) && !el.disabled && el.willValidate;
const labelOf = (el) => {
  const named = el.labels?.[0] ?? el.closest('.fd-field')?.querySelector('.fd-field-label');
  const first = named?.firstChild?.nodeType === 3 ? named.firstChild.textContent.trim() : '';
  const inner = named?.querySelector('.fd-checkbox-label, .fd-radio-label, .fd-field-name')?.textContent.trim();
  return first || inner || named?.textContent.replace(/\s+/g, ' ').trim() || el.name || 'This field';
};

function messageFor(el) {
  const v = el.validity;
  const d = el.dataset;
  const label = labelOf(el);
  if (v.customError) return el.validationMessage;
  if (v.valueMissing) return d.errorRequired || (el.type === 'checkbox' ? `Check “${label}” to continue.` : el.type === 'radio' ? 'Choose one option to continue.' : el.tagName === 'SELECT' ? `Choose ${label.toLowerCase()}.` : `${label} is required.`);
  if (v.typeMismatch) return d.errorType || (el.type === 'email' ? 'Enter a valid email address, like name@company.com.' : el.type === 'url' ? 'Enter a full URL that starts with https://.' : 'Enter a valid value.');
  if (v.patternMismatch) return d.errorPattern || el.title || 'Use the format shown in the hint.';
  if (v.tooShort) return d.errorShort || `${label} must be at least ${el.minLength} characters.`;
  if (v.tooLong) return `${label} must be at most ${el.maxLength} characters.`;
  if (v.rangeUnderflow) return `Enter ${el.min} or more.`;
  if (v.rangeOverflow) return `Enter ${el.max} or less.`;
  if (v.stepMismatch) return 'Enter a whole number.';
  if (v.badInput) return 'Enter a number.';
  return el.validationMessage || 'Check this value.';
}

function errorSlot(el) {
  const field = el.closest('.fd-field');
  if (!field) return null;
  let slot = $('.fd-field-error', field);
  if (!slot) {
    let anchor = el;
    while (anchor.parentElement && anchor.parentElement !== field) anchor = anchor.parentElement;
    anchor.insertAdjacentHTML('afterend', '<p class="fd-field-error" hidden></p>');
    slot = anchor.nextElementSibling;
  }
  ensureId(slot, 'fd-error');
  return slot;
}

/** Validate one control and render its error. Returns true when valid. */
export function validateControl(el) {
  if (!validatable(el)) return true;
  const ok = el.checkValidity();
  const group = el.type === 'radio' && el.form && el.name ? $$('input[type="radio"]', el.form).filter((r) => r.name === el.name) : [el];
  const field = el.closest('.fd-field');
  let slot = field ? $('.fd-field-error', field) : null;
  if (!slot && !ok) slot = errorSlot(el);
  group.forEach((control) => {
    if (ok) control.removeAttribute('aria-invalid'); else control.setAttribute('aria-invalid', 'true');
    if (slot) {
      const described = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      described.add(slot.id);
      control.setAttribute('aria-describedby', [...described].join(' '));
    }
  });
  if (slot) {
    if (ok) slot.hidden = true;
    else {
      const message = messageFor(el);
      if (slot.hidden || slot.dataset.message !== message) slot.innerHTML = `${icon('circle-alert', { size: 14 })}<span>${esc(message)}</span>`;
      slot.dataset.message = message;
      slot.hidden = false;
    }
  }
  return ok;
}

function validateForm(form) {
  const controls = $$('input, select, textarea', form).filter(validatable);
  const seen = new Set();
  const invalid = [];
  controls.forEach((control) => {
    control.dataset.touched = '';
    if (control.type === 'radio') { if (seen.has(control.name)) return; seen.add(control.name); }
    if (!validateControl(control)) invalid.push(control);
  });
  return invalid;
}


/* ==========================================================================
   Date field
   ========================================================================== */

const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** An ISO date for real calendar days only; null otherwise. */
function realDate(y, m, d) {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}` : null;
}

/** Read a typed date: 2026-11-18, 2026/11/18, Nov 18 2026, November 18, 2026, 18 Nov 2026. Returns "YYYY-MM-DD" or null. */
export function parseDateText(text) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t);
  if (m) return realDate(+m[1], +m[2], +m[3]);
  m = /^([a-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})$/i.exec(t);
  if (m && MONTH_NAMES.includes(m[1].slice(0, 3).toLowerCase())) return realDate(+m[3], MONTH_NAMES.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2]);
  m = /^(\d{1,2}) ([a-z]{3,9})\.?,? (\d{4})$/i.exec(t);
  if (m && MONTH_NAMES.includes(m[2].slice(0, 3).toLowerCase())) return realDate(+m[3], MONTH_NAMES.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, +m[1]);
  return null;
}

const dateLimit = (value) => (value === 'today' ? isoOf(new Date()) : /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : '');
const dateWords = (iso, el) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(el.closest('[lang]')?.lang || undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const dateInput = (field) => $('input:not([type="hidden"])', field);
const dateSent = new WeakMap();   // field -> the last value announced

/** What is wrong with the text in a date field, or '' when it is fine (an empty field is fine: `required` answers for it). */
export function dateProblem(field) {
  const input = dateInput(field);
  const text = input.value.trim();
  if (!text) return '';
  const iso = parseDateText(text);
  if (!iso) {
    const example = /^\d{4}-\d{2}-\d{2}$/.test(input.placeholder) ? input.placeholder : isoOf(new Date());
    return fdLabel(field, 'datefield.invalid', 'Enter a real date, like {example}.', { example });
  }
  const min = dateLimit(field.dataset.minDate);
  const max = dateLimit(field.dataset.maxDate);
  if (min && iso < min) return fdLabel(field, 'datefield.min', 'Pick {date} or later.', { date: dateWords(min, field) });
  if (max && iso > max) return fdLabel(field, 'datefield.max', 'Pick {date} or earlier.', { date: dateWords(max, field) });
  return '';
}

/**
 * Check a date field. `show` writes the error (and aria-invalid); without it a field already marked invalid is
 * re-checked and cleared once it is right. `commit` rewrites an accepted typed date as the ISO date.
 * Returns true when the field is valid.
 */
export function checkDateField(field, { show = false, commit = false } = {}) {
  const input = dateInput(field);
  if (!input) return true;
  const message = dateProblem(field);
  input.setCustomValidity(message);
  const iso = parseDateText(input.value);
  if (!message && iso && commit && input.value !== iso) input.value = iso;
  if (message && (show || input.hasAttribute('aria-invalid'))) {
    input.setAttribute('aria-invalid', 'true');
    setOwnError(field, input, message);
  } else if (!message) {
    input.removeAttribute('aria-invalid');
    setOwnError(field, input, null);
  }
  const value = message ? null : iso || '';
  if (value !== null && dateSent.get(field) !== value) {
    dateSent.set(field, value);
    emit(field, 'fd:change', { value, valid: true });
  }
  return !message;
}

function setupDateField(field) {
  const input = dateInput(field);
  if (!input || !once(field, 'datefield')) return;
  input.removeAttribute('pattern');   // the script reads more formats than the pattern does
  dateSent.set(field, parseDateText(input.value) || '');
  field.setAttribute('data-ready', '');
}

/* ==========================================================================
   Colour: swatch input and hex field with contrast feedback
   ========================================================================== */

/** "#14342b", "14342b", "#fff" → "#14342b" (lower case); null for anything else. */
export function normalizeHex(text) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(text ?? '').trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${hex.toLowerCase()}`;
}

let swatchContext;
/** A token's colour as the browser paints it now (theme, palette and accent included), as "#rrggbb". */
function tokenColor(host, token) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  host.append(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  swatchContext ??= document.createElement('canvas').getContext('2d');
  swatchContext.fillStyle = '#000000';
  swatchContext.fillStyle = computed;
  return swatchContext.fillStyle;
}

const hexInput = (root) => $('[data-fd-color-hex]', root);
const pickerInput = (root) => $('[data-fd-color-picker]', root);

/** The contrast rows of a colour: [{ key, name, ratio, level: pass|warn|fail, verdict }]. */
export function colorChecks(root, hex) {
  const against = [['page', '--fd-bg'], ['accent', '--fd-accent']];
  return against.map(([key, token]) => {
    const ratio = contrast(hex, tokenColor(root, token));
    const level = key === 'page' ? (ratio >= TEXT_MIN ? 'pass' : ratio >= FAINT_MIN ? 'warn' : 'fail') : (ratio >= FAINT_MIN ? 'pass' : 'fail');
    const words = {
      page: { pass: 'Readable as text', warn: 'Marks and large text only', fail: 'Too faint on the page' },
      accent: { pass: 'Distinct from the accent', fail: 'Too close to the accent' },
    }[key][level];
    const name = key === 'page' ? fdLabel(root, 'color.page', 'On the page') : fdLabel(root, 'color.accent', 'Against the accent');
    return { key, name, ratio, level, verdict: fdLabel(root, `color.${key}.${level}`, words) };
  });
}

const CHECK_ICON = { pass: 'circle-check', warn: 'triangle-alert', fail: 'circle-x' };

function renderColorFeedback(root) {
  const list = $('[data-fd-color-feedback]', root);
  if (!list) return;
  const hex = normalizeHex(hexInput(root).value);
  if (!hex) { list.replaceChildren(); list.hidden = true; return; }
  list.hidden = false;
  list.innerHTML = colorChecks(root, hex).map((c) => `<li class="fd-color-check" data-level="${c.level}">${icon(CHECK_ICON[c.level], { size: 14 })}<span class="fd-color-check-name">${esc(c.name)}</span><span class="fd-color-check-ratio">${c.ratio.toFixed(1)}:1</span><span class="fd-color-check-verdict">${esc(c.verdict)}</span></li>`).join('');
}

/** Write a colour into both inputs. Returns the normalised value, or null when the text is not a colour. */
function applyColor(root, text, { commit = false, show = false } = {}) {
  const hexField = hexInput(root);
  const picker = pickerInput(root);
  const hex = normalizeHex(text);
  const empty = !String(text).trim();
  const message = !hex && !empty ? fdLabel(root, 'color.invalid', 'Enter a hex colour, like {example}.', { example: normalizeHex(picker?.value) || '#14342b' }) : '';
  hexField.setCustomValidity(message);
  if (hex) {
    if (picker && picker.value !== hex) picker.value = hex;
    if (commit && hexField.value !== hex) hexField.value = hex;
  }
  if (message && (show || hexField.hasAttribute('aria-invalid'))) {
    hexField.setAttribute('aria-invalid', 'true');
    setOwnError(root, hexField, message);
  } else if (!message) {
    hexField.removeAttribute('aria-invalid');
    setOwnError(root, hexField, null);
  }
  renderColorFeedback(root);
  return hex;
}

function setupColor(root) {
  if (!hexInput(root) || !once(root, 'color')) return;
  const picker = pickerInput(root);
  picker?.removeAttribute('inert');
  root.setAttribute('data-ready', '');
  applyColor(root, hexInput(root).value);
}

let colorFrame = 0;
const remeasureColors = () => {
  cancelAnimationFrame(colorFrame);
  colorFrame = requestAnimationFrame(() => $$('[data-fd-color][data-ready]').forEach(renderColorFeedback));
};

/* ==========================================================================
   Confirm on the page
   ========================================================================== */

/** Where the typed text stands against the phrase: idle, partial (a start of it), mismatch (with the first wrong place) or match. */
export function confirmProgress(typed, phrase) {
  if (!typed) return { state: 'idle' };
  if (typed === phrase) return { state: 'match' };
  if (phrase.startsWith(typed)) return { state: 'partial' };
  let at = 0;
  while (at < typed.length && typed[at] === phrase[at]) at += 1;
  return { state: 'mismatch', at: at + 1 };
}

function updateConfirmInline(root) {
  const input = $('[data-fd-confirm-input]', root);
  const submit = $('[data-fd-confirm-submit]', root);
  const rule = $('[data-fd-confirm-rule]', root);
  if (!input) return false;
  const phrase = input.dataset.match ?? root.dataset.confirm ?? '';
  const typed = input.value.trim();
  const progress = phrase ? confirmProgress(typed, phrase) : { state: 'idle' };
  const matched = progress.state === 'match';
  if (submit) submit.disabled = !matched;
  if (root.dataset.state !== progress.state || progress.state === 'mismatch') {
    root.dataset.state = progress.state;
    if (rule) {
      rule.dataset.idle ??= rule.textContent.trim();
      const text = {
        idle: rule.dataset.idle,
        partial: fdLabel(root, 'confirm.partial', 'Matches so far.'),
        match: fdLabel(root, 'confirm.match', 'Matches. You can continue.'),
        mismatch: fdLabel(root, 'confirm.mismatch', 'Differs at character {n}. Case and dashes count.', { n: progress.at }),
      }[progress.state];
      const name = { match: 'circle-check', mismatch: 'circle-alert' }[progress.state];
      rule.innerHTML = `${name ? icon(name, { size: 14 }) : ''}<span>${esc(text)}</span>`;
    }
  }
  return matched;
}

function setupConfirmInline(root) {
  if (!once(root, 'confirm-inline')) return;
  root.setAttribute('data-ready', '');
  updateConfirmInline(root);
}

/* ==========================================================================
   Recovery codes
   ========================================================================== */

const codeValues = (root) => $$('.fd-codes-item:not([data-used])', root).map((item) => item.textContent.trim()).filter(Boolean);

function setupCodes(root) {
  if (!once(root, 'codes')) return;
  if (!$('[data-fd-codes-status]', root)) root.insertAdjacentHTML('beforeend', '<span class="fd-sr-only" data-fd-codes-status role="status"></span>');
  root.setAttribute('data-ready', '');
}

async function copyCodes(root, button) {
  const value = codeValues(root).join('\n');
  if (!(await copyText(value))) return;
  const status = $('[data-fd-codes-status]', root);
  if (status) status.textContent = fdLabel(root, 'copy.announce', 'Copied to clipboard');
  button.dataset.fdOriginal ??= button.innerHTML;
  button.dataset.state = 'copied';
  button.innerHTML = `${icon('check')}<span>${esc(fdLabel(root, 'copy.done', 'Copied'))}</span>`;
  later(button, 'copied', () => { delete button.dataset.state; button.innerHTML = button.dataset.fdOriginal; if (status) status.textContent = ''; }, 1600);
  emit(root, 'fd:copy', { value });
}

function downloadCodes(root) {
  const value = `${codeValues(root).join('\n')}\n`;
  const filename = root.dataset.filename || 'recovery-codes.txt';
  const url = URL.createObjectURL(new Blob([value], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  emit(root, 'fd:download', { filename, value });
}

/* ==========================================================================
   Unsaved changes
   ========================================================================== */

const snapshots = new WeakMap();
const snapshot = (form) => [...new FormData(form)].map(([key, value]) => `${key}=${typeof value === 'string' ? value : value.name}`).join('&');

function checkDirty(form) {
  const dirty = snapshot(form) !== snapshots.get(form);
  if (form.hasAttribute('data-dirty') === dirty) return;
  form.toggleAttribute('data-dirty', dirty);
  const bar = $('[data-fd-dirty-bar]', form) || $('.fd-form-actions[data-variant="sticky"]', form);
  if (bar) bar.hidden = !dirty;
  emit(form, 'fd:dirty', { dirty });
}

/** Take the current values as the saved baseline and hide the unsaved-changes bar. */
export function markClean(form) {
  snapshots.set(form, snapshot(form));
  form.removeAttribute('data-dirty');
  const bar = $('[data-fd-dirty-bar]', form) || $('.fd-form-actions[data-variant="sticky"]', form);
  if (bar) bar.hidden = true;
  emit(form, 'fd:dirty', { dirty: false });
}

function setupDirty(form) {
  if (!once(form, 'dirty')) return;
  snapshots.set(form, snapshot(form));
  const bar = $('[data-fd-dirty-bar]', form) || $('.fd-form-actions[data-variant="sticky"]', form);
  if (bar) bar.hidden = true;
}

/* ==========================================================================
   Init
   ========================================================================== */

const UPGRADE = 'input[data-fd-checkall], input[data-indeterminate], [data-fd-otp], .fd-checkbox-box, .fd-choice-mark, .fd-search-input, .fd-slider, .fd-number, .fd-otp, [data-fd-tag-input], [data-fd-pairs], .fd-codefield, [data-fd-combobox], [data-fd-secret], [data-fd-copy-field], .fd-copy-field, .fd-secret, textarea[data-fd-autogrow], .fd-field-counter, form[data-fd-validate], form[data-fd-dirty], [data-fd-datefield], [data-fd-color], [data-fd-confirm-inline], [data-fd-codes]';

function upgrade(root) {
  enhanceChecks(root);
  each(root, 'input[data-indeterminate]', (el) => { el.indeterminate = true; });
  enhanceSearch(root);
  each(root, '.fd-slider', setupSlider);
  each(root, '.fd-number', (el) => { if (once(el, 'number')) syncNumber(el); });
  each(root, '.fd-otp, [data-fd-otp]', setupOtp);
  each(root, '[data-fd-tag-input]', setupTagInput);
  each(root, '[data-fd-pairs]', setupPairs);
  each(root, '.fd-codefield', setupCodefield);
  each(root, '[data-fd-combobox]', setupCombobox);
  each(root, '.fd-secret, .fd-copy-field, [data-fd-secret], [data-fd-copy-field]', setupSecret);
  each(root, 'textarea[data-fd-autogrow]', autogrow);
  each(root, '.fd-field-counter', (counter) => { const control = counter.closest('.fd-field')?.querySelector('textarea, input'); if (control) updateCounter(control); });
  each(root, 'form[data-fd-validate]', (form) => { form.noValidate = true; });
  each(root, 'form[data-fd-dirty]', setupDirty);
  each(root, '[data-fd-datefield]', setupDateField);
  each(root, '[data-fd-color]', setupColor);
  each(root, '[data-fd-confirm-inline]', setupConfirmInline);
  each(root, '[data-fd-codes]', setupCodes);
  each(root, '.fd-checkbox > input[type="checkbox"][data-fd-checkall]', (parent) => {
    const children = $$(parent.dataset.fdCheckall).filter((el) => el !== parent);
    if (children.length) syncCheckAll(children[0]);
  });
}

let bound = false;

function bind() {
  if (bound) return;
  bound = true;

  /* Textarea, counters, number, otp, slider, search, dirty: input events */
  on(document, 'input', 'textarea[data-fd-autogrow]', (e, el) => autogrow(el));
  on(document, 'input', 'textarea, input', (e, el) => { if (el.closest('.fd-field')?.querySelector('.fd-field-counter')) updateCounter(el); });
  on(document, 'input', '.fd-slider > input[type="range"]', (e, input) => {
    const el = input.closest('.fd-slider');
    syncSlider(el);
    emit(el, 'fd:change', { value: Number(input.value) });
  });
  on(document, 'input', '.fd-number-input', (e, input) => {
    const el = input.closest('.fd-number');
    syncNumber(el);
    emit(el, 'fd:change', { value: input.value === '' ? null : Number(input.value) });
  });
  on(document, 'input', '.fd-search-input', (e, input) => emit(input.closest('.fd-search'), 'fd:change', { value: input.value }));

  /* Slider: drag state and tick clicks */
  on(document, 'pointerdown', '.fd-slider > input[type="range"]', (e, input) => input.closest('.fd-slider').setAttribute('data-dragging', ''));
  const endDrag = () => $$('.fd-slider[data-dragging]').forEach((el) => el.removeAttribute('data-dragging'));
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  on(document, 'click', '.fd-slider-ticks > *', (e, tick) => {
    const el = tick.closest('.fd-slider');
    const input = sliderInput(el);
    if (!input || input.disabled || tick.dataset.value === undefined) return;
    input.value = tick.dataset.value;
    fire(input, 'input');
    fire(input, 'change');
    input.focus({ preventScroll: true });
  });

  /* Search */
  on(document, 'click', '.fd-search-clear', (e, button) => { const input = $('.fd-search-input', button.closest('.fd-search')); if (input) clearSearch(input); });
  on(document, 'keydown', '.fd-search-input', (e, input) => { if (e.key === 'Escape' && input.value) { e.preventDefault(); clearSearch(input); } });
  document.addEventListener('keydown', hotkey);
  on(document, 'click', '.fd-search', (e, el) => { if (e.target === el) $('.fd-search-input', el)?.focus(); });

  /* Checkboxes */
  document.addEventListener('change', (e) => { if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') syncCheckAll(e.target); });

  /* Number steppers (pointer: step now and repeat while held; keyboard: click) */
  on(document, 'pointerdown', '[data-fd-step]', (e, button) => {
    if (e.button !== 0 || button.disabled) return;
    const el = button.closest('.fd-number');
    const direction = Number(button.dataset.fdStep) || 1;
    stopRepeat();
    stepNumber(el, direction);
    repeatDelay = setTimeout(() => {
      repeatTimer = setInterval(() => { if (button.disabled) stopRepeat(); else stepNumber(el, direction); }, 70);
    }, 420);
  });
  on(document, 'click', '[data-fd-step]', (e, button) => {
    if (e.detail !== 0) return;
    stepNumber(button.closest('.fd-number'), Number(button.dataset.fdStep) || 1);
  });
  ['pointerup', 'pointercancel', 'blur'].forEach((type) => window.addEventListener(type, stopRepeat));

  /* One-time code */
  // A form reset empties the boxes but leaves a hidden input as it was: bring the carried code back in line.
  document.addEventListener('reset', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    setTimeout(() => {
      $$('.fd-otp', form).forEach((el) => {
        const carrier = otpCarrier(el);
        if (carrier) carrier.value = otpValue(el);
        setOtpInvalid(el, false);
      });
      // Lists and pairs a server wrote as text areas go back to the values they were rendered with.
      $$('[data-fd-tag-input]', form).forEach(resetList);
      $$('[data-fd-pairs]', form).forEach(resetPairs);
      $$('.fd-codefield-input', form).forEach(resetCodefield);
    });
  });
  on(document, 'input', '.fd-otp > input', (e, input) => {
    const el = input.closest('.fd-otp');
    const inputs = otpInputs(el);
    const index = inputs.indexOf(input);
    let chars = otpClean(el, input.value);
    if (e.inputType === 'insertText' && e.data) chars = otpClean(el, e.data).slice(-1);
    setOtpInvalid(el, false);
    if (!chars) { input.value = ''; otpChanged(el); return; }
    input.value = '';
    otpFill(el, index, chars);
    otpChanged(el);
  });
  on(document, 'keydown', '.fd-otp > input', (e, input) => {
    const el = input.closest('.fd-otp');
    const inputs = otpInputs(el);
    const index = inputs.indexOf(input);
    const go = (i) => { const target = inputs[clamp(i, 0, inputs.length - 1)]; target.focus(); target.select(); };
    if (e.key === 'Backspace') {
      e.preventDefault();
      setOtpInvalid(el, false);
      if (input.value) input.value = '';
      else if (index > 0) { inputs[index - 1].value = ''; go(index - 1); }
      otpChanged(el);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      input.value = '';
      otpChanged(el);
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(inputs.length - 1); }
  });
  on(document, 'paste', '.fd-otp > input', (e, input) => {
    const el = input.closest('.fd-otp');
    const text = otpClean(el, e.clipboardData?.getData('text') ?? '');
    e.preventDefault();
    if (!text) return;
    setOtpInvalid(el, false);
    otpFill(el, otpInputs(el).indexOf(input), text);
    otpChanged(el);
  });
  on(document, 'focusin', '.fd-otp > input', (e, input) => {
    const inputs = otpInputs(input.closest('.fd-otp'));
    const firstEmpty = inputs.find((el) => !el.value);
    if (!input.value && firstEmpty && inputs.indexOf(firstEmpty) < inputs.indexOf(input)) { firstEmpty.focus(); return; }
    input.select();
  });

  /* Tag input */
  on(document, 'keydown', '.fd-tag-input-field', (e, field) => {
    const el = field.closest('[data-fd-tag-input]');
    if (!el || e.isComposing || field.readOnly) return;
    if (e.key === 'Enter' || e.key === ',') {
      if (field.value.trim()) { e.preventDefault(); addTags(el, [field.value]); field.value = ''; }
      else if (e.key === ',') e.preventDefault();
    } else if (e.key === 'Backspace' && !field.value) {
      const last = $$(':scope > .fd-token', el).pop();
      if (last) removeToken(last);
    }
  });
  on(document, 'input', '.fd-tag-input-field', (e, field) => {
    const el = field.closest('[data-fd-tag-input]');
    if (!el || !/[,;]/.test(field.value)) return;
    const parts = field.value.split(/[,;]/);
    field.value = parts.pop();
    addTags(el, parts);
  });
  on(document, 'paste', '.fd-tag-input-field', (e, field) => {
    const el = field.closest('[data-fd-tag-input]');
    const text = e.clipboardData?.getData('text') ?? '';
    if (!el || field.readOnly || !/[\n,;]/.test(text)) return;
    e.preventDefault();
    addTags(el, text.split(/[\n,;]/));
  });
  on(document, 'focusout', '[data-fd-tag-input] .fd-tag-input-field', (e, field) => {
    const el = field.closest('[data-fd-tag-input]');
    if (el.dataset.commitBlur !== 'false' && field.value.trim()) { addTags(el, [field.value]); field.value = ''; }
  });
  on(document, 'click', '.fd-token-remove', (e, button) => {
    const token = button.closest('.fd-token');
    const owner = token.closest('[data-fd-tag-input], [data-fd-combobox]');
    const field = $(':scope > .fd-tag-input-field', owner);
    if (field && (field.readOnly || field.disabled)) return;
    removeToken(token);
    $('input:not([type="hidden"])', owner)?.focus();
  });
  on(document, 'click', '[data-fd-tag-input]', (e, el) => { if (!e.target.closest('.fd-token')) $('.fd-tag-input-field', el)?.focus(); });

  /* Pairs */
  on(document, 'input', '.fd-pairs-row > input', (e, input) => syncPairs(input.closest('[data-fd-pairs]'), { notify: true }));
  on(document, 'keydown', '.fd-pairs-row > input', (e, input) => {
    const el = input.closest('[data-fd-pairs]');
    const row = input.parentElement;
    if (!el || e.isComposing || input.readOnly || input.disabled || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Enter' && input.matches('.fd-pairs-key')) {
      e.preventDefault();   // Enter moves to the value instead of posting a half-written pair
      rowValue(row).focus();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const next = addPairRow(el, row);
      syncPairs(el, { notify: true });
      rowKey(next).focus();
    } else if (e.key === 'Backspace' && input.matches('.fd-pairs-key') && !input.value && !rowValue(row).value) {
      const above = row.previousElementSibling?.matches('.fd-pairs-row') ? row.previousElementSibling : null;
      if (!above) return;
      e.preventDefault();
      row.remove();
      syncPairs(el, { notify: true });
      const target = rowValue(above);
      target.focus();
      target.setSelectionRange(target.value.length, target.value.length);
    }
  });
  on(document, 'click', '[data-fd-pairs-remove]', (e, button) => {
    const el = button.closest('[data-fd-pairs]');
    if (el && !button.disabled) removePairRow(el, button.closest('.fd-pairs-row'));
  });
  on(document, 'click', '[data-fd-pairs-add]', (e, button) => {
    const el = button.closest('[data-fd-pairs]');
    if (!el || button.disabled) return;
    const row = addPairRow(el);
    syncPairs(el, { notify: true });
    rowKey(row).focus();
  });

  /* Code field: Tab indents (Escape, then Tab, leaves), JSON is checked on blur, Format re-indents */
  on(document, 'keydown', '.fd-codefield-input', (e, area) => {
    if (e.key === 'Escape') { escaped.add(area); return; }
    if (e.key !== 'Tab') { if (e.key !== 'Shift') escaped.delete(area); return; }
    if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || area.readOnly || area.disabled || !area.closest('.fd-codefield[data-ready]')) return;
    if (escaped.has(area)) { escaped.delete(area); return; }   // let focus move on
    e.preventDefault();
    indentCode(area);
  });
  on(document, 'focusout', '.fd-codefield-input', (e, area) => {
    escaped.delete(area);
    if (area.closest('.fd-codefield[data-fd-json]')) checkJson(area);
  });
  on(document, 'input', '.fd-codefield[data-fd-json] > .fd-codefield-input', (e, area) => { if (ownErrors.has(area)) checkJson(area); });
  on(document, 'click', '[data-fd-codefield-format]', (e, button) => {
    const area = $(':scope > .fd-codefield-input', button.closest('.fd-codefield'));
    if (area) formatCode(area);
  });
  // Invalid JSON and a name used twice stop the form posting. This runs before form[data-fd-validate] so that
  // form's own pass sees the same errors.
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    const blocked = [
      ...$$('.fd-codefield[data-fd-json] > .fd-codefield-input', form).filter((area) => !area.disabled && !checkJson(area)),
      ...$$('[data-fd-pairs][data-invalid]', form).map((el) => $('.fd-pairs-key[aria-invalid="true"]', el)).filter((key) => key && !key.disabled),
    ];
    if (!blocked.length) return;
    e.preventDefault();
    blocked[0].focus();
  }, true);

  /* Combobox */
  on(document, 'keydown', '[data-fd-combobox] [role="combobox"], [data-fd-combobox] .fd-input-group > .fd-input', (e, input) => {
    const state = comboFor(input.closest('[data-fd-combobox]'));
    if (!state || e.isComposing) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); if (!state.open) openCombo(state); else moveActive(state, 1); break;
      case 'ArrowUp': e.preventDefault(); if (!state.open) openCombo(state, { activate: 'last' }); else moveActive(state, -1); break;
      case 'Enter':
        if (state.open) { e.preventDefault(); if (state.active) chooseOption(state, state.active); else closeCombo(state); }
        break;
      case 'Escape':
        if (state.open) { e.preventDefault(); e.stopPropagation(); closeCombo(state); }
        break;
      case 'Tab': closeCombo(state); break;
      case 'Backspace':
        if (state.multiple && !input.value && state.selected.size) {
          const last = [...state.selected.keys()].pop();
          state.selected.delete(last);
          commitCombo(state);
          emit(state.root, 'fd:change', { value: [...state.selected.keys()] });
        }
        break;
      default:
    }
  });
  on(document, 'input', '[data-fd-combobox] [role="combobox"]', (e, input) => {
    const state = comboFor(input.closest('[data-fd-combobox]'));
    if (!state) return;
    state.dirty = true;
    if (!state.open) openCombo(state, { activate: 'none' });
    filterOptions(state, input.value);
    setActive(state, visibleOptions(state)[0]);
  });
  on(document, 'click', '[data-fd-combobox] :is(.fd-input-group, .fd-tag-input)', (e, field) => {
    const state = comboFor(field.closest('[data-fd-combobox]'));
    if (!state || e.target.closest('.fd-token-remove, .fd-input-affix[data-kind="action"]')) return;
    const toggle = e.target.closest('[data-fd-combobox-toggle], .fd-input-affix[data-kind="chevron"]');
    if (toggle && state.open) { closeCombo(state); state.input.focus(); return; }
    state.input.focus();
    openCombo(state);
  });
  on(document, 'mousedown', '.fd-listbox .fd-option', (e) => e.preventDefault());
  on(document, 'mousedown', '[data-fd-combobox] :is(.fd-input-group, .fd-tag-input)', (e) => { if (!e.target.closest('input')) e.preventDefault(); });
  on(document, 'pointerdown', '[data-fd-combobox] .fd-listbox', (e, list) => { const state = comboFor(list.closest('[data-fd-combobox]')); if (state) state.pointerInList = true; });
  document.addEventListener('pointerup', () => {
    openCombos.forEach((state) => { if (state.pointerInList) { state.pointerInList = false; state.input.focus({ preventScroll: true }); } });
  });
  on(document, 'click', '[data-fd-combobox] .fd-option', (e, option) => {
    const state = comboFor(option.closest('[data-fd-combobox]'));
    if (state) chooseOption(state, option);
  });
  on(document, 'mousemove', '[data-fd-combobox] .fd-option', (e, option) => {
    const state = comboFor(option.closest('[data-fd-combobox]'));
    if (state && state.active !== option && option.getAttribute('aria-disabled') !== 'true') setActive(state, option);
  });
  document.addEventListener('pointerdown', (e) => {
    openCombos.forEach((state) => { if (!state.root.contains(e.target)) closeCombo(state); });
  }, true);
  on(document, 'focusout', '[data-fd-combobox]', (e, root) => {
    const state = comboFor(root);
    if (!state || state.pointerInList) return;
    if (!e.relatedTarget || !root.contains(e.relatedTarget)) closeCombo(state);
  });

  /* Secret and copy field */
  // A typed secret goes back under its mask when its form is sent or reset, so the browser and any password
  // manager see a password field.
  const maskEntries = (e) => {
    if (!(e.target instanceof HTMLFormElement)) return;
    $$('.fd-secret[data-mode="entry"][data-state="revealed"]', e.target).forEach((el) => { el.dataset.state = 'masked'; renderEntry(el); });
  };
  document.addEventListener('submit', (e) => { if (!e.defaultPrevented) maskEntries(e); });
  document.addEventListener('reset', maskEntries);
  on(document, 'click', '[data-fd-field-action]', (e, button) => {
    const el = button.closest('.fd-secret, .fd-copy-field, [data-fd-secret], [data-fd-copy-field]');
    if (!el) return;
    const action = button.dataset.fdFieldAction;
    if (isEntry(el) && action !== 'reveal') return;   // an entry field has nothing to copy or rotate
    if (action === 'reveal') {
      el.dataset.state = el.dataset.state === 'revealed' ? 'masked' : 'revealed';
      renderSecret(el);
    } else if (action === 'copy') {
      copySecret(el, button);
    } else if (action === 'rotate') {
      if (!reducedMotion()) button.querySelector('svg')?.animate({ rotate: ['0deg', '360deg'] }, { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      emit(el, 'fd:rotate', {});
    }
  });

  /* Dropzone */
  const overZone = (e) => (e.target instanceof Element ? e.target.closest('[data-fd-dropzone]') : null);
  const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  document.addEventListener('dragenter', (e) => { const zone = overZone(e); if (zone && hasFiles(e) && zone.getAttribute('aria-disabled') !== 'true') { e.preventDefault(); zone.dataset.state = 'dragover'; } });
  document.addEventListener('dragover', (e) => {
    const zone = overZone(e);
    if (!zone || !hasFiles(e) || zone.getAttribute('aria-disabled') === 'true') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    zone.dataset.state = 'dragover';
  });
  document.addEventListener('dragleave', (e) => {
    const zone = overZone(e);
    if (zone && !zone.contains(e.relatedTarget) && zone.dataset.state === 'dragover') delete zone.dataset.state;
  });
  document.addEventListener('drop', (e) => {
    const zone = overZone(e);
    if (!zone || !hasFiles(e)) return;
    e.preventDefault();
    if (zone.dataset.state === 'dragover') delete zone.dataset.state;
    if (zone.getAttribute('aria-disabled') !== 'true') addFiles(zone, e.dataTransfer.files);
  });
  on(document, 'change', '[data-fd-dropzone] input[type="file"]', (e, input) => {
    addFiles(input.closest('[data-fd-dropzone]'), input.files);
    input.value = '';
  });
  on(document, 'click', '[data-fd-dropzone][aria-disabled="true"]', (e) => e.preventDefault());
  on(document, 'click', '[data-fd-file-pick]', (e, button) => {
    const zone = button.closest('[data-fd-dropzone]');
    if (!zone || button.disabled || zone.getAttribute('aria-disabled') === 'true') return;
    $('input[type="file"]', zone)?.click();
  });
  on(document, 'click', '[data-fd-file-clear]', (e, button) => {
    const zone = button.closest('[data-fd-dropzone]');
    if (zone && !button.disabled && zone.getAttribute('aria-disabled') !== 'true') clearLogo(zone);
  });
  on(document, 'click', '[data-fd-file-remove]', (e, button) => {
    const row = button.closest('.fd-file');
    const list = row.parentElement;
    row.remove();
    emit(list, 'fd:change', { value: [...list.children].map((el) => el.fdFile).filter(Boolean) });
  });


  /* Date field */
  const dateFieldOf = (el) => (el instanceof Element ? el.closest('[data-fd-datefield]') : null);
  const isDateInput = (el) => { const f = dateFieldOf(el); return !!f && el === dateInput(f); };
  document.addEventListener('input', (e) => { const f = isDateInput(e.target) && dateFieldOf(e.target); if (f) checkDateField(f, { show: false }); });
  document.addEventListener('change', (e) => { const f = isDateInput(e.target) && dateFieldOf(e.target); if (f) checkDateField(f, { show: true, commit: true }); });
  document.addEventListener('keydown', (e) => {
    const f = isDateInput(e.target) && dateFieldOf(e.target);
    if (!f || e.key !== 'ArrowDown' || !f.hasAttribute('data-ready')) return;
    const opener = $('[data-fd-popover]', f);
    if (!opener) return;
    e.preventDefault();
    if (opener.getAttribute('aria-expanded') !== 'true') opener.click();
  });
  document.addEventListener('submit', (e) => {
    if (!(e.target instanceof HTMLFormElement)) return;
    const bad = $$('[data-fd-datefield][data-ready]', e.target).filter((f) => !checkDateField(f, { show: true, commit: true }));
    if (bad.length) { e.preventDefault(); dateInput(bad[0]).focus(); }
  }, true);

  /* Colour */
  document.addEventListener('input', (e) => {
    const root = e.target instanceof Element ? e.target.closest('[data-fd-color]') : null;
    if (!root || !root.hasAttribute('data-ready')) return;
    if (e.target.matches('[data-fd-color-picker]')) {
      const hexField = hexInput(root);
      hexField.value = e.target.value;
      applyColor(root, e.target.value);
      hexField.dispatchEvent(new Event('input', { bubbles: true }));   // the hex field's handler announces the change
    } else if (e.target.matches('[data-fd-color-hex]')) {
      const hex = applyColor(root, e.target.value);
      if (hex) emit(root, 'fd:change', { value: hex, valid: true });
    }
  });
  document.addEventListener('change', (e) => {
    const root = e.target instanceof Element && e.target.matches('[data-fd-color-hex]') ? e.target.closest('[data-fd-color]') : null;
    if (!root || !root.hasAttribute('data-ready')) return;
    const hex = applyColor(root, e.target.value, { commit: true, show: true });
    if (!hex && e.target.value.trim()) emit(root, 'fd:change', { value: e.target.value.trim(), valid: false });
  });
  document.addEventListener('submit', (e) => {
    if (!(e.target instanceof HTMLFormElement)) return;
    const bad = $$('[data-fd-color][data-ready]', e.target).filter((root) => !applyColor(root, hexInput(root).value, { commit: true, show: true }) && hexInput(root).value.trim());
    if (bad.length) { e.preventDefault(); hexInput(bad[0]).focus(); }
  }, true);
  document.documentElement.addEventListener('fd:theme', remeasureColors);
  document.documentElement.addEventListener('fd:accent', remeasureColors);
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(remeasureColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette', 'data-accent', 'data-contrast', 'class'] });
  }

  /* Confirm on the page */
  on(document, 'input', '[data-fd-confirm-inline] [data-fd-confirm-input]', (e, input) => updateConfirmInline(input.closest('[data-fd-confirm-inline]')));
  document.addEventListener('submit', (e) => {
    const root = e.target instanceof Element && e.target.matches('[data-fd-confirm-inline]') ? e.target : null;
    if (root && root.hasAttribute('data-ready') && !updateConfirmInline(root)) { e.preventDefault(); $('[data-fd-confirm-input]', root)?.focus(); }
  }, true);

  /* Disabled with a reason: an aria-disabled control stays reachable and does nothing */
  document.addEventListener('click', (e) => {
    const off = e.target instanceof Element ? e.target.closest('.fd-reason [aria-disabled="true"]') : null;
    if (off) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* Recovery codes */
  on(document, 'click', '[data-fd-codes-copy]', (e, button) => { const root = button.closest('[data-fd-codes]'); if (root) copyCodes(root, button); });
  on(document, 'click', '[data-fd-codes-download]', (e, button) => { const root = button.closest('[data-fd-codes]'); if (root) downloadCodes(root); });

  /* Validation */
  on(document, 'focusout', 'form[data-fd-validate] :is(input, select, textarea)', (e, control) => {
    if (!validatable(control)) return;
    control.dataset.touched = '';
    validateControl(control);
  });
  const revalidate = (e, control) => { if (validatable(control) && ('touched' in control.dataset || control.hasAttribute('aria-invalid'))) validateControl(control); };
  on(document, 'input', 'form[data-fd-validate] :is(input, select, textarea)', revalidate);
  on(document, 'change', 'form[data-fd-validate] :is(input, select, textarea)', revalidate);
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-fd-validate')) return;
    const invalid = validateForm(form);
    if (invalid.length) {
      e.preventDefault();
      invalid[0].focus();
      emit(form, 'fd:invalid', { fields: invalid });
    } else if (!e.defaultPrevented) emit(form, 'fd:valid', {});   // a code field or pairs editor may have stopped it
  }, true);
  document.addEventListener('reset', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.hasAttribute('data-fd-validate')) {
      $$('.fd-field-error', form).forEach((slot) => { slot.hidden = true; });
      $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
      $$('input, select, textarea', form).forEach((el) => { delete el.dataset.touched; });
    }
    setTimeout(() => {
      $$('[data-fd-datefield][data-ready]', form).forEach((f) => checkDateField(f));
      $$('[data-fd-color][data-ready]', form).forEach((root) => applyColor(root, hexInput(root).value));
      $$('[data-fd-confirm-inline][data-ready]', form).forEach(updateConfirmInline);
      if (form.matches('[data-fd-confirm-inline][data-ready]')) updateConfirmInline(form);
      $$('.fd-slider', form).forEach(syncSlider);
      $$('.fd-number', form).forEach(syncNumber);
      $$('textarea[data-fd-autogrow]', form).forEach(autogrow);
      $$('.fd-field-counter', form).forEach((counter) => { const control = counter.closest('.fd-field')?.querySelector('textarea, input'); if (control) updateCounter(control); });
      if (form.hasAttribute('data-fd-dirty')) checkDirty(form);
    }, 0);
  });

  /* Unsaved changes */
  const dirtyCheck = (e) => {
    const form = e.target instanceof Element ? e.target.closest('form[data-fd-dirty]') : null;
    if (form) checkDirty(form);
  };
  document.addEventListener('input', dirtyCheck);
  document.addEventListener('change', dirtyCheck);
  document.addEventListener('fd:change', dirtyCheck);

  /* Layout shifts that change textarea wrapping */
  let resizeFrame = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => $$('textarea[data-fd-autogrow]').forEach(autogrow));
  }, { passive: true });
  document.fonts?.ready.then(() => $$('textarea[data-fd-autogrow]').forEach(autogrow));

  /* Markup inserted later */
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (node.matches(UPGRADE) || node.querySelector(UPGRADE))) upgrade(node);
        });
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
}

export function init(root = document) {
  bind();
  upgrade(root);
}
