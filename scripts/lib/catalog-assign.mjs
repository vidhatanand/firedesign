// Judgement calls of the catalogue build, in one place so a reviewer can read them.
// VOCABULARY.md names the components; the CSS defines more classes than it lists. Everything the build could not
// place by the rules (a class belongs to the component whose root is its longest dash-boundary prefix) is placed here.
// A class that fits nowhere is a build error, so a new class in the CSS forces a decision in this file.

/** Components the vocabulary does not list, whose root class the CSS defines: root -> family. */
export const EXTRA_ROOTS = {
  'fd-accent-text': 'Base',            // text tone utilities: accent, danger, success, warning
  'fd-agent': 'Agent',                 // the agent page layout (dock, main, side, top)
  'fd-announce': 'Content',            // announcement strip with art and actions
  'fd-approval-bar': 'Agent',
  'fd-calendar': 'Overlays',           // month grid drawn by the date range
  'fd-checklist': 'Overlays',          // the filter list's checklist
  'fd-context-meter': 'Agent',
  'fd-codes': 'Forms',                 // one-time recovery codes in a sunken card
  'fd-color': 'Forms',                 // colour control: native picker, hex box, contrast feedback
  'fd-confirm-inline': 'Forms',        // type-to-confirm on the page, in a plain form (the dialog is fd-confirm)
  'fd-corners': 'Texture & loading',   // four marks on a wrapper's corners
  'fd-datefield': 'Forms',             // one date, typed or picked
  'fd-daterange': 'Overlays',
  'fd-data-card': 'Data',
  'fd-feature-row': 'Content',
  'fd-file': 'Forms',                  // an uploaded file row (fd-filelist is its list)
  'fd-filters': 'Data',                 // the combined filter: one button, a menu of fields, chips (0.8)
  'fd-glyph': 'Texture & loading',
  'fd-initial': 'Shell',               // a dot-matrix mark drawn from a name's first letter
  'fd-list-detail': 'Data',           // a list beside the record it opens (one pane at a time on a phone)
  'fd-listbox': 'Forms',
  'fd-matrix': 'Forms',                // a table of switches
  'fd-model-menu': 'Agent',
  'fd-noise': 'Texture & loading',
  'fd-notification': 'Overlays',
  'fd-option': 'Forms',                // an option row (fd-options is its list)
  'fd-pagebar': 'Texture & loading',
  'fd-pending': 'Texture & loading',
  'fd-period': 'Overlays',             // the trigger of a date range with a compare band
  'fd-pick': 'Overlays',               // pickable object card
  'fd-reason': 'Forms',                // a disabled control and the reason it is off
  'fd-result': 'Agent',
  'fd-running': 'Shell',               // the running-now pill and its popover list
  'fd-scroller': 'Content',
  'fd-service-status': 'Shell',        // the top bar's service status
  'fd-shortcuts': 'Shell',             // the shortcut sheet's list
  'fd-swatch': 'Forms',                // a colour that is content
  'fd-tabbar': 'Shell',                // the phone tab bar
  'fd-tooltip': 'Overlays',            // the vocabulary lists it only as the part of data-fd-tooltip
  'fd-usage-chip': 'Agent',
  'fd-use-agent': 'Agent',
  'fd-viewswitch': 'Code',
  // Decisions (content.css, docs/decisions.html): the brief, its parts and the patterns around them
  'fd-decision': 'Content',
  'fd-delta': 'Content',
  'fd-draft': 'Content',
  'fd-commit': 'Content',
  'fd-impact': 'Content',
  'fd-hold': 'Content',
  'fd-preview': 'Content',             // pattern: change, see what it touches, then commit
  'fd-queue': 'Content',               // pattern: the list of what waits, beside the case
  'fd-states': 'Content',              // pattern: one set of page states for a screen or a section
  // Website (site.css, docs/site.html and docs/site-sections.html): the foundation and the fourteen section types
  'fd-site': 'Website',                // the shell of a public page: a size container every section measures
  'fd-site-container': 'Website',
  'fd-site-head': 'Website',
  'fd-site-header': 'Website',
  'fd-site-hero': 'Website',
  'fd-site-logos': 'Website',
  'fd-site-features': 'Website',
  'fd-site-split': 'Website',
  'fd-site-stats': 'Website',
  'fd-site-steps': 'Website',
  'fd-site-quote': 'Website',
  'fd-site-pricing': 'Website',
  'fd-site-compare': 'Website',
  'fd-site-faq': 'Website',
  'fd-site-cta': 'Website',
  'fd-site-footer': 'Website',
  'fd-site-posts': 'Website',
  'fd-site-article': 'Website',        // 0.8: the reading page of a post, a report or a research paper
  'fd-site-media': 'Website',          // 0.8: a picture in a section (a part used inside sections: kind component)
};

/** Classes (and their dash-descendants) that are parts of another component: class -> root of the component.
 *  A key that the vocabulary lists as a root (fd-stat) stops being a component and joins the named one. */
export const PART_OF = {
  'fd-danger-text': 'fd-accent-text',
  'fd-success-text': 'fd-accent-text',
  'fd-warning-text': 'fd-accent-text',
  'fd-bars-loader': 'fd-spinner',      // a loader (skeleton.css, texture.js), not the bars chart its prefix suggests
  'fd-check-dash': 'fd-checkbox',
  'fd-check-tick': 'fd-checkbox',
  'fd-clamp-2': 'fd-truncate',
  'fd-clamp-3': 'fd-truncate',
  'fd-copied-label': 'fd-codeblock',
  'fd-crosshair': 'fd-frame',          // the frame's registration marks
  'fd-fade': 'fd-rise',                // entrance animations
  'fd-filelist': 'fd-file',
  'fd-free-runs': 'fd-usage-chip',
  'fd-keys-hint': 'fd-shortcuts',      // the status line while a key sequence waits
  'fd-num': 'fd-mono',                 // tabular figures
  'fd-options': 'fd-option',
  'fd-overlay-count': 'fd-popover',    // count badge on a trigger
  'fd-quadrant': 'fd-chart',           // the quadrant is a type of chart (data-fd-chart="quadrant"), drawn into an fd-chart
  'fd-rail-tip': 'fd-sidebar',         // the collapsed sidebar's tip
  'fd-spin': 'fd-spinner',
  'fd-stat': 'fd-stats',               // the figure and its row, delta and unit belong to the stats block
  'fd-stop-btn': 'fd-composer',
  'fd-syntax-comment': 'fd-codeblock',
  'fd-syntax-fn': 'fd-codeblock',
  'fd-syntax-key': 'fd-codeblock',
  'fd-syntax-keyword': 'fd-codeblock',
  'fd-syntax-number': 'fd-codeblock',
  'fd-syntax-plain': 'fd-codeblock',
  'fd-syntax-punct': 'fd-codeblock',
  'fd-syntax-string': 'fd-codeblock',
  'fd-text-2': 'fd-muted',
  'fd-toaster': 'fd-toast',
  'fd-token': 'fd-tag-input',
  'fd-site-eyebrow': 'fd-site-head',  // the head's small label
  'fd-site-points': 'fd-site-split',  // the ruled points list that goes with a split
  'fd-site-authors': 'fd-site-article',  // 0.8: an article's byline (also used in a posts entry's meta line)
  'fd-site-notes': 'fd-site-article',    // 0.8: footnotes and their references in the text
  'fd-site-refs': 'fd-site-article',     // 0.8: the reference list
};

/** Component ids that differ from the root class without its `fd-` (the vocabulary says Buttons, the class is btn). */
export const ID_ALIASES = { 'fd-btn': 'button' };

/** Kind of a component. Default: `layout` in the Layout family, otherwise `component`. */
export const PATTERNS = new Set(['fd-agent', 'fd-form-section', 'fd-screen', 'fd-playground', 'fd-preview', 'fd-queue', 'fd-states', 'fd-site', 'fd-site-container', 'fd-site-head']);

/** Families whose roots are website sections (kind `section`), except the roots that are PATTERNS (the foundation). */
export const SECTION_FAMILIES = new Set(['Website']);
/** Roots in a section family that are parts used inside sections, not sections (kind `component`). */
export const SECTION_PARTS = new Set(['fd-site-media']);

/** Single-root components whose readable name is not the id in title case. */
export const NAMES = { 'fd-site-media': 'Site picture', 'fd-filters': 'Combined filter', 'fd-list-detail': 'List and detail', 'fd-tag-input': 'Tag input', 'fd-secret': 'Secret', 'fd-codeblock': 'Code block', 'fd-json': 'JSON viewer', 'fd-otp': 'One-time code', 'fd-qr': 'QR code', 'fd-decision': 'Decision brief', 'fd-draft': 'Drafted text', 'fd-commit': 'Reason and commit', 'fd-hold': 'Held action', 'fd-preview': 'Preview then commit', 'fd-queue': 'Decision queue', 'fd-states': 'Page states', 'fd-site': 'Site', 'fd-site-container': 'Site container', 'fd-site-head': 'Section head', 'fd-site-header': 'Site header', 'fd-site-hero': 'Hero', 'fd-site-logos': 'Logo strip', 'fd-site-features': 'Features section', 'fd-site-split': 'Split section', 'fd-site-stats': 'Stats section', 'fd-site-steps': 'Steps section', 'fd-site-quote': 'Quote section', 'fd-site-pricing': 'Pricing section', 'fd-site-compare': 'Comparison section', 'fd-site-faq': 'FAQ section', 'fd-site-cta': 'Call to action', 'fd-site-footer': 'Site footer', 'fd-site-posts': 'Posts section', 'fd-site-article': 'Article', 'fd-tag-input': 'Tag input', 'fd-secret': 'Secret', 'fd-codeblock': 'Code block', 'fd-json': 'JSON viewer', 'fd-otp': 'One-time code', 'fd-qr': 'QR code' };

/** Documentation pages that specimen each family (a docs anchor is chosen from these first). */
export const FAMILY_PAGES = {
  Base: ['foundations.html', 'writing.html'],
  Buttons: ['buttons.html'],
  Shell: ['shell.html'],
  Navigation: ['navigation.html'],
  Forms: ['forms.html'],
  Overlays: ['overlays.html'],
  Data: ['data.html'],
  Content: ['content.html', 'decisions.html'],
  Code: ['code.html'],
  Agent: ['agent.html'],
  Chat: ['chat.html'],
  Charts: ['charts.html'],
  'Texture & loading': ['skeletons.html', 'signature.html'],
  Documentation: ['documentation.html'],
  Tweaks: ['tweaks.html'],
  Layout: ['foundations.html', 'shell.html'],
  Website: ['site.html', 'site-sections.html'],
};

/** The behaviour module whose header documents the events of a family. */
export const FAMILY_MODULES = {
  Agent: ['agent'], Chat: ['chat'], Charts: ['charts'], Code: ['code'], Content: ['content'], Data: ['data', 'filters'],
  Documentation: ['docsite'], Forms: ['forms'], Navigation: ['nav'], Overlays: ['overlays'], Shell: ['shell'],
  'Texture & loading': ['texture'], Tweaks: ['tweaks'], Website: ['site'],
};

/** Events a header documents without naming a class, tied to a component by a word in the statement
 *  (forms.js: "fd:change ... combobox, tag input, otp ..."). Module -> { words: { word: root class } }. */
export const EVENT_SUBJECTS = {
  data: { words: { table: 'fd-table', tr: 'fd-table' } },
  forms: { words: { combobox: 'fd-combobox', 'tag input': 'fd-tag-input', otp: 'fd-otp', number: 'fd-number', slider: 'fd-slider', search: 'fd-search', dropzone: 'fd-dropzone', secret: 'fd-secret', 'copy field': 'fd-copy-field', 'date field': 'fd-datefield', 'colour': 'fd-color', 'confirm on the page': 'fd-confirm-inline', 'recovery codes': 'fd-codes' } },
};

/** Events that module headers document in prose the heuristics above cannot tie to a class. Reviewed by hand
 *  against fire/js/overlays.js and fire/js/data.js headers; component id -> events. */
export const EVENT_EXTRA = {
  menu: ['fd:change'],
  dialog: ['fd:change'],
  sheet: ['fd:open', 'fd:close', 'fd:change'],
  confirm: ['fd:confirm'],
  'date-picker': ['fd:change'],
  filter: ['fd:change'],
  commit: ['fd:hold'],                 // content.js: "fd:hold fires on the fd-commit" (the line names the fd-hold it starts)
  hold: ['fd:commit'],                 // content.js: a standalone hold fires fd:commit on itself when it runs out
  toast: ['fd:hold', 'fd:undo', 'fd:commit'],   // overlays.js: a held toast, and Done · Undo
};

/** Events a module listens for; they are not events of any component. */
export const LISTENED_EVENTS = new Set(['fd:theme', 'fd:accent']);

/** Element tag name -> component id, where the tag is not one of the component's classes. */
export const ELEMENT_COMPONENT = { 'fd-texture': 'texture', 'fd-code': 'codeblock', 'fd-chart': 'chart', 'fd-icon': 'icon' };

/**
 * What a person or an agent picks as a whole. `root` is the component's main class (it must exist in the CSS); every
 * name in `members` is a root or class that joins it, with its parts. Anything not named stays one component per root.
 */
export const GROUPS = [
  // Base
  { id: 'type', name: 'Type', family: 'Base', root: 'fd-display', members: ['fd-h1', 'fd-h2', 'fd-h3', 'fd-title', 'fd-label', 'fd-body', 'fd-small', 'fd-caption', 'fd-eyebrow', 'fd-mono', 'fd-mono-sm'] },
  { id: 'text', name: 'Text', family: 'Base', root: 'fd-muted', members: ['fd-accent-text', 'fd-faint', 'fd-link', 'fd-truncate'] },
  { id: 'inline-code', name: 'Inline code', family: 'Base', root: 'fd-code', members: ['fd-kbd'] },
  { id: 'utilities', name: 'Utilities', family: 'Base', root: 'fd-sr-only', members: ['fd-cq', 'fd-rise'] },
  // Shell
  { id: 'app', name: 'App', family: 'Shell', root: 'fd-app', members: ['fd-main'] },
  { id: 'sidebar', name: 'Sidebar', family: 'Shell', root: 'fd-sidebar', members: ['fd-sidebar-head', 'fd-sidebar-body', 'fd-sidebar-foot', 'fd-nav', 'fd-nav-group', 'fd-nav-item', 'fd-nav-label', 'fd-nav-badge', 'fd-team-switch', 'fd-account', 'fd-usage-card'] },
  { id: 'brand', name: 'Brand', family: 'Shell', root: 'fd-brand', members: ['fd-wordmark'] },
  { id: 'page', name: 'Page', family: 'Shell', root: 'fd-page', members: ['fd-band', 'fd-frame'] },
  // Forms
  { id: 'form', name: 'Form', family: 'Forms', root: 'fd-form', members: ['fd-form-cols', 'fd-form-row', 'fd-form-actions'] },
  { id: 'listbox', name: 'Listbox', family: 'Forms', root: 'fd-listbox', members: ['fd-option'] },
  { id: 'file-upload', name: 'File upload', family: 'Forms', root: 'fd-dropzone', members: ['fd-file'] },
  // Chat
  { id: 'chat', name: 'Chat', family: 'Chat', root: 'fd-chat', members: ['fd-chat-panel', 'fd-chat-head', 'fd-chat-body', 'fd-chat-foot', 'fd-chat-view', 'fd-chat-home', 'fd-chat-history', 'fd-chat-banner', 'fd-chat-offline', 'fd-chat-drop', 'fd-chat-jump', 'fd-chat-teaser', 'fd-chat-log'] },
  { id: 'chat-launcher', name: 'Chat launcher', family: 'Chat', root: 'fd-chat-launcher', members: ['fd-chat-pill'] },
  { id: 'chat-message', name: 'Chat message', family: 'Chat', root: 'fd-chat-msg', members: ['fd-chat-block', 'fd-chat-reaction', 'fd-chat-receipt', 'fd-chat-typing'] },
  { id: 'chat-lightbox', name: 'Chat lightbox', family: 'Chat', root: 'fd-chat-lightbox', members: [] },
  // Agent
  { id: 'composer', name: 'Composer', family: 'Agent', root: 'fd-composer', members: ['fd-composer-tools', 'fd-model-chip', 'fd-model-menu', 'fd-context-meter', 'fd-usage-chip'] },
  { id: 'message', name: 'Message', family: 'Agent', root: 'fd-message', members: ['fd-cursor'] },
  // Documentation
  { id: 'doc', name: 'Documentation page', family: 'Documentation', root: 'fd-doc', members: ['fd-doc-head', 'fd-doc-foot', 'fd-doc-footer', 'fd-doc-panel', 'fd-doc-hero', 'fd-doc-tabs', 'fd-doc-pager'] },
  { id: 'doc-endpoint', name: 'API reference', family: 'Documentation', root: 'fd-doc-endpoint', members: ['fd-doc-api', 'fd-doc-params', 'fd-doc-response', 'fd-doc-try'] },
  { id: 'doc-setup', name: 'Setup steps', family: 'Documentation', root: 'fd-doc-setup', members: ['fd-doc-steps'] },
  // Content, Overlays, Texture & loading, Data, Charts, Buttons, Tweaks
  { id: 'feature-list', name: 'Feature list', family: 'Content', root: 'fd-feature-list', members: ['fd-feature-row'] },
  { id: 'date-picker', name: 'Date picker', family: 'Overlays', root: 'fd-daterange', members: ['fd-calendar', 'fd-pick'] },
  { id: 'texture', name: 'Texture', family: 'Texture & loading', root: 'fd-ascii', members: ['fd-corners', 'fd-dotgrid', 'fd-noise', 'fd-glyph'] },
  { id: 'loader', name: 'Loader', family: 'Texture & loading', root: 'fd-spinner', members: ['fd-braille', 'fd-dots', 'fd-pending'] },
  { id: 'skeleton', name: 'Skeleton', family: 'Texture & loading', root: 'fd-skeleton', members: ['fd-shimmer'] },
  { id: 'table', name: 'Table', family: 'Data', root: 'fd-table', members: ['fd-table-foot'] },
  { id: 'filter', name: 'Filter', family: 'Data', root: 'fd-filter', members: ['fd-filter-bar'] },
  { id: 'chart', name: 'Chart', family: 'Charts', root: 'fd-chart', members: ['fd-chart-tooltip'] },
  { id: 'button', name: 'Button', family: 'Buttons', root: 'fd-btn', members: ['fd-btn-group', 'fd-btn-text'] },
  { id: 'tweaks', name: 'Tweaks', family: 'Tweaks', root: 'fd-tweaks', members: ['fd-tweaks-launcher'] },
];
/** Names the Base and Layout lines both list: they belong to Layout (the later line names them as the primitives). */
export const LAYOUT_PRIMITIVES = ['fd-stack', 'fd-row', 'fd-grid', 'fd-column', 'fd-grow'];

/** Attributes whose value is free (a number, a name, text, an id): the single value "*" means any value. component id -> attributes. */
export const FREE_ATTRIBUTES = {
  codes: ['data-filename'],            // the name of the downloaded file ("ember-recovery-codes.txt")
  'confirm-inline': ['data-confirm'],  // the phrase to type (the form's data-confirm; the input may carry data-match)
  datefield: ['data-min-date', 'data-max-date'], // an ISO date or "today" (forms.js header)
  'date-picker': ['data-compare'],     // starting comparison of a period: none, previous or year
  codeblock: ['data-collapse'],        // collapsed height in px: "200", "240", "420" (code.js header)
  doc: ['data-doc-hide'],              // docs-site breakpoints to hide at, space-separated ("md sm")
  kv: ['data-copy'],                   // the text a row copies
  list: ['data-value'],                // a row's record id: the option a listbox list selects, the record a list-and-detail row opens
  menu: ['data-fd-submenu', 'data-fd-when', 'data-fd-unless', 'data-value'], // the id of the sub-menu; the words an item needs, or must not find, in a row's data-fd-flags (overlays.js header); an item's value (overlays.js: data-value="7d"; filters.js: a value to filter by)
  'doc-frame': ['data-fd-src', 'data-fd-hosts', 'data-fd-alt'], // a picture frame's address, the hosts besides the page's that may serve it, its description (docsite.js header)
  pipeline: ['data-when'],             // the condition of a conditional stage (data.js header shows "failure")
  running: ['data-fd-running'],        // the id of the popover whose rows the pill counts
  secret: ['data-noun'],               // the word the buttons name: "password", "API key", "signing secret"
  steps: ['data-current'],             // the 0-based index of the current step (nav.js header: data-current="n")
  'doc-endpoint': ['data-in'],         // where a parameter goes (body, query, path, header…); docsite.js's try form reads body, query and path
  button: ['data-action'],             // the page's name for what the button does (agent.js: run, copy-result; pages: retry, export)
  log: ['data-action', 'data-anchor'], // code.js handles wrap, download and first-error; a page adds its own (replay). data-anchor: the prefix of line ids (build -> #build-L42)
  commit: ['data-fd-hold', 'data-min-words', 'data-max-words'],   // seconds to hold a commit; the reason's word budget on fd-commit-budget
  hold: ['data-seconds'],              // the length of a hold started by data-fd-hold-for or hold(el)
  draft: ['data-fd-draft-for'],        // the id of the field a draft fills
  'site-pricing': ['data-period'],     // a billing period's name, the segmented item's data-value (monthly, yearly)
};
/* An icon name is free text (the lint's unknown-icon rule checks it against catalog.icons). The drawn icon,
 * svg.fd-icon[data-icon] (EXPORT I2), takes it on the icon's root; rules such as `.fd-badge > i[data-icon]` give it to
 * the components below, on their root or on the part a drawn icon may carry, where it would otherwise allow only the
 * bare attribute. data-icon-fill stays a presence flag (`.fd-icon[data-icon-fill]`). */
for (const id of ['icon', 'badge', 'banner', 'feature-list', 'status', 'tag', 'tile', 'command', 'menu', 'pipeline', 'service-status', 'decision', 'draft', 'commit', 'preview']) {
  (FREE_ATTRIBUTES[id] ??= []).push('data-icon');
}

/** Values the docs or module headers state for a state no selector styles, or the unwritten default of a styled attribute.
 *  Key: a component id (the value is the component's own) or a class (the value is that part's). -> attribute -> values. */
export const DEFAULT_VALUES = {
  dialog: { 'data-size': ['md'] },                 // overlays.css: 480px, "default"
  sheet: { 'data-size': ['md'], 'data-side': ['right'] },   // docs/overlays.html: <dialog class="fd-sheet" data-side="right" data-size="md">; the CSS styles left and bottom
  'fd-stat-delta': { 'data-dir': ['up'] },         // data.css: .fd-stat-delta[data-dir] draws the up arrow, [data-dir="down"] flips it
  log: { 'data-level': ['info'] },                 // code.css: only warn, error and debug have a dot colour; info is the default row
  'fd-chat-receipt': { 'data-state': ['sending', 'sent', 'delivered'] },   // chat.js header: state 'sending'|'sent'|'delivered'|'read'|'failed', drawn on the receipt; chat.css styles read and failed
  message: { 'data-state': ['error'] },            // docs/agent.html: a failed assistant message
  'fd-table-state': { 'data-state': ['error'] },   // docs/data.html: tr.fd-table-state data-state="error"
  icon: { 'data-size': ['16'] },                   // icons.js header: data-size="12|14|16|20|24"; 16 is --fd-icon, the unstyled default
  'fd-spinner': { 'data-size': ['16'] },           // skeleton.css header: <span class="fd-spinner" data-size="16">; 16 is the unstyled default
  'copy-field': { 'data-mask': ['partial', 'full'] },   // forms.js header: the secret's data-mask="partial|full|end" "works the same on .fd-copy-field"
  'doc-cards': { 'data-cols': ['3'] },
  'site-hero': { 'data-side': ['end'] },           // site.css: the split hero's media sits at the end unless data-side="start"
  'site-split': { 'data-side': ['end'] },          // the same for a split section             // docsite.css: .fd-doc-cards { --_doc-cols: 3 }; 2 and 4 are styled
  matrix: { 'data-cols': ['2'] },                  // forms.css: .fd-matrix { --_f-cols: 2 }; 1, 3 and 4 are styled
};

/** Layout attributes (fire/layout.css, any element) that GUIDE.md section 5 documents on a layout primitive: they take
 *  the values of catalog.globalAttributes. data-span is written on a grid's child, which may be anything. */
export const LAYOUT_ATTRIBUTES = {
  stack: ['data-gap'],                              // "Space between children: data-gap on the parent"
  row: ['data-gap', 'data-gap-x'],
  grid: ['data-gap', 'data-gap-x', 'data-min', 'data-cols'],   // "fd-grid with data-min (narrowest column) and data-cols (most columns)"
};

/**
 * Attributes Fire's scripts set as state (open, dragging, copied, measured overflow, animation phases, what a renderer
 * stamps): the lint accepts them, a tool that offers props does not offer them. Key: a component id (the attribute on any of its
 * classes) or a class (on that class only; the root class means the root alone) -> attribute -> extra values the
 * scripts write that no style or comment lists (usually none: the evidence's values move here). The build fails when
 * no Fire script writes the attribute, or a listed value is not a literal of a script that writes it. Reviewed against the writes in fire/js/*.js (`dataset.x =`, setAttribute, toggleAttribute).
 */
export const STATE_ATTRIBUTES = {
  // open / closed, written by the open and close code (core.js: "State lives in the DOM: data-state")
  accordion: { 'data-state': ['closing', 'closed'] },   // content.js: open|closing|closed on the <details>
  chat: { 'data-state': [], 'data-dragging': [], 'data-instant': [], 'data-expanded': [] },
  combobox: { 'data-state': ['closed'] },              // forms.js: state.root.dataset.state = 'open' | 'closed'
  hovercard: { 'data-state': [], 'data-measuring': [] },
  menu: { 'data-state': [], 'data-measuring': [] },
  // where position() (core.js) placed a floating element: "Sets data-side and data-align on the floating element"
  'fd-menu': { 'data-side': [], 'data-align': [] },
  'fd-popover': { 'data-side': [], 'data-align': [] },
  'fd-tooltip': { 'data-side': [], 'data-align': [] },
  'fd-hovercard': { 'data-side': [], 'data-align': [] },
  'fd-chat': { 'data-view': ['home', 'conversation', 'history', 'offline'] },   // chat.js: root.dataset.view = the view it shows (VIEWS)
  'mobile-nav': { 'data-state': ['closed'] },          // shell.js: sheet and scrim open | closed
  popover: { 'data-state': [], 'data-measuring': [] },
  tooltip: { 'data-state': [], 'data-measuring': [] },
  tweaks: { 'data-state': [], 'data-dragging': [], 'data-moved': [] },
  'fd-table-bulk': { 'data-state': [] },
  'fd-chart-tooltip': { 'data-state': [], 'data-snap': [] },
  'fd-doc-otp': { 'data-state': [] },
  'fd-data-card-more': { 'data-state': [] },
  // feedback after an action: copied, done, voted, revealed, dragged over, uploading
  'fd-codeblock-copy': { 'data-state': [] },
  'fd-snippet-copy': { 'data-state': [] },
  'fd-json-btn': { 'data-state': [] },
  'fd-log-btn': { 'data-state': [] },
  'fd-message-action': { 'data-state': [] },
  'fd-doc-copy': { 'data-state': [] },
  'fd-doc-anchor': { 'data-state': [] },
  'fd-doc-helpful': { 'data-state': [] },
  'fd-kv-copy': { 'data-copied': [] },
  'fd-field-counter': { 'data-state': [] },          // forms.js: limit | near as the count grows
  secret: { 'data-state': ['masked'] },              // forms.js: masked | revealed, toggled by the reveal button
  'file-upload': { 'data-state': [] },               // forms.js: dragover on the zone; uploading | done | error on the rows it writes
  'fd-chat-block': { 'data-state': ['done', 'sent'] },   // chat.js: used, locked, joined, booked, cancelled as a block is answered
  'fd-chat-jump': { 'data-state': [] },
  'fd-chat-file': { 'data-state': [] },
  'fd-composer-attachment': { 'data-state': [], 'data-upload': [] },
  'fd-free-runs': { 'data-state': [] },
  pagebar: { 'data-state': [], 'data-scoped': [] },
  // measured by a script: scroll overflow, sliding indicators, sizes
  tabs: { 'data-indicator': [], 'data-overflow': [] },    // nav.js
  'chip-nav': { 'data-overflow': [] },
  subnav: { 'data-overflow': [] },
  pipeline: { 'data-overflow': [] },
  'fd-table-scroll': { 'data-overflow': [] },
  dialog: { 'data-overflow-top': [], 'data-overflow-bottom': [], 'data-bump': [], 'data-dragging': [], 'data-step': [] },
  sheet: { 'data-dragging': [], 'data-step': [] },
  'fd-chat-carousel': { 'data-start': [], 'data-end': [] },
  // pointer and animation phases
  slider: { 'data-dragging': [] },
  'fd-slider-ticks': { 'data-active': [] },
  toast: { 'data-front': [], 'data-hidden': [], 'data-state': [], 'data-swiped': [], 'data-swiping': [] },
  'fd-toaster': { 'data-expanded': [] },
  'fd-chat-view': { 'data-enter': [], 'data-leave': [] },
  'fd-chat-who': { 'data-swap': [] },
  'fd-chat-launcher-badge': { 'data-pop': [] },
  'chat-message': { 'data-removing': [], 'data-editing': [], 'data-new': [] },
  'fd-chat-msg-actions': { 'data-picking': [] },
  'fd-log-row': { 'data-new': [] },
  'fd-log-follow': { 'data-paused': [] },
  'fd-token': { 'data-new': [] },
  'fd-tweaks-value': { 'data-changed': [] },
  // what a renderer stamps on the marks it draws (charts.css: "the renderer stamps data-s=1…6")
  chart: { 'data-enter': [], 'data-s': [] },
  bars: { 'data-enter': [], 'data-s': [] },
  donut: { 'data-enter': [], 'data-s': [], 'data-active': [] },
  heatgrid: { 'data-enter': [], 'data-s': [] },
  legend: { 'data-s': [] },
  sparkline: { 'data-s': [] },
  'fd-heatgrid-cell': { 'data-active': [], 'data-l': [], 'data-none': [], 'data-empty': [] },
  'fd-calendar': { 'data-pending': [] },
  'fd-calendar-cell': { 'data-cap': [], 'data-range': [] },
  'fd-calendar-day': { 'data-preview': [], 'data-today': [] },
  'fd-command-item': { 'data-active': [] },
  'fd-option': { 'data-active': [] },
  'fd-segmented-thumb': { 'data-empty': [] },
  'fd-toc-marker': { 'data-empty': [] },
  composer: { 'data-ready': [] },
  'fd-composer': { 'data-state': [] },             // agent.js: running while a reply streams
  'fd-endpoint': { 'data-state': [] },             // copied
  command: { 'data-dragging': [] },
  filter: { 'data-active': [] },                   // data.js: toggled when the filter holds a value
  listbox: { 'data-fallback': [] },
  message: { 'data-new': [] },
  result: { 'data-new': [] },
  progress: { 'data-complete': [], 'data-empty': [] },
  'fd-progress-steps': { 'data-current': [], 'data-done': [] },
  // the docs site's try-it form: docsite.js writes the fields and reads their type
  // decisions (content.js): a draft used or edited, a hold running, a commit held or sent, a preview gone stale, a narrow queue's view
  draft: { 'data-state': [] },
  'fd-commit': { 'data-state': ['committed'] },
  'fd-commit-budget': { 'data-state': [] },
  hold: { 'data-state': [] },
  preview: { 'data-state': [] },
  queue: { 'data-view': [] },
  'fd-input': { 'data-type': [] },
  'fd-textarea': { 'data-type': [] },
};

/**
 * JS-only parts: a module with no CSS root class, so the class-based build cannot find it. id (also the card's file
 * name, contract/cards/<id>.json), name, module (path from the repository root). The build reads the module's exports
 * from its source. A module is not a component: the catalogue lists it under `modules`, `fire find` finds it (kind
 * "module"), and an exporter does not carry it.
 */
export const MODULES = [
  { id: 'email', name: 'Email', module: 'fire/email/email.js' },
  { id: 'initial-helpers', name: 'Initial mark helpers', module: 'fire/js/initial.js' },
  { id: 'theme-record', name: 'Theme record', module: 'fire/js/theme.js' },
  { id: 'transitions', name: 'Page transitions', module: 'fire/js/transitions.js' },
];
