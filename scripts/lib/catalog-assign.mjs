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
  'fd-corners': 'Texture & loading',   // four marks on a wrapper's corners
  'fd-daterange': 'Overlays',
  'fd-data-card': 'Data',
  'fd-feature-row': 'Content',
  'fd-file': 'Forms',                  // an uploaded file row (fd-filelist is its list)
  'fd-glyph': 'Texture & loading',
  'fd-listbox': 'Forms',
  'fd-matrix': 'Forms',                // a table of switches
  'fd-model-menu': 'Agent',
  'fd-noise': 'Texture & loading',
  'fd-notification': 'Overlays',
  'fd-option': 'Forms',                // an option row (fd-options is its list)
  'fd-pagebar': 'Texture & loading',
  'fd-pending': 'Texture & loading',
  'fd-pick': 'Overlays',               // pickable object card
  'fd-result': 'Agent',
  'fd-scroller': 'Content',
  'fd-tooltip': 'Overlays',            // the vocabulary lists it only as the part of data-fd-tooltip
  'fd-usage-chip': 'Agent',
  'fd-use-agent': 'Agent',
  'fd-viewswitch': 'Code',
};

/** Classes (and their dash-descendants) that are parts of another component: class -> root of the component.
 *  A key that the vocabulary lists as a root (fd-stat) stops being a component and joins the named one. */
export const PART_OF = {
  'fd-danger-text': 'fd-accent-text',
  'fd-success-text': 'fd-accent-text',
  'fd-warning-text': 'fd-accent-text',
  'fd-check-dash': 'fd-checkbox',
  'fd-check-tick': 'fd-checkbox',
  'fd-clamp-2': 'fd-truncate',
  'fd-clamp-3': 'fd-truncate',
  'fd-copied-label': 'fd-codeblock',
  'fd-crosshair': 'fd-frame',          // the frame's registration marks
  'fd-fade': 'fd-rise',                // entrance animations
  'fd-filelist': 'fd-file',
  'fd-free-runs': 'fd-usage-chip',
  'fd-num': 'fd-mono',                 // tabular figures
  'fd-options': 'fd-option',
  'fd-overlay-count': 'fd-popover',    // count badge on a trigger
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
};

/** Component ids that differ from the root class without its `fd-` (the vocabulary says Buttons, the class is btn). */
export const ID_ALIASES = { 'fd-btn': 'button' };

/** Kind of a component. Default: `layout` in the Layout family, otherwise `component`. */
export const PATTERNS = new Set(['fd-agent', 'fd-form-section', 'fd-screen', 'fd-playground']);

/** Single-root components whose readable name is not the id in title case. */
export const NAMES = { 'fd-tag-input': 'Tag input', 'fd-secret': 'Secret', 'fd-codeblock': 'Code block', 'fd-json': 'JSON viewer', 'fd-otp': 'One-time code', 'fd-qr': 'QR code' };

/** Documentation pages that specimen each family (a docs anchor is chosen from these first). */
export const FAMILY_PAGES = {
  Base: ['foundations.html', 'writing.html'],
  Buttons: ['buttons.html'],
  Shell: ['shell.html'],
  Navigation: ['navigation.html'],
  Forms: ['forms.html'],
  Overlays: ['overlays.html'],
  Data: ['data.html'],
  Content: ['content.html'],
  Code: ['code.html'],
  Agent: ['agent.html'],
  Chat: ['chat.html'],
  Charts: ['charts.html'],
  'Texture & loading': ['skeletons.html', 'signature.html'],
  Documentation: ['documentation.html'],
  Tweaks: ['tweaks.html'],
  Layout: ['foundations.html', 'shell.html'],
};

/** The behaviour module whose header documents the events of a family. */
export const FAMILY_MODULES = {
  Agent: ['agent'], Chat: ['chat'], Charts: ['charts'], Code: ['code'], Content: ['content'], Data: ['data'],
  Documentation: ['docsite'], Forms: ['forms'], Navigation: ['nav'], Overlays: ['overlays'], Shell: ['shell'],
  'Texture & loading': ['texture'], Tweaks: ['tweaks'],
};

/** Events a header documents without naming a class, tied to a component by a word in the statement
 *  (forms.js: "fd:change ... combobox, tag input, otp ..."). Module -> { words: { word: root class } }. */
export const EVENT_SUBJECTS = {
  data: { words: { table: 'fd-table', tr: 'fd-table' } },
  forms: { words: { combobox: 'fd-combobox', 'tag input': 'fd-tag-input', otp: 'fd-otp', number: 'fd-number', slider: 'fd-slider', search: 'fd-search', dropzone: 'fd-dropzone', secret: 'fd-secret', 'copy field': 'fd-copy-field' } },
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
};

/** Events a module listens for; they are not events of any component. */
export const LISTENED_EVENTS = new Set(['fd:theme', 'fd:accent']);

/** Element tag name -> component id, where the tag is not one of the component's classes. */
export const ELEMENT_COMPONENT = { 'fd-texture': 'texture' };

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
  { id: 'app', name: 'App', family: 'Shell', root: 'fd-app', members: ['fd-main', 'fd-frame'] },
  { id: 'sidebar', name: 'Sidebar', family: 'Shell', root: 'fd-sidebar', members: ['fd-sidebar-head', 'fd-sidebar-body', 'fd-sidebar-foot', 'fd-nav', 'fd-nav-group', 'fd-nav-item', 'fd-nav-label', 'fd-nav-badge', 'fd-team-switch', 'fd-account', 'fd-usage-card'] },
  { id: 'brand', name: 'Brand', family: 'Shell', root: 'fd-brand', members: ['fd-wordmark'] },
  { id: 'page', name: 'Page', family: 'Shell', root: 'fd-page', members: ['fd-band'] },
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
  codeblock: ['data-collapse'],        // collapsed height in px: "200", "240", "420" (code.js header)
  doc: ['data-doc-hide'],              // docs-site breakpoints to hide at, space-separated ("md sm")
  kv: ['data-copy'],                   // the text a row copies
  menu: ['data-fd-submenu'],           // the id of the sub-menu
  pipeline: ['data-when'],             // the condition of a conditional stage (data.js header shows "failure")
};

/** Values the docs or module headers state for a state no selector styles, or the unwritten default of a styled attribute. component id -> attribute -> values. */
export const DEFAULT_VALUES = {
  dialog: { 'data-size': ['md'] },                 // overlays.css: 480px, "default"
  sheet: { 'data-size': ['md'], 'data-side': ['right'] },   // docs/overlays.html: <dialog class="fd-sheet" data-side="right" data-size="md">; the CSS styles left and bottom
  stats: { 'data-dir': ['up'] },                   // data.css: [data-dir] draws the up arrow, [data-dir="down"] flips it
  log: { 'data-level': ['info'] },                 // code.css: only warn, error and debug have a dot colour; info is the default row
  'chat-message': { 'data-state': ['delivered'] }, // docs/chat.html: state sending | sent | delivered | read | failed
  message: { 'data-state': ['error'] },            // docs/agent.html: a failed assistant message
  table: { 'data-state': ['error'] },              // docs/data.html: tr.fd-table-state data-state="error"
};
