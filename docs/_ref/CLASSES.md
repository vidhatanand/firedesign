# Fire: every class

Generated from `contract/catalog.json` by `node scripts/build-classes.mjs` (Fire 0.8.1). Do not edit: change the CSS or the
catalogue and run the build. `VOCABULARY.md` beside this file explains the parts in prose; this file is the complete list.

For each component: its root class, its part classes, the attributes it reads with their values (on the root, then per
part), the attributes Fire sets as state, its events, and its custom element where it has one. "(or bare)" means the
attribute also works with no value.

## Content

### Accordion (`accordion`, component)

- Root: `fd-accordion`, shown at `docs/content.html#accordion`
- Parts: `fd-accordion-inner`, `fd-accordion-item`, `fd-accordion-panel`, `fd-accordion-trigger`, `fd-disclosure`, `fd-disclosure-inner`, `fd-disclosure-panel`, `fd-disclosure-trigger`
- On the root: `data-single`, `data-variant="card"`
- On `fd-accordion-trigger`: `data-icon-lead`
- State, set by Fire: `data-state="closed|closing|open"`

### Announce (`announce`, component)

- Root: `fd-announce`, shown at `docs/signature.html#announce`
- Parts: `fd-announce-actions`, `fd-announce-art`, `fd-announce-body`, `fd-announce-tag`
- On `fd-announce-art`: `data-side="end|start"`

### Avatar (`avatar`, component)

- Root: `fd-avatar`, shown at `docs/content.html#avatar`
- Parts: `fd-avatar-stack`
- On the root: `data-overflow`, `data-shape="square"`, `data-size="20|24|28|32|40"`, `data-status="away|busy|offline|online" (or bare)`, `data-tone="accent|danger|info|success|violet|warning"`

### Badge (`badge`, component)

- Root: `fd-badge`, shown at `docs/content.html#badge`
- Parts: `fd-badge-remove`
- On the root: `data-dot`, `data-icon="*"`, `data-size="lg"`, `data-tone="accent|danger|info|neutral|success|violet|warning"`, `data-variant="lg|mono|outline|solid"`
- On `fd-badge-remove`: `data-icon="*"`

### Banner (`banner`, component)

- Root: `fd-banner`, shown at `docs/content.html#banner`
- Parts: `fd-banner-action`, `fd-banner-dismiss`, `fd-banner-text`
- On the root: `data-align="start"`, `data-icon="*"`, `data-tone="accent|danger|info|neutral|success|violet|warning"`, `data-variant="announcement"`

### Callout (`callout`, component)

- Root: `fd-callout`, shown at `docs/content.html#callout`
- Parts: `fd-callout-actions`, `fd-callout-body`, `fd-callout-content`, `fd-callout-dismiss`, `fd-callout-icon`, `fd-callout-title`
- On the root: `data-size="sm"`, `data-tone="accent|danger|info|neutral|success|violet|warning"`

### Card (`card`, component)

- Root: `fd-card`, shown at `docs/content.html#card`
- Parts: `fd-card-action`, `fd-card-arrow`, `fd-card-body`, `fd-card-cell`, `fd-card-cell-label`, `fd-card-cell-sub`, `fd-card-cell-value`, `fd-card-cells`, `fd-card-count`, `fd-card-desc`, `fd-card-foot`, `fd-card-grid`, `fd-card-head`, `fd-card-heading`, `fd-card-meta`, `fd-card-name`, `fd-card-note`, `fd-card-price`, `fd-card-text`
- On the root: `data-flush`, `data-interactive`, `data-size="lg|sm"`, `data-variant="accent|quiet|sunken"`

### Decision brief (`decision`, component)

- Root: `fd-decision`, shown at `docs/decisions.html#brief`
- Parts: `fd-decision-actions`, `fd-decision-detail`, `fd-decision-facts`, `fd-decision-head`, `fd-decision-heading`, `fd-decision-label`, `fd-decision-lead`, `fd-decision-meta`, `fd-decision-outcome`, `fd-decision-outcome-title`, `fd-decision-part`, `fd-decision-parts`, `fd-decision-quote`, `fd-decision-title`
- On `fd-decision-outcome`: `data-icon="*"`, `data-tone="accent|danger|info|neutral|success|violet|warning"`

### Decision queue (`queue`, pattern)

- Root: `fd-queue`, shown at `docs/decisions.html#queue`
- Parts: `fd-queue-age`, `fd-queue-back`, `fd-queue-case`, `fd-queue-count`, `fd-queue-group`, `fd-queue-group-label`, `fd-queue-item`, `fd-queue-list`, `fd-queue-meta`, `fd-queue-text`, `fd-queue-title`
- On `fd-queue-age`: `data-urgent`
- On `fd-queue-case`: `data-case`
- State, set by Fire: `data-view="case|list"`
- Events: `fd:select`

### Delta (`delta`, component)

- Root: `fd-delta`, shown at `docs/decisions.html#brief`
- Parts: `fd-delta-from`, `fd-delta-to`
- On the root: `data-mono`

### Drafted text (`draft`, component)

- Root: `fd-draft`, shown at `docs/decisions.html#draft`
- Parts: `fd-draft-actions`, `fd-draft-by`, `fd-draft-text`, `fd-draft-used`, `fd-draft-when`
- On the root: `data-fd-draft="discard|use"`, `data-fd-draft-for="*"`
- On `fd-draft-by`: `data-icon="*"`
- State, set by Fire: `data-state="edited|used"`
- Events: `fd:accept`, `fd:close`

### Empty (`empty`, component)

- Root: `fd-empty`, shown at `docs/content.html#empty`
- Parts: `fd-empty-actions`, `fd-empty-art`, `fd-empty-hint`, `fd-empty-icon`, `fd-empty-meta`, `fd-empty-text`, `fd-empty-title`
- On the root: `data-size="lg|sm"`, `data-tone="accent|danger|info|neutral|success|violet|warning" (or bare)`

### Feature list (`feature-list`, component)

- Root: `fd-feature-list`, shown at `docs/content.html#feature-list`
- Parts: `fd-feature-row`, `fd-feature-row-desc`, `fd-feature-row-text`, `fd-feature-row-title`
- On the root: `data-excluded`, `data-icon="*"`, `data-size="lg|sm"`, `data-tone="accent"`

### Held action (`hold`, component)

- Root: `fd-hold`, shown at `docs/decisions.html#hold`
- Parts: `fd-hold-count`, `fd-hold-note`, `fd-hold-ring`, `fd-hold-text`, `fd-hold-title`, `fd-hold-undo`
- On the root: `data-seconds="*"`, `data-tone="accent|danger|info|neutral|success|violet|warning"`
- On `fd-hold-ring`: `data-size="sm"`
- State, set by Fire: `data-state="running"`
- Events: `fd:commit`, `fd:hold`, `fd:undo`

### Impact (`impact`, component)

- Root: `fd-impact`, shown at `docs/decisions.html#preview`
- Parts: `fd-impact-count`, `fd-impact-list`, `fd-impact-more`, `fd-impact-text`
- On the root: `data-tone="accent|danger|info|neutral|success|violet|warning"`

### Page states (`states`, pattern)

- Root: `fd-states`, shown at `docs/content.html#page-states`
- On the root: `data-state="empty|error|expired|filtered|loading|no-access|not-found|off|ready"`, `data-when`
- Events: `fd:change`

### Plan (`plan`, component)

- Root: `fd-plan`, shown at `docs/content.html#plan`
- Parts: `fd-plan-actions`, `fd-plan-allowance`, `fd-plan-amount`, `fd-plan-cta`, `fd-plan-grid`, `fd-plan-head`, `fd-plan-info`, `fd-plan-name`, `fd-plan-per`, `fd-plan-pitch`, `fd-plan-price`
- On the root: `data-current`, `data-recommended`, `data-variant="row"`

### Preview then commit (`preview`, pattern)

- Root: `fd-preview`, shown at `docs/decisions.html#preview`
- Parts: `fd-preview-edit`, `fd-preview-result`, `fd-preview-stale`
- On the root: `data-fd-preview-open`
- On `fd-preview-stale`: `data-icon="*"`
- State, set by Fire: `data-state="preview|stale"`
- Events: `fd:change`, `fd:open`

### QR code (`qr`, component)

- Root: `fd-qr`, shown at `docs/content.html#qr`
- On the root: `data-size="lg|sm"`

### Reason and commit (`commit`, component)

- Root: `fd-commit`, shown at `docs/decisions.html#commit`
- Parts: `fd-commit-actions`, `fd-commit-budget`, `fd-commit-effect`, `fd-commit-lock`
- On the root: `data-fd-hold="*"`, `data-fd-hold-in="toast"`, `data-max-words="*"`, `data-min-words="*"`
- On `fd-commit-lock`: `data-icon="*"`
- State, set by Fire: `data-state="committed|held|near|over"`
- Events: `fd:commit`, `fd:hold`, `fd:undo`

### Scroller (`scroller`, component)

- Root: `fd-scroller`, shown at `docs/content.html#scroller`
- Parts: `fd-scroller-head`, `fd-scroller-nav`, `fd-scroller-track`

### Setting (`setting`, component)

- Root: `fd-setting`, shown at `docs/content.html#setting`
- Parts: `fd-setting-control`, `fd-setting-desc`, `fd-setting-text`, `fd-setting-title`
- On the root: `data-align="end|start"`, `data-control="wide"`, `data-size="sm"`, `data-tone="danger"`

### Status (`status`, component)

- Root: `fd-status`, shown at `docs/content.html#status`
- Parts: `fd-status-note`
- On the root: `data-icon="*"`, `data-live`, `data-size="sm"`, `data-tone="accent|danger|info|neutral|success|violet|warning"`, `data-variant="icon|pill"`

### Tag (`tag`, component)

- Root: `fd-tag`, shown at `docs/content.html#tag`
- Parts: `fd-tag-remove`
- On the root: `data-icon="*"`, `data-variant="soft"`
- On `fd-tag-remove`: `data-icon="*"`

### Tile (`tile`, component)

- Root: `fd-tile`, shown at `docs/content.html#tile`
- On the root: `data-bordered`, `data-icon="*"`, `data-shape="circle|wide"`, `data-size="20|28|36|40|44|56"`, `data-tone="accent|danger|info|inverse|neutral|success|violet|warning"`

### Timeline (`timeline`, component)

- Root: `fd-timeline`, shown at `docs/content.html#timeline`
- Parts: `fd-timeline-body`, `fd-timeline-card`, `fd-timeline-head`, `fd-timeline-item`, `fd-timeline-main`, `fd-timeline-more`, `fd-timeline-node`, `fd-timeline-time`, `fd-timeline-title`
- On `fd-timeline-item`: `data-kind="group" (or bare)`, `data-live`, `data-tone="accent|danger|info|neutral|success|violet|warning"`

### Verified (`verified`, component)

- Root: `fd-verified`, shown at `docs/content.html#provider`
- On the root: `data-size="lg"`

## Agent

### Agent (`agent`, pattern)

- Root: `fd-agent`, shown at `docs/agent.html#screen`
- Parts: `fd-agent-dock`, `fd-agent-dock-note`, `fd-agent-main`, `fd-agent-scroll`, `fd-agent-side`, `fd-agent-top`, `fd-agent-top-hide`
- On the root: `data-fill`

### Approval Bar (`approval-bar`, component)

- Root: `fd-approval-bar`, shown at `docs/agent.html#parts`
- Parts: `fd-approval-bar-actions`, `fd-approval-bar-text`

### Composer (`composer`, component)

- Root: `fd-composer`, shown at `docs/agent.html#composer`
- Parts: `fd-composer-attachment`, `fd-composer-attachment-meta`, `fd-composer-attachment-name`, `fd-composer-attachment-remove`, `fd-composer-attachment-tile`, `fd-composer-attachments`, `fd-composer-foot`, `fd-composer-foot-end`, `fd-composer-free`, `fd-composer-hero`, `fd-composer-input`, `fd-composer-prefix`, `fd-composer-row`, `fd-composer-send`, `fd-composer-sep`, `fd-composer-source`, `fd-composer-sources`, `fd-composer-tool`, `fd-composer-tools`, `fd-context-meter`, `fd-context-meter-ring`, `fd-free-runs`, `fd-model-chip`, `fd-model-chip-label`, `fd-model-chip-tag`, `fd-model-menu`, `fd-model-menu-desc`, `fd-model-menu-item`, `fd-model-menu-label`, `fd-model-menu-name`, `fd-stop-btn`, `fd-usage-chip`, `fd-usage-chip-sep`
- On the root: `data-focus`, `data-variant="playground"`
- On `fd-composer-hero`: `data-size="sm"`
- On `fd-context-meter`: `data-tone="danger|warning"`
- On `fd-model-menu`: `data-side="top"`
- State, set by Fire: `data-ready`, `data-state="empty|removing|running"`, `data-upload="failed|uploading"`
- Events: `fd:change`, `fd:stop`, `fd:submit`

### Message (`message`, component)

- Root: `fd-message`, shown at `docs/agent.html#streaming`
- Parts: `fd-cursor`, `fd-message-action`, `fd-message-actions`, `fd-message-avatar`, `fd-message-body`, `fd-message-content`, `fd-message-dots`, `fd-message-error`, `fd-message-error-text`, `fd-message-error-title`, `fd-message-foot`, `fd-message-meta`, `fd-message-status`, `fd-message-thinking`
- On the root: `data-actions="visible"`, `data-role="assistant|user"`, `data-state="error"`
- On `fd-message-action`: `data-chat-action="down|up"`, `data-chat-helpful="down|up"`
- State, set by Fire: `data-new`, `data-state="copied"`
- Events: `fd:action`

### Playground (`playground`, pattern)

- Root: `fd-playground`, shown at `docs/agent.html#playground`
- Parts: `fd-playground-agent`, `fd-playground-bar`, `fd-playground-col`, `fd-playground-colhead`, `fd-playground-cols`, `fd-playground-credits`, `fd-playground-field`, `fd-playground-field-hint`, `fd-playground-field-label`, `fd-playground-field-name`, `fd-playground-field-req`, `fd-playground-field-type`, `fd-playground-foot`, `fd-playground-foot-end`, `fd-playground-form`, `fd-playground-head`, `fd-playground-head-end`, `fd-playground-label`, `fd-playground-more`, `fd-playground-note`, `fd-playground-num`, `fd-playground-output`, `fd-playground-picker`, `fd-playground-picker-meta`, `fd-playground-response`
- On `fd-playground-bar`: `data-size="sm"`

### Reasoning (`reasoning`, component)

- Root: `fd-reasoning`, shown at `docs/agent.html#reasoning`
- Parts: `fd-reasoning-body`, `fd-reasoning-label`, `fd-reasoning-panel`, `fd-reasoning-text`, `fd-reasoning-toggle`
- On the root: `data-state="done|thinking"`

### Result (`result`, component)

- Root: `fd-result`, shown at `docs/agent.html#result`
- Parts: `fd-result-body`, `fd-result-count`, `fd-result-foot`, `fd-result-head`, `fd-result-table`, `fd-result-title`, `fd-result-tools`
- On `fd-result-table`: `data-mono`, `data-num`
- State, set by Fire: `data-new`

### Run Steps (`run-steps`, component)

- Root: `fd-run-steps`, shown at `docs/agent.html#run-steps`
- Parts: `fd-run-steps-detail`, `fd-run-steps-foot`, `fd-run-steps-icon`, `fd-run-steps-item`, `fd-run-steps-label`, `fd-run-steps-time`
- On `fd-run-steps-item`: `data-state="active|done|failed|pending"`

### Session List (`session-list`, component)

- Root: `fd-session-list`, shown at `docs/agent.html#sessions`
- Parts: `fd-session-list-actions`, `fd-session-list-body`, `fd-session-list-empty`, `fd-session-list-head`, `fd-session-list-heading`, `fd-session-list-item`, `fd-session-list-label`, `fd-session-list-link`, `fd-session-list-live`, `fd-session-list-loading`, `fd-session-list-more`, `fd-session-list-new`, `fd-session-list-spinner`, `fd-session-list-time`
- On `fd-session-list-item`: `data-active`

### Sources (`sources`, component)

- Root: `fd-sources`, shown at `docs/agent.html#sources`
- Parts: `fd-citation`, `fd-citation-card`, `fd-citation-card-meta`, `fd-citation-card-snippet`, `fd-citation-card-title`, `fd-sources-count`, `fd-sources-domain`, `fd-sources-head`, `fd-sources-item`, `fd-sources-list`, `fd-sources-meta`, `fd-sources-num`, `fd-sources-tile`, `fd-sources-title`
- On the root: `data-layout="row"`
- On `fd-citation-card`: `data-side="bottom"`
- On `fd-sources-tile`: `data-tone="info|neutral|success|violet"`

### Suggestions (`suggestions`, component)

- Root: `fd-suggestions`, shown at `docs/agent.html#hero`
- Parts: `fd-suggestions-item`, `fd-suggestions-text`

### Thread (`thread`, component)

- Root: `fd-thread`, shown at `docs/agent.html#demo`

### Toolcall (`toolcall`, component)

- Root: `fd-toolcall`, shown at `docs/agent.html#toolcalls`
- Parts: `fd-toolcall-args`, `fd-toolcall-body`, `fd-toolcall-chevron`, `fd-toolcall-foot`, `fd-toolcall-foot-actions`, `fd-toolcall-foot-text`, `fd-toolcall-group`, `fd-toolcall-head`, `fd-toolcall-label`, `fd-toolcall-meta`, `fd-toolcall-name`, `fd-toolcall-panel`, `fd-toolcall-status`
- On the root: `data-state="approval|done|failed|queued|running"`

### Use Agent (`use-agent`, component)

- Root: `fd-use-agent`, shown at `docs/agent.html#parts`
- Parts: `fd-use-agent-stack`, `fd-use-agent-tile`
- On `fd-use-agent-tile`: `data-tone="info|neutral|violet"`

## Shell

### App (`app`, component)

- Root: `fd-app`, shown at `docs/shell.html#app`
- Parts: `fd-app-fab`, `fd-main`
- On the root: `data-contained`, `data-fd-instant`, `data-only="desktop|mobile"`, `data-sidebar="collapsed|expanded"`
- Events: `fd:change`

### Brand (`brand`, component)

- Root: `fd-brand`, shown at `docs/shell.html#brand`
- Parts: `fd-brand-logo`, `fd-brand-mark`, `fd-brand-name`, `fd-wordmark`
- On `fd-wordmark`: `data-size="sm"`, `data-tone="accent"`

### Initial (`initial`, component)

- Root: `fd-initial`, shown at `docs/shell.html#initial-mark`

### Mobile Nav (`mobile-nav`, component)

- Root: `fd-mobile-nav`, shown at `docs/shell.html#mobile`
- Parts: `fd-mobile-nav-account`, `fd-mobile-nav-actions`, `fd-mobile-nav-item`, `fd-mobile-nav-label`, `fd-mobile-nav-scrim`, `fd-mobile-nav-section`
- On the root: `data-only="desktop|mobile"`
- On `fd-mobile-nav-item`: `data-level="2"`
- State, set by Fire: `data-state="closed|open"`
- Events: `fd:close`, `fd:open`

### Page (`page`, component)

- Root: `fd-page`, shown at `docs/shell.html#frame`
- Parts: `fd-band`, `fd-crosshair`, `fd-frame`
- On `fd-band`: `data-align="center"`, `data-column="lg|md|sm|xl|xs" (or bare)`, `data-grow`, `data-marks="corners|crosses|dots|none" (or bare)`, `data-pad="lg|md|none|sm"`, `data-sticky`, `data-surface="sunken|surface"`
- On `fd-crosshair`: `data-corner="bl|br|tl|tr" (or bare)`, `data-tone="accent"`
- On `fd-frame`: `data-fill`, `data-marks="corners|crosses|dots|none" (or bare)`, `data-pad="lg|md|none|sm"`, `data-surface="surface"`

### Page Head (`page-head`, component)

- Root: `fd-page-head`, shown at `docs/shell.html#compact-head`
- Parts: `fd-page-head-actions`, `fd-page-head-desc`, `fd-page-head-text`, `fd-page-head-title`
- On the root: `data-size="sm"`

### Page Hero (`page-hero`, component)

- Root: `fd-page-hero`, shown at `docs/shell.html#hero`
- Parts: `fd-page-hero-actions`, `fd-page-hero-art`, `fd-page-hero-desc`, `fd-page-hero-text`

### Panel (`panel`, component)

- Root: `fd-panel`, shown at `docs/shell.html#split`
- Parts: `fd-panel-body`, `fd-panel-head`, `fd-panel-title`
- On the root: `data-variant="pane"`

### Running (`running`, component)

- Root: `fd-running`, shown at `docs/shell.html#running`
- Parts: `fd-running-bar`, `fd-running-count`, `fd-running-dot`, `fd-running-item`, `fd-running-label`, `fd-running-list`, `fd-running-meta`, `fd-running-time`, `fd-running-title`
- On the root: `data-fd-running="*"`
- Events: `fd:change`, `fd:keys`

### Screen (`screen`, pattern)

- Root: `fd-screen`, shown at `docs/shell.html#screen`
- Parts: `fd-screen-foot`, `fd-screen-head`, `fd-screen-note`
- On the root: `data-size="md|sm"`

### Service Status (`service-status`, component)

- Root: `fd-service-status`, shown at `docs/shell.html#service-status`
- Parts: `fd-service-status-label`
- On the root: `data-icon="*"`, `data-status="degraded|maintenance|operational|outage" (or bare)`
- Events: `fd:change`

### Shortcuts (`shortcuts`, component)

- Root: `fd-shortcuts`, shown at `docs/shell.html#go-keys`
- Parts: `fd-keys-hint`, `fd-shortcuts-group`, `fd-shortcuts-keys`, `fd-shortcuts-label`, `fd-shortcuts-name`, `fd-shortcuts-row`
- On `fd-keys-hint`: `data-state="open"`, `data-static`

### Sidebar (`sidebar`, component)

- Root: `fd-sidebar`, shown at `docs/shell.html#app`
- Parts: `fd-account`, `fd-account-avatar`, `fd-account-email`, `fd-nav`, `fd-nav-badge`, `fd-nav-chevron`, `fd-nav-group`, `fd-nav-hint`, `fd-nav-item`, `fd-nav-key`, `fd-nav-label`, `fd-nav-sub`, `fd-nav-text`, `fd-rail-tip`, `fd-rail-tip-hint`, `fd-sidebar-body`, `fd-sidebar-foot`, `fd-sidebar-head`, `fd-sidebar-toggle`, `fd-team-switch`, `fd-team-switch-meta`, `fd-team-switch-tile`, `fd-usage-card`, `fd-usage-card-head`, `fd-usage-card-link`, `fd-usage-card-meta`, `fd-usage-card-meter`, `fd-usage-card-ring`, `fd-usage-card-title`
- On `fd-rail-tip`: `data-side="left"`
- On `fd-sidebar-toggle`: `data-icon-only`
- On `fd-team-switch`: `data-fd-menu-value`
- Events: `fd:close`, `fd:open`

### Split (`split`, component)

- Root: `fd-split`, shown at `docs/shell.html#split`
- Parts: `fd-split-main`
- On the root: `data-side="start"`

### Tabbar (`tabbar`, component)

- Root: `fd-tabbar`, shown at `docs/shell.html#tabbar`
- Parts: `fd-tabbar-badge`, `fd-tabbar-item`, `fd-tabbar-label`
- On `fd-tabbar-item`: `data-dot`

### Toolbar (`toolbar`, component)

- Root: `fd-toolbar`, shown at `docs/shell.html#toolbar`
- Parts: `fd-toolbar-end`, `fd-toolbar-filters`, `fd-toolbar-search`, `fd-toolbar-sep`
- On `fd-toolbar-search`: `data-size="full"`

### Topbar (`topbar`, component)

- Root: `fd-topbar`, shown at `docs/shell.html#topbar`
- Parts: `fd-topbar-actions`, `fd-topbar-brand`, `fd-topbar-dot`, `fd-topbar-title`
- On the root: `data-fd-mobile-nav`, `data-fd-search-trigger`

## Navigation

### Back (`back`, component)

- Root: `fd-back`, shown at `docs/navigation.html#wayfinding`

### Breadcrumb (`breadcrumb`, component)

- Root: `fd-breadcrumb`, shown at `docs/navigation.html#wayfinding`

### Chip Nav (`chip-nav`, component)

- Root: `fd-chip-nav`, shown at `docs/navigation.html#chip-nav`
- Parts: `fd-chip`, `fd-chip-count`
- On `fd-chip`: `data-text`
- State, set by Fire: `data-overflow="both|end|start"`
- Events: `fd:change`

### Pagination (`pagination`, component)

- Root: `fd-pagination`, shown at `docs/navigation.html#pagination`
- Parts: `fd-pagination-gap`, `fd-pagination-info`, `fd-pagination-page`, `fd-pagination-pages`
- On the root: `data-variant="numbered"`

### Segmented (`segmented`, component)

- Root: `fd-segmented`, shown at `docs/navigation.html#segmented`
- Parts: `fd-segmented-count`, `fd-segmented-group`, `fd-segmented-item`, `fd-segmented-label`, `fd-segmented-thumb`
- On the root: `data-block`, `data-icon-only`, `data-size="sm"`, `data-tone="accent"`, `data-tweak="theme"`, `data-variant="grouped"`
- State, set by Fire: `data-empty`
- Events: `fd:change`

### Steps (`steps`, component)

- Root: `fd-steps`, shown at `docs/navigation.html#steps`
- Parts: `fd-step`, `fd-step-action`, `fd-step-body`, `fd-step-desc`, `fd-step-marker`, `fd-step-owner`, `fd-step-title`
- On the root: `data-current="*"`, `data-orientation="vertical"`, `data-variant="tracker"`
- On `fd-step`: `data-state="current|done|error|failed|running|skipped|waiting"`
- Events: `fd:change`

### Subnav (`subnav`, component)

- Root: `fd-subnav`, shown at `docs/navigation.html#subnav`
- Parts: `fd-subnav-item`, `fd-subnav-meta`, `fd-subnav-sep`
- State, set by Fire: `data-overflow="both|end|start"`
- Events: `fd:change`

### Tabs (`tabs`, component)

- Root: `fd-tabs`, shown at `docs/navigation.html#tabs`
- Parts: `fd-tab`, `fd-tab-count`, `fd-tab-panel`, `fd-tabs-indicator`
- On the root: `data-size="sm"`
- State, set by Fire: `data-indicator`, `data-overflow="both|end|start"`
- Events: `fd:change`

### Toc (`toc`, component)

- Root: `fd-toc`, shown at `docs/navigation.html#toc`
- Parts: `fd-toc-item`, `fd-toc-list`, `fd-toc-marker`, `fd-toc-title`
- On `fd-toc-item`: `data-level="2"`
- State, set by Fire: `data-empty`
- Events: `fd:change`

## Charts

### Bars (`bars`, component)

- Root: `fd-bars`, shown at `docs/charts.html#ranked`
- Parts: `fd-bars-fill`, `fd-bars-label`, `fd-bars-mark`, `fd-bars-row`, `fd-bars-track`, `fd-bars-value`, `fd-bars-was`
- On the root: `data-tone="accent|danger|info|muted|neutral|success|violet|warning"`
- State, set by Fire: `data-enter="done|pending"`, `data-s="1|2|3|4|5|6"`

### Chart (`chart`, component)

- Root: `fd-chart`, shown at `docs/charts.html#line`
- Parts: `fd-chart-area`, `fd-chart-band`, `fd-chart-bar`, `fd-chart-baseline`, `fd-chart-card`, `fd-chart-card-aside`, `fd-chart-card-body`, `fd-chart-card-caption`, `fd-chart-card-desc`, `fd-chart-card-foot`, `fd-chart-card-head`, `fd-chart-card-text`, `fd-chart-col`, `fd-chart-crosshair`, `fd-chart-dot`, `fd-chart-empty`, `fd-chart-empty-text`, `fd-chart-empty-title`, `fd-chart-grid`, `fd-chart-line`, `fd-chart-live`, `fd-chart-live-dot`, `fd-chart-live-ring`, `fd-chart-loading`, `fd-chart-plot`, `fd-chart-point`, `fd-chart-skel-area`, `fd-chart-skel-bar`, `fd-chart-skel-bars`, `fd-chart-skel-grid`, `fd-chart-stat`, `fd-chart-stat-delta`, `fd-chart-stat-label`, `fd-chart-stat-main`, `fd-chart-stat-value`, `fd-chart-stop`, `fd-chart-svg`, `fd-chart-swatch-dash`, `fd-chart-swatch-svg`, `fd-chart-threshold`, `fd-chart-threshold-label`, `fd-chart-tick`, `fd-chart-tooltip`, `fd-chart-tooltip-name`, `fd-chart-tooltip-row`, `fd-chart-tooltip-swatch`, `fd-chart-tooltip-title`, `fd-chart-tooltip-value`, `fd-quadrant-axis`, `fd-quadrant-axis-title`, `fd-quadrant-cell`, `fd-quadrant-corner`, `fd-quadrant-dot`, `fd-quadrant-frame`, `fd-quadrant-group`, `fd-quadrant-group-count`, `fd-quadrant-group-label`, `fd-quadrant-key`, `fd-quadrant-list`, `fd-quadrant-name`, `fd-quadrant-plot`, `fd-quadrant-point`, `fd-quadrant-row`, `fd-quadrant-row-name`, `fd-quadrant-row-values`, `fd-quadrant-rows`, `fd-quadrant-tick`
- On the root: `data-fd-chart="area|bar|line|quadrant|stacked"`, `data-grid="dashed|none|solid"`, `data-labels="none"`, `data-legend`, `data-marks="dash"`, `data-ring="bg"`, `data-state="empty|loading"`, `data-tone="accent|danger|info|muted|neutral|success|violet|warning"`
- On `fd-chart-line`: `data-dash`
- On `fd-chart-stat`: `data-tone="accent|danger|info|muted|neutral|success|violet|warning"`
- On `fd-chart-stat-delta`: `data-trend="bad|good"`
- On `fd-chart-threshold`: `data-tone="danger|warning"`
- On `fd-chart-threshold-label`: `data-tone="danger|warning"`
- On `fd-chart-tooltip-row`: `data-total`
- On `fd-chart-tooltip-swatch`: `data-shape="dash|square"`
- On `fd-quadrant-axis`: `data-axis="x|y"`
- On `fd-quadrant-cell`: `data-corner="bl|br|tl|tr"`, `data-tone`
- On `fd-quadrant-group`: `data-tone`
- On `fd-quadrant-point`: `data-active`, `data-side="start"`
- State, set by Fire: `data-enter="pending|run"`, `data-s="1|2|3|4|5|6"`, `data-snap`, `data-state="open"`
- Element: `<fd-chart>`

### Donut (`donut`, component)

- Root: `fd-donut`, shown at `docs/charts.html#donut`
- Parts: `fd-donut-caption`, `fd-donut-center`, `fd-donut-figure`, `fd-donut-legend`, `fd-donut-legend-item`, `fd-donut-legend-label`, `fd-donut-legend-share`, `fd-donut-legend-swatch`, `fd-donut-legend-value`, `fd-donut-ring`, `fd-donut-seg`, `fd-donut-svg`, `fd-donut-track`
- On the root: `data-compact`, `data-tone="accent|danger|info|muted|neutral|success|violet|warning"`, `data-type="progress"`
- State, set by Fire: `data-active`, `data-enter="pending|run"`, `data-s="1|2|3|4|5|6"`

### Heatgrid (`heatgrid`, component)

- Root: `fd-heatgrid`, shown at `docs/charts.html#heatgrid`
- Parts: `fd-heatgrid-cell`, `fd-heatgrid-day`, `fd-heatgrid-foot`, `fd-heatgrid-grid`, `fd-heatgrid-legend`, `fd-heatgrid-month`, `fd-heatgrid-scroll`, `fd-heatgrid-summary`, `fd-heatgrid-swatch`
- On the root: `data-size="lg|md|sm"`, `data-tone="accent|danger|info|muted|neutral|success|violet|warning"`, `data-variant="strip"`
- On `fd-heatgrid-swatch`: `data-l="1|2|3|4"`
- State, set by Fire: `data-active`, `data-empty`, `data-enter="pending|run"`, `data-l="1|2|3|4"`, `data-none`, `data-s="1|2|3|4|5|6"`

### Legend (`legend`, component)

- Root: `fd-legend`, shown at `docs/charts.html#legend`
- Parts: `fd-legend-item`, `fd-legend-swatch`
- On the root: `data-tone="accent|danger|info|muted|neutral|success|violet|warning"`
- On `fd-legend-swatch`: `data-shape="dash|soft|square"`
- State, set by Fire: `data-s="1|2|3|4|5|6"`

### Sparkline (`sparkline`, component)

- Root: `fd-sparkline`, shown at `docs/charts.html#sparkline`
- Parts: `fd-sparkline-bar`, `fd-sparkline-dot`, `fd-sparkline-line`, `fd-sparkline-stop`, `fd-sparkline-svg`
- On the root: `data-fluid`, `data-tone="accent|danger|info|muted|neutral|success|violet|warning"`, `data-trend="bad|flat|good"`, `data-type="bars"`
- On `fd-sparkline-bar`: `data-last`
- State, set by Fire: `data-s="1|2|3|4|5|6"`

## Buttons

### Button (`button`, component)

- Root: `fd-btn`, shown at `docs/buttons.html#variants`
- Parts: `fd-btn-group`, `fd-btn-swap`, `fd-btn-text`
- On the root: `data-action="*"`, `data-block`, `data-fd-chat-expand`, `data-icon-only`, `data-size="lg|md|sm|xl|xs"`, `data-state="match.|mismatch|partial"`, `data-variant="accent-soft|danger|danger-soft|ghost|inverse|outline|primary|secondary"`
- On `fd-btn-text`: `data-tone="accent"`

### Fab (`fab`, component)

- Root: `fd-fab`, shown at `docs/buttons.html#groups`
- On the root: `data-float`

## Chat

### Chat (`chat`, component)

- Root: `fd-chat`, shown at `docs/chat.html#anatomy`
- Parts: `fd-chat-actions`, `fd-chat-actions-row`, `fd-chat-badge`, `fd-chat-banner`, `fd-chat-banner-text`, `fd-chat-body`, `fd-chat-booked`, `fd-chat-cal`, `fd-chat-card`, `fd-chat-card-actions`, `fd-chat-card-media`, `fd-chat-card-price`, `fd-chat-carousel`, `fd-chat-carousel-btn`, `fd-chat-carousel-track`, `fd-chat-chosen`, `fd-chat-closed`, `fd-chat-closed-text`, `fd-chat-confirm`, `fd-chat-confirm-text`, `fd-chat-confirm-title`, `fd-chat-continue`, `fd-chat-continue-label`, `fd-chat-continue-meta`, `fd-chat-continue-text`, `fd-chat-day`, `fd-chat-days`, `fd-chat-disclaimer`, `fd-chat-done-icon`, `fd-chat-drop`, `fd-chat-edited`, `fd-chat-file`, `fd-chat-file-meta`, `fd-chat-file-name`, `fd-chat-file-text`, `fd-chat-files`, `fd-chat-fold`, `fd-chat-foot`, `fd-chat-form`, `fd-chat-form-actions`, `fd-chat-greeting`, `fd-chat-handoff`, `fd-chat-handoff-sub`, `fd-chat-handoff-text`, `fd-chat-handoff-title`, `fd-chat-head`, `fd-chat-helpful`, `fd-chat-history`, `fd-chat-history-head`, `fd-chat-history-label`, `fd-chat-history-list`, `fd-chat-home`, `fd-chat-home-foot`, `fd-chat-home-head`, `fd-chat-intro`, `fd-chat-jump`, `fd-chat-jump-count`, `fd-chat-linkcard`, `fd-chat-linkcard-domain`, `fd-chat-linkcard-text`, `fd-chat-linkcard-title`, `fd-chat-links`, `fd-chat-list`, `fd-chat-log`, `fd-chat-mark`, `fd-chat-media`, `fd-chat-metric`, `fd-chat-metric-figure`, `fd-chat-metric-top`, `fd-chat-offline`, `fd-chat-offline-head`, `fd-chat-option`, `fd-chat-option-meta`, `fd-chat-panel`, `fd-chat-panel-body`, `fd-chat-panel-foot`, `fd-chat-panel-head`, `fd-chat-panel-meta`, `fd-chat-panel-title`, `fd-chat-queue`, `fd-chat-quote`, `fd-chat-quote-text`, `fd-chat-rate`, `fd-chat-rating`, `fd-chat-rating-comment`, `fd-chat-rating-hint`, `fd-chat-rating-label`, `fd-chat-rating-scale`, `fd-chat-react-picker`, `fd-chat-replies`, `fd-chat-result`, `fd-chat-service`, `fd-chat-service-time`, `fd-chat-shot`, `fd-chat-slot`, `fd-chat-slots`, `fd-chat-status`, `fd-chat-suggestions`, `fd-chat-summary`, `fd-chat-summary-head`, `fd-chat-system-text`, `fd-chat-teaser`, `fd-chat-teaser-text`, `fd-chat-thanks`, `fd-chat-thread`, `fd-chat-thread-preview`, `fd-chat-thread-side`, `fd-chat-thread-title`, `fd-chat-thumb`, `fd-chat-title`, `fd-chat-unread-dot`, `fd-chat-view`, `fd-chat-who`, `fd-chat-who-text`
- On the root: `data-agent="ai|away|human|queue"`, `data-contained`, `data-disabled`, `data-fd-chat-close`, `data-fd-chat-expand`, `data-fd-chat-minimize`, `data-fd-chat-play="ai|handoff|support"`, `data-mode="inline|panel|popup|side"`
- On `fd-chat-banner`: `data-tone="danger|info|warning"`
- On `fd-chat-card-media`: `data-tone="accent"`
- On `fd-chat-carousel-btn`: `data-dir="next|prev"`
- On `fd-chat-fold`: `data-part="ask|booked|comment|foot|form|pick|result|summary|thanks"`
- On `fd-chat-mark`: `data-size="28"`, `data-tone="neutral"`
- On `fd-chat-media`: `data-layout="grid"`
- On `fd-chat-queue`: `data-tick`
- On `fd-chat-rate`: `data-lit`
- On `fd-chat-rating-scale`: `data-variant="faces|stars"`
- On `fd-chat-shot`: `data-art="chart|code|error"`
- On `fd-chat-status`: `data-tone="accent|success|warning" (or bare)`
- On `fd-chat-teaser`: `data-contained`, `data-static`
- On `fd-chat-thread`: `data-unread`
- On `fd-chat-thumb`: `data-more`
- On `fd-chat-view`: `data-view="conversation|history|home|offline"`
- State, set by Fire: `data-dragging`, `data-end`, `data-enter="back" (or bare)`, `data-expanded`, `data-instant`, `data-leave`, `data-start`, `data-state="closed|failed|open|uploading|visible"`, `data-swap`, `data-view="conversation|history|home|offline"`

### Chat launcher (`chat-launcher`, component)

- Root: `fd-chat-launcher`, shown at `docs/chat.html#launcher`
- Parts: `fd-chat-launcher-badge`, `fd-chat-launcher-icon`, `fd-chat-pill`
- On the root: `data-contained`, `data-float`
- On `fd-chat-launcher-icon`: `data-role="close|open"`
- State, set by Fire: `data-pop`

### Chat lightbox (`chat-lightbox`, component)

- Root: `fd-chat-lightbox`, shown at `docs/chat.html#blocks`
- Parts: `fd-chat-lightbox-count`, `fd-chat-lightbox-media`

### Chat message (`chat-message`, component)

- Root: `fd-chat-msg`, shown at `docs/chat.html#messages`
- Parts: `fd-chat-block`, `fd-chat-block-hint`, `fd-chat-block-label`, `fd-chat-msg-actions`, `fd-chat-msg-avatar`, `fd-chat-msg-body`, `fd-chat-msg-head`, `fd-chat-msg-main`, `fd-chat-msg-meta`, `fd-chat-msg-name`, `fd-chat-msg-quote`, `fd-chat-msg-reactions`, `fd-chat-msg-role`, `fd-chat-msg-stamp`, `fd-chat-msg-time`, `fd-chat-msg-tools`, `fd-chat-reaction`, `fd-chat-receipt`, `fd-chat-typing`, `fd-chat-typing-label`
- On the root: `data-actions="visible"`, `data-author="ai|human|system|user"`, `data-continued`, `data-tone="accent|success"`, `data-typing`
- On `fd-chat-block`: `data-type="actions|attachment|card|carousel|code|confirm|details|form|handoff|list|metric|notice|quick-replies|rating|schedule|sources|steps|table|text|tool"`
- On `fd-chat-receipt`: `data-state="delivered|failed|read|sending|sent"`
- State, set by Fire: `data-editing`, `data-new`, `data-picking`, `data-removing`, `data-state="booked|cancelled|confirmed|done|joined|locked|sent|used"`

## Forms

### Checkbox (`checkbox`, component)

- Root: `fd-checkbox`, shown at `docs/forms.html#checkbox`
- Parts: `fd-check-dash`, `fd-check-tick`, `fd-checkbox-box`, `fd-checkbox-desc`, `fd-checkbox-label`, `fd-checkbox-text`

### Choice (`choice`, component)

- Root: `fd-choice`, shown at `docs/forms.html#choice`
- Parts: `fd-choice-body`, `fd-choice-desc`, `fd-choice-group`, `fd-choice-mark`, `fd-choice-meta`, `fd-choice-title`
- On `fd-choice-group`: `data-layout="grid"`

### Codefield (`codefield`, component)

- Root: `fd-codefield`, shown at `docs/forms.html#codefield`
- Parts: `fd-codefield-head`, `fd-codefield-input`, `fd-codefield-lang`
- On the root: `data-fd-codefield-format`

### Codes (`codes`, component)

- Root: `fd-codes`, shown at `docs/forms.html#recovery-codes`
- Parts: `fd-codes-actions`, `fd-codes-head`, `fd-codes-item`, `fd-codes-list`, `fd-codes-note`, `fd-codes-title`
- On the root: `data-filename="*"`
- On `fd-codes-item`: `data-used`
- Events: `fd:copy`, `fd:download`

### Color (`color`, component)

- Root: `fd-color`, shown at `docs/forms.html#color`
- Parts: `fd-color-check`, `fd-color-check-name`, `fd-color-check-ratio`, `fd-color-check-verdict`, `fd-color-checks`, `fd-color-picker`
- On `fd-color-check`: `data-level="fail|pass|warn"`
- Events: `fd:change`

### Combobox (`combobox`, component)

- Root: `fd-combobox`, shown at `docs/forms.html#combobox`
- State, set by Fire: `data-state="closed|open"`
- Events: `fd:change`, `fd:close`, `fd:open`, `fd:select`

### Confirm Inline (`confirm-inline`, component)

- Root: `fd-confirm-inline`, shown at `docs/forms.html#confirm-inline`
- Parts: `fd-confirm-inline-rule`
- On the root: `data-confirm="*"`, `data-fd-confirm-input`, `data-state="match|mismatch|partial"`
- Events: `fd:change`

### Copy Field (`copy-field`, component)

- Root: `fd-copy-field`, shown at `docs/forms.html#secret`
- Parts: `fd-copy-field-actions`, `fd-copy-field-end`, `fd-copy-field-label`, `fd-copy-field-start`, `fd-copy-field-value`
- On the root: `data-mask="end|full|partial"`
- Events: `fd:copy`

### Datefield (`datefield`, component)

- Root: `fd-datefield`, shown at `docs/forms.html#datefield`
- Parts: `fd-datefield-foot`, `fd-datefield-panel`
- On the root: `data-max-date="*"`, `data-min-date="*"`
- Events: `fd:change`

### Field (`field`, component)

- Root: `fd-field`, shown at `docs/forms.html#field`
- Parts: `fd-field-aside`, `fd-field-counter`, `fd-field-error`, `fd-field-foot`, `fd-field-head`, `fd-field-hint`, `fd-field-info`, `fd-field-label`, `fd-field-name`, `fd-field-req`, `fd-field-tag`, `fd-field-type`
- On the root: `data-variant="schema"`
- On `fd-field-hint`: `data-mono`
- On `fd-field-label`: `data-required`
- State, set by Fire: `data-state="limit|near"`

### File upload (`file-upload`, component)

- Root: `fd-dropzone`, shown at `docs/forms.html#dropzone`
- Parts: `fd-dropzone-actions`, `fd-dropzone-hint`, `fd-dropzone-icon`, `fd-dropzone-preview`, `fd-dropzone-text`, `fd-dropzone-title`, `fd-file`, `fd-file-bar`, `fd-file-icon`, `fd-file-main`, `fd-file-meta`, `fd-file-name`, `fd-file-size`, `fd-file-status`, `fd-filelist`
- On the root: `data-fd-file-clear`, `data-layout="inline|logo"`
- State, set by Fire: `data-state="done|dragover|error|uploading"`
- Events: `fd:change`, `fd:files`

### Form (`form`, component)

- Root: `fd-form`, shown at `docs/forms.html#rows`
- Parts: `fd-form-actions`, `fd-form-actions-text`, `fd-form-cols`, `fd-form-row`, `fd-form-row-control`, `fd-form-row-desc`, `fd-form-row-label`, `fd-form-row-text`
- On the root: `data-size="full|lg|sm"`
- On `fd-form-actions`: `data-align="between"`, `data-variant="sticky"`
- On `fd-form-cols`: `data-size="full|lg|sm"`
- On `fd-form-row`: `data-align="start"`, `data-inline-mobile`, `data-layout="stack"`

### Form Section (`form-section`, pattern)

- Root: `fd-form-section`, shown at `docs/forms.html#form-sections`
- Parts: `fd-form-section-body`, `fd-form-section-desc`, `fd-form-section-head`, `fd-form-section-title`
- On the root: `data-layout="stack"`

### Input (`input`, component)

- Root: `fd-input`, shown at `docs/forms.html#input`
- Parts: `fd-input-pair`
- On the root: `data-fit`, `data-mono`, `data-size="lg|sm"`
- On `fd-input-pair`: `data-joined`
- State, set by Fire: `data-type="number"`

### Input Group (`input-group`, component)

- Root: `fd-input-group`, shown at `docs/forms.html#affixes`
- Parts: `fd-input-affix`
- On the root: `data-fit`, `data-mono`, `data-size="lg|sm"`
- On `fd-input-affix`: `data-kind="action|chevron|tag|text|unit"`

### Listbox (`listbox`, component)

- Root: `fd-listbox`, shown at `docs/forms.html#combobox`
- Parts: `fd-listbox-empty`, `fd-listbox-label`, `fd-option`, `fd-option-check`, `fd-option-desc`, `fd-option-label`, `fd-option-main`, `fd-option-meta`, `fd-options`
- On the root: `data-side="top"`
- On `fd-options`: `data-orientation="horizontal"`
- State, set by Fire: `data-active`, `data-fallback`

### Matrix (`matrix`, component)

- Root: `fd-matrix`, shown at `docs/forms.html#switch`
- Parts: `fd-matrix-cell`, `fd-matrix-desc`, `fd-matrix-head`, `fd-matrix-label`, `fd-matrix-row`, `fd-matrix-text`
- On the root: `data-cols="1|2|3|4"`

### Number (`number`, component)

- Root: `fd-number`, shown at `docs/forms.html#number`
- Parts: `fd-number-input`, `fd-number-step`
- On the root: `data-block`, `data-fit`, `data-mono`, `data-size="lg|sm"`
- Events: `fd:change`

### One-time code (`otp`, component)

- Root: `fd-otp`, shown at `docs/forms.html#otp`
- Parts: `fd-otp-sep`
- On the root: `data-size="lg|sm"`, `data-type="alphanumeric|numeric"`
- Events: `fd:change`

### Pairs (`pairs`, component)

- Root: `fd-pairs`, shown at `docs/forms.html#pairs`
- Parts: `fd-pairs-add`, `fd-pairs-head`, `fd-pairs-key`, `fd-pairs-row`, `fd-pairs-value`
- On the root: `data-format="json"`, `data-mono="both|key|value" (or bare)`, `data-size="lg|sm"`

### Radio (`radio`, component)

- Root: `fd-radio`, shown at `docs/forms.html#radio`
- Parts: `fd-radio-box`, `fd-radio-desc`, `fd-radio-label`, `fd-radio-text`

### Reason (`reason`, component)

- Root: `fd-reason`, shown at `docs/forms.html#reason`
- Parts: `fd-reason-text`, `fd-reason-who`, `fd-reason-why`
- On the root: `data-layout="inline"`

### Search (`search`, component)

- Root: `fd-search`, shown at `docs/forms.html#search`
- Parts: `fd-search-clear`, `fd-search-input`
- On the root: `data-fit`, `data-mono`, `data-size="lg|sm"`, `data-variant="soft"`
- Events: `fd:change`

### Secret (`secret`, component)

- Root: `fd-secret`, shown at `docs/forms.html#secret`
- Parts: `fd-secret-actions`, `fd-secret-end`, `fd-secret-input`, `fd-secret-start`, `fd-secret-value`
- On the root: `data-mask="end|full|partial"`, `data-mode="entry"`, `data-noun="*"`
- On `fd-secret-value`: `data-tone="accent"`
- State, set by Fire: `data-state="masked|revealed"`
- Events: `fd:copy`, `fd:rotate`

### Select (`select`, component)

- Root: `fd-select`, shown at `docs/forms.html#select`
- On the root: `data-block`, `data-fit`, `data-size="lg|sm"`, `data-variant="outline"`

### Slider (`slider`, component)

- Root: `fd-slider`, shown at `docs/forms.html#slider`
- Parts: `fd-slider-bubble`, `fd-slider-ticks`, `fd-slider-value`
- On the root: `data-bubble="off"`, `data-variant="steps"`
- State, set by Fire: `data-active`, `data-dragging`
- Events: `fd:change`

### Swatch (`swatch`, component)

- Root: `fd-swatch`, shown at `docs/forms.html#color`
- On the root: `data-empty`, `data-shape="round"`, `data-size="lg|sm|xl|xs"`

### Switch (`switch`, component)

- Root: `fd-switch`, shown at `docs/forms.html#switch`
- Parts: `fd-switch-desc`, `fd-switch-label`, `fd-switch-lock`, `fd-switch-text`, `fd-switch-track`
- On the root: `data-label="start"`, `data-locked`, `data-size="sm"`

### Tag input (`tag-input`, component)

- Root: `fd-tag-input`, shown at `docs/forms.html#tags`
- Parts: `fd-tag-input-field`, `fd-token`, `fd-token-label`, `fd-token-remove`
- On the root: `data-format="json"`, `data-mono`, `data-size="lg|sm"`
- On `fd-token`: `data-invalid`
- State, set by Fire: `data-new`
- Events: `fd:change`

### Textarea (`textarea`, component)

- Root: `fd-textarea`, shown at `docs/forms.html#textarea`
- On the root: `data-fd-autogrow`, `data-mono`, `data-resize="none"`, `data-size="lg|sm"`
- State, set by Fire: `data-type="json"`

## Overlays

### Checklist (`checklist`, component)

- Root: `fd-checklist`, shown at `docs/overlays.html#filter`
- Parts: `fd-checklist-count`, `fd-checklist-empty`, `fd-checklist-item`, `fd-checklist-label`
- On `fd-checklist-item`: `data-highlighted`
- Events: `fd:change`

### Command (`command`, component)

- Root: `fd-command`, shown at `docs/overlays.html#command-palette`
- Parts: `fd-command-empty`, `fd-command-empty-text`, `fd-command-empty-title`, `fd-command-foot`, `fd-command-group`, `fd-command-group-label`, `fd-command-input`, `fd-command-item`, `fd-command-item-hint`, `fd-command-item-label`, `fd-command-list`, `fd-command-note`, `fd-command-search`
- On the root: `data-static-demo`
- On `fd-command-item`: `data-icon="*"`
- On `fd-command-note`: `data-state="error|loading"`
- State, set by Fire: `data-active`, `data-dragging`

### Confirm (`confirm`, component)

- Root: `fd-confirm`, shown at `docs/overlays.html#confirm`
- Parts: `fd-confirm-phrase`
- On the root: `data-fd-confirm-input`
- Events: `fd:confirm`

### Date picker (`date-picker`, component)

- Root: `fd-daterange`, shown at `docs/overlays.html#date-range`
- Parts: `fd-calendar`, `fd-calendar-cell`, `fd-calendar-day`, `fd-calendar-grid`, `fd-calendar-head`, `fd-calendar-row`, `fd-calendar-title`, `fd-calendar-weekday`, `fd-daterange-compare`, `fd-daterange-compare-dates`, `fd-daterange-compare-label`, `fd-daterange-foot`, `fd-daterange-main`, `fd-daterange-preset`, `fd-daterange-presets`, `fd-daterange-summary`, `fd-pick`, `fd-pick-check`, `fd-pick-foot`, `fd-pick-head`, `fd-pick-meta`, `fd-pick-name`, `fd-pick-text`
- On the root: `data-compare="*"`
- On `fd-calendar`: `data-kind="one"`
- On `fd-daterange-foot`: `data-kind="one"`
- On `fd-daterange-main`: `data-kind="one"`
- On `fd-daterange-preset`: `data-preset="24h|30d|7d|custom|lastmonth|month|quarter|year"`
- State, set by Fire: `data-cap="end|start"`, `data-pending`, `data-preview`, `data-range="end|middle|start" (or bare)`, `data-today`
- Events: `fd:change`

### Dialog (`dialog`, component)

- Root: `fd-dialog`, shown at `docs/overlays.html#dialogs`
- Parts: `fd-dialog-body`, `fd-dialog-close`, `fd-dialog-desc`, `fd-dialog-dots`, `fd-dialog-feature`, `fd-dialog-feature-text`, `fd-dialog-feature-title`, `fd-dialog-features`, `fd-dialog-foot`, `fd-dialog-foot-note`, `fd-dialog-foot-start`, `fd-dialog-grid`, `fd-dialog-head`, `fd-dialog-pager`, `fd-dialog-title`, `fd-dialog-toolbar`
- On the root: `data-size="lg|md|sm|xl"`, `data-static-demo`
- On `fd-dialog-close`: `data-icon-only`, `data-size="sm"`
- On `fd-dialog-foot`: `data-start`
- State, set by Fire: `data-bump`, `data-dragging`, `data-overflow-bottom`, `data-overflow-top`, `data-step`
- Events: `fd:change`, `fd:close`, `fd:open`

### Hovercard (`hovercard`, component)

- Root: `fd-hovercard`, shown at `docs/overlays.html#hovercards`
- Parts: `fd-hovercard-head`, `fd-hovercard-meta`, `fd-hovercard-stats`, `fd-hovercard-text`, `fd-hovercard-title`
- On the root: `data-static-demo`
- State, set by Fire: `data-align="end|start"`, `data-measuring="true" (or bare)`, `data-side="bottom|left|right|top"`, `data-state="open"`

### Menu (`menu`, component)

- Root: `fd-menu`, shown at `docs/overlays.html#menus`
- Parts: `fd-menu-close`, `fd-menu-group`, `fd-menu-head`, `fd-menu-item`, `fd-menu-item-desc`, `fd-menu-item-hint`, `fd-menu-item-label`, `fd-menu-label`, `fd-menu-sep`, `fd-menu-title`
- On the root: `data-fd-doc-picker="example|lang"`, `data-fd-unless="*"`, `data-fd-when="*"`, `data-static-demo`, `data-variant="switcher"`
- On `fd-menu-close`: `data-icon="*"`
- On `fd-menu-item`: `data-fd-else="disable"`, `data-fd-submenu="*"`, `data-highlighted`, `data-icon="*"`, `data-tone="danger"`, `data-value="*"`
- State, set by Fire: `data-align="end|start"`, `data-measuring="true" (or bare)`, `data-side="bottom|left|right|top"`, `data-state="open"`
- Events: `fd:change`

### Notification (`notification`, component)

- Root: `fd-notification`, shown at `docs/overlays.html#notifications`
- Parts: `fd-notification-body`, `fd-notification-list`, `fd-notification-meta`, `fd-notification-text`, `fd-notification-title`
- On the root: `data-unread`

### Period (`period`, component)

- Root: `fd-period`, shown at `docs/overlays.html#period`
- Parts: `fd-period-compare`

### Popover (`popover`, component)

- Root: `fd-popover`, shown at `docs/overlays.html#popovers`
- Parts: `fd-overlay-count`, `fd-popover-actions`, `fd-popover-body`, `fd-popover-empty`, `fd-popover-empty-text`, `fd-popover-empty-title`, `fd-popover-foot`, `fd-popover-glyph`, `fd-popover-head`, `fd-popover-search`, `fd-popover-title`, `fd-popover-toolbar`
- On the root: `data-arrow`, `data-size="auto|lg|md|sm"`, `data-static-demo`
- On `fd-popover-foot`: `data-align="center|end"`
- State, set by Fire: `data-align="end|start"`, `data-measuring="true" (or bare)`, `data-side="bottom|left|right|top"`, `data-state="open"`

### Sheet (`sheet`, component)

- Root: `fd-sheet`, shown at `docs/overlays.html#sheets`
- Parts: `fd-sheet-bar`, `fd-sheet-body`, `fd-sheet-close`, `fd-sheet-desc`, `fd-sheet-foot`, `fd-sheet-head`, `fd-sheet-section`, `fd-sheet-title`
- On the root: `data-side="bottom|left|right" (or bare)`, `data-size="lg|md"`, `data-static-demo`
- On `fd-sheet-close`: `data-size="sm"`
- On `fd-sheet-foot`: `data-start`
- State, set by Fire: `data-dragging`, `data-step`
- Events: `fd:change`, `fd:close`, `fd:open`

### Toast (`toast`, component)

- Root: `fd-toast`, shown at `docs/overlays.html#toasts`
- Parts: `fd-toast-action`, `fd-toast-close`, `fd-toast-content`, `fd-toast-desc`, `fd-toast-icon`, `fd-toast-progress`, `fd-toast-title`, `fd-toaster`
- On the root: `data-held`, `data-static-demo`, `data-tone="accent|danger|info|loading|neutral|success|warning"`
- State, set by Fire: `data-expanded`, `data-front`, `data-hidden`, `data-state="closing|entering"`, `data-swiped`, `data-swiping`
- Events: `fd:commit`, `fd:hold`, `fd:undo`

### Tooltip (`tooltip`, component)

- Root: `fd-tooltip`, shown at `docs/overlays.html#tooltips`
- Parts: `fd-tooltip-keys`
- On the root: `data-static-demo`
- State, set by Fire: `data-align="end|start"`, `data-measuring="true" (or bare)`, `data-side="bottom|left|right|top"`, `data-state="open"`

## Code

### Code block (`codeblock`, component)

- Root: `fd-codeblock`, shown at `docs/code.html#codeblock`
- Parts: `fd-codeblock-actions`, `fd-codeblock-body`, `fd-codeblock-btn`, `fd-codeblock-copy`, `fd-codeblock-expand`, `fd-codeblock-file`, `fd-codeblock-head`, `fd-codeblock-lang`, `fd-codeblock-line`, `fd-codeblock-more`, `fd-codeblock-tab`, `fd-codeblock-tabs`, `fd-copied-label`, `fd-syntax-comment`, `fd-syntax-fn`, `fd-syntax-key`, `fd-syntax-keyword`, `fd-syntax-number`, `fd-syntax-plain`, `fd-syntax-punct`, `fd-syntax-string`
- On the root: `data-collapse="*"`, `data-expanded`, `data-lines`, `data-variant="framed"`, `data-wrap`
- On `fd-codeblock-btn`: `data-action="wrap"`
- On `fd-codeblock-line`: `data-hl`
- On `fd-codeblock-tab`: `data-tone="danger|success|warning" (or bare)`
- On `fd-codeblock-tabs`: `data-variant="segmented"`
- State, set by Fire: `data-state="copied"`
- Element: `<fd-code>`

### Diff (`diff`, component)

- Root: `fd-diff`, shown at `docs/code.html#diff`
- Parts: `fd-diff-bar`, `fd-diff-body`, `fd-diff-code`, `fd-diff-file`, `fd-diff-head`, `fd-diff-line`, `fd-diff-num`, `fd-diff-sign`, `fd-diff-src`, `fd-diff-stat`, `fd-diff-stats`
- On `fd-diff-bar`: `data-type="add|del"`
- On `fd-diff-line`: `data-type="add|ctx|del|hunk|meta"`
- On `fd-diff-stat`: `data-type="add|del"`

### Endpoint (`endpoint`, component)

- Root: `fd-endpoint`, shown at `docs/code.html#endpoint`
- Parts: `fd-endpoint-copy`, `fd-endpoint-method`, `fd-endpoint-param`, `fd-endpoint-path`
- On the root: `data-copyable`, `data-method="delete|get|patch|post|put"`, `data-size="sm"`, `data-variant="plain"`
- State, set by Fire: `data-state="copied"`

### JSON viewer (`json`, component)

- Root: `fd-json`, shown at `docs/code.html#json`
- Parts: `fd-json-actions`, `fd-json-bar`, `fd-json-btn`, `fd-json-children`, `fd-json-close`, `fd-json-count`, `fd-json-empty`, `fd-json-label`, `fd-json-line`, `fd-json-meta`, `fd-json-more`, `fd-json-node`, `fd-json-root`, `fd-json-tail`, `fd-json-toggle`, `fd-json-tools`, `fd-json-tree`
- On the root: `data-toolbar`, `data-variant="bare"`
- On `fd-json-btn`: `data-copy="path|value"`
- On `fd-json-node`: `data-container`
- State, set by Fire: `data-state="copied"`

### Log (`log`, component)

- Root: `fd-log`, shown at `docs/code.html#log`
- Parts: `fd-log-bar`, `fd-log-body`, `fd-log-btn`, `fd-log-cmd`, `fd-log-cursor`, `fd-log-dots`, `fd-log-empty`, `fd-log-filter`, `fd-log-filter-count`, `fd-log-filters`, `fd-log-follow`, `fd-log-jump`, `fd-log-level`, `fd-log-mark`, `fd-log-msg`, `fd-log-num`, `fd-log-prompt`, `fd-log-row`, `fd-log-search`, `fd-log-time`, `fd-log-title`, `fd-log-title-text`, `fd-log-tone`
- On the root: `data-anchor="*"`, `data-fit`, `data-follow`, `data-level="info"`, `data-lines`, `data-variant="terminal"`, `data-wrap`
- On `fd-log-btn`: `data-action="*"`, `data-fd-log-demo="api|cli"`
- On `fd-log-filter`: `data-level="debug|error|info|warn"`
- On `fd-log-row`: `data-level="debug|error|info|warn"`
- On `fd-log-tone`: `data-tone="accent|bold|danger|dim|info|success|violet|warning"`
- State, set by Fire: `data-new`, `data-paused`, `data-state="copied"`
- Events: `fd:select`

### Schema (`schema`, component)

- Root: `fd-schema`, shown at `docs/code.html#schema`
- Parts: `fd-schema-children`, `fd-schema-default`, `fd-schema-desc`, `fd-schema-enum`, `fd-schema-head`, `fd-schema-item`, `fd-schema-name`, `fd-schema-opt`, `fd-schema-req`, `fd-schema-toggle`, `fd-schema-type`, `fd-schema-value`

### Snippet (`snippet`, component)

- Root: `fd-snippet`, shown at `docs/code.html#snippet`
- Parts: `fd-snippet-copy`, `fd-snippet-dim`, `fd-snippet-em`, `fd-snippet-prompt`, `fd-snippet-step`, `fd-snippet-step-hint`, `fd-snippet-step-title`, `fd-snippet-steps`, `fd-snippet-text`
- On the root: `data-size="sm"`, `data-variant="accent"`
- On `fd-snippet-step`: `data-state="done"`
- State, set by Fire: `data-state="copied"`

### Viewswitch (`viewswitch`, component)

- Root: `fd-viewswitch`, shown at `docs/code.html#json`
- Parts: `fd-viewswitch-item`
- On the root: `data-size="md"`

## Layout

### Column (`column`, layout)

- Root: `fd-column`, shown at `docs/foundations.html#layout`
- On the root: `data-align="center"`, `data-size="lg|md|sm|xl|xs"`

### Grid (`grid`, layout)

- Root: `fd-grid`, shown at `docs/foundations.html#layout`
- On the root: `data-cols="1|2|3|4|5|6"`, `data-gap="0|0-5|1|1-5|10|12|16|2|2-5|20|24|3|3-5|4|5|6|8"`, `data-gap-x="0|0-5|1|1-5|10|12|16|2|2-5|20|24|3|3-5|4|5|6|8"`, `data-min="2xl|2xs|3xl|3xs|4xl|4xs|5xl|6xl|full|lg|md|sm|xl|xs"`

### Grow (`grow`, layout)

- Root: `fd-grow`, shown at `docs/shell.html#screen`

### Row (`row`, layout)

- Root: `fd-row`, shown at `docs/foundations.html#theming`
- On the root: `data-align="baseline|end|start|stretch"`, `data-gap="0|0-5|1|1-5|10|12|16|2|2-5|20|24|3|3-5|4|5|6|8"`, `data-gap-x="0|0-5|1|1-5|10|12|16|2|2-5|20|24|3|3-5|4|5|6|8"`, `data-justify="between|center|end"`, `data-wrap`

### Stack (`stack`, layout)

- Root: `fd-stack`, shown at `docs/shell.html#split`
- On the root: `data-align="center|end|start"`, `data-gap="0|0-5|1|1-5|10|12|16|2|2-5|20|24|3|3-5|4|5|6|8"`

## Data

### Combined filter (`filters`, component)

- Root: `fd-filters`, shown at `docs/data.html#combined`
- Parts: `fd-filters-add`, `fd-filters-back`, `fd-filters-clear`, `fd-filters-count`, `fd-filters-list`, `fd-filters-menu`, `fd-filters-op`, `fd-filters-panel`, `fd-filters-search`, `fd-filters-sheet`, `fd-filters-value`
- On `fd-filters-add`: `data-icon-only`
- On `fd-filters-back`: `data-icon-only`
- On `fd-filters-panel`: `data-state="open"`
- On `fd-filters-sheet`: `data-static-demo`
- Events: `fd:filter`

### Data Card (`data-card`, component)

- Root: `fd-data-card`, shown at `docs/data.html#data-card`
- Parts: `fd-data-card-body`, `fd-data-card-desc`, `fd-data-card-figure`, `fd-data-card-head`, `fd-data-card-more`, `fd-data-card-title`, `fd-data-card-toggle`, `fd-data-card-unit`
- State, set by Fire: `data-state="closed"`
- Events: `fd:close`, `fd:open`

### Filter (`filter`, component)

- Root: `fd-filter`, shown at `docs/data.html#filters`
- Parts: `fd-filter-applied`, `fd-filter-bar`, `fd-filter-bar-end`, `fd-filter-chevron`, `fd-filter-clear`, `fd-filter-label`, `fd-filter-search`, `fd-filter-token`, `fd-filter-token-key`, `fd-filter-token-remove`, `fd-filter-token-value`, `fd-filter-trigger`, `fd-filter-value`
- On the root: `data-size="sm"`
- State, set by Fire: `data-active`
- Events: `fd:change`

### Kv (`kv`, component)

- Root: `fd-kv`, shown at `docs/data.html#kv`
- Parts: `fd-kv-copy`, `fd-kv-item`, `fd-kv-key`, `fd-kv-text`, `fd-kv-value`
- On the root: `data-cols="1|2|3"`, `data-divided`, `data-keys="plain"`, `data-layout="split"`
- On `fd-kv-value`: `data-copy="*"`, `data-mono`, `data-plain`
- State, set by Fire: `data-copied`

### List (`list`, component)

- Root: `fd-list`, shown at `docs/data.html#lists`
- Parts: `fd-list-body`, `fd-list-chevron`, `fd-list-desc`, `fd-list-lead`, `fd-list-link`, `fd-list-meta`, `fd-list-row`, `fd-list-title`, `fd-list-trail`
- On the root: `data-card`, `data-divided`, `data-interactive`
- On `fd-list-lead`: `data-shape="round"`, `data-tone="accent|danger|info|success|violet|warning"`
- On `fd-list-meta`: `data-end`, `data-mono`
- On `fd-list-row`: `data-unread`, `data-value="*"`
- Events: `fd:change`

### List and detail (`list-detail`, component)

- Root: `fd-list-detail`, shown at `docs/data.html#list-detail`
- Parts: `fd-list-detail-back`, `fd-list-detail-list`, `fd-list-detail-main`
- On the root: `data-view="detail|list"`
- Events: `fd:change`, `fd:select`

### Meter (`meter`, component)

- Root: `fd-meter`, shown at `docs/data.html#meters`
- Parts: `fd-meter-figure`, `fd-meter-fill`, `fd-meter-foot`, `fd-meter-head`, `fd-meter-label`, `fd-meter-legend`, `fd-meter-legend-value`, `fd-meter-seg`, `fd-meter-track`
- On the root: `data-level="danger|warning"`, `data-series="1|2|3|4|5|6"`, `data-size="lg|sm"`, `data-tone="accent|danger|neutral|success|warning"`, `data-variant="inline|segmented"`

### Pipeline (`pipeline`, component)

- Root: `fd-pipeline`, shown at `docs/data.html#pipeline`
- Parts: `fd-pipeline-job`, `fd-pipeline-job-meta`, `fd-pipeline-job-name`, `fd-pipeline-jobs`, `fd-pipeline-stage`, `fd-pipeline-stage-label`, `fd-pipeline-stages`
- On the root: `data-fd-pipeline="manual"`, `data-orientation="horizontal|vertical"`, `data-size="sm"`
- On `fd-pipeline-job`: `data-icon="*"`, `data-live`, `data-state="skipped"`, `data-tone="danger|info|neutral|success|violet|warning"`
- On `fd-pipeline-stage`: `data-when="*"`
- State, set by Fire: `data-overflow="both|end|start" (or bare)`
- Events: `fd:select`

### Progress (`progress`, component)

- Root: `fd-progress`, shown at `docs/data.html#progress`
- Parts: `fd-progress-bar`, `fd-progress-center`, `fd-progress-head`, `fd-progress-label`, `fd-progress-ring-bar`, `fd-progress-ring-track`, `fd-progress-steps`, `fd-progress-track`, `fd-progress-value`
- On the root: `data-indeterminate`, `data-size="16|24|40"`, `data-tone="auto|danger|neutral|success|warning"`, `data-variant="ring|steps"`
- State, set by Fire: `data-complete`, `data-current`, `data-done`, `data-empty`

### Stats (`stats`, component)

- Root: `fd-stats`, shown at `docs/data.html#stats`
- Parts: `fd-stat`, `fd-stat-action`, `fd-stat-delta`, `fd-stat-label`, `fd-stat-row`, `fd-stat-slot`, `fd-stat-sub`, `fd-stat-tile`, `fd-stat-unit`
- On the root: `data-variant="cards"`
- On `fd-stat-delta`: `data-dir="down|flat|up" (or bare)`, `data-tone="danger|neutral|success|warning"`
- On `fd-stat-tile`: `data-card`

### Table (`table`, component)

- Root: `fd-table`, shown at `docs/data.html#activity`
- Parts: `fd-table-bulk`, `fd-table-bulk-actions`, `fd-table-bulk-count`, `fd-table-cell`, `fd-table-check`, `fd-table-detail`, `fd-table-empty`, `fd-table-empty-icon`, `fd-table-empty-text`, `fd-table-empty-title`, `fd-table-expand`, `fd-table-foot`, `fd-table-foot-actions`, `fd-table-foot-info`, `fd-table-group`, `fd-table-group-count`, `fd-table-group-head`, `fd-table-group-title`, `fd-table-group-toggle`, `fd-table-lead`, `fd-table-link`, `fd-table-rows`, `fd-table-scroll`, `fd-table-skeleton`, `fd-table-state`, `fd-table-sub`, `fd-table-title`, `fd-table-trunc`, `fd-table-two`, `fd-table-wrap`, `fd-th-sort`
- On the root: `data-actions`, `data-col="fill|fit|lg|md|sm"`, `data-collapsible`, `data-expand`, `data-expanded`, `data-href`, `data-mono`, `data-muted`, `data-num`, `data-primary`, `data-select`, `data-skeleton`, `data-stack="hide" (or bare)`, `data-stack-only`, `data-stack-title`, `data-sticky`, `data-wrap`
- On `fd-table-check`: `data-select-all`, `data-select-group`, `data-select-row`
- On `fd-table-empty`: `data-tone="danger"`
- On `fd-table-group`: `data-state="closed"`
- On `fd-table-group-count`: `data-auto`
- On `fd-table-group-head`: `data-expand`, `data-select`
- On `fd-table-lead`: `data-shape="round"`, `data-tone="accent|danger|info|success|violet|warning"`
- On `fd-table-skeleton`: `data-shape="circle|pill|tile"`, `data-size="2xs|lg|md|sm|xl|xs"`
- On `fd-table-state`: `data-state="error"`
- On `fd-table-sub`: `data-mono`
- On `fd-table-trunc`: `data-size="lg|sm"`
- On `fd-table-wrap`: `data-variant="plain"`
- State, set by Fire: `data-overflow="both|end|start" (or bare)`, `data-state="closed|open"`
- Events: `fd:change`, `fd:close`, `fd:open`, `fd:select`

## Base

### Divider (`divider`, component)

- Root: `fd-divider`, shown at `docs/shell.html#screen`
- On the root: `data-vertical`

### Icon (`icon`, component)

- Root: `fd-icon`, shown at `docs/elements.html#icon`
- On the root: `data-icon="*"`, `data-icon-fill`, `data-nudge="up-right" (or bare)`, `data-size="12|14|16|20|24|32"`, `data-tone="accent"`
- Element: `<fd-icon>`

### Inline code (`inline-code`, component)

- Root: `fd-code`, shown at `docs/foundations.html#layout`
- Parts: `fd-kbd`
- On the root: `data-tone="accent"`

### Text (`text`, component)

- Root: `fd-muted`, shown at `docs/foundations.html#theming`
- Parts: `fd-accent-text`, `fd-clamp-2`, `fd-clamp-3`, `fd-danger-text`, `fd-faint`, `fd-link`, `fd-success-text`, `fd-text-2`, `fd-truncate`, `fd-warning-text`
- On `fd-link`: `data-quiet`, `data-tone="neutral"`

### Type (`type`, component)

- Root: `fd-display`, shown at `docs/foundations.html#type`
- Parts: `fd-body`, `fd-body-lg`, `fd-caption`, `fd-eyebrow`, `fd-h1`, `fd-h2`, `fd-h3`, `fd-label`, `fd-mono`, `fd-mono-sm`, `fd-num`, `fd-small`, `fd-title`
- On `fd-eyebrow`: `data-tone="accent"`

### Utilities (`utilities`, component)

- Root: `fd-sr-only`, shown at `docs/foundations.html#layout`
- Parts: `fd-cq`, `fd-fade`, `fd-rise`

## Documentation

### API reference (`doc-endpoint`, component)

- Root: `fd-doc-endpoint`, shown at `docs/documentation.html#api-layout`
- Parts: `fd-doc-api`, `fd-doc-api-body`, `fd-doc-api-demo`, `fd-doc-api-head`, `fd-doc-api-side`, `fd-doc-endpoint-base`, `fd-doc-endpoint-copy`, `fd-doc-endpoint-param`, `fd-doc-endpoint-path`, `fd-doc-endpoint-url`, `fd-doc-param`, `fd-doc-param-enum-label`, `fd-doc-param-in`, `fd-doc-params`, `fd-doc-params-empty`, `fd-doc-params-head`, `fd-doc-params-title`, `fd-doc-params-type`, `fd-doc-response`, `fd-doc-response-status`, `fd-doc-try`, `fd-doc-try-checks`, `fd-doc-try-fields`, `fd-doc-try-form`, `fd-doc-try-meta`, `fd-doc-try-result`
- On `fd-doc-params`: `data-in="*"`
- Events: `fd:change`

### Doc Ask (`doc-ask`, component)

- Root: `fd-doc-ask`, shown at `docs/documentation.html#callouts`
- Parts: `fd-doc-ask-text`

### Doc Cards (`doc-cards`, component)

- Root: `fd-doc-cards`, shown at `docs/documentation.html#cards`
- On the root: `data-cols="2|3|4"`

### Doc Changelog (`doc-changelog`, component)

- Root: `fd-doc-changelog`, shown at `docs/documentation.html#changelog`
- Parts: `fd-doc-changelog-filters`, `fd-doc-release`, `fd-doc-release-body`, `fd-doc-release-date`, `fd-doc-release-tags`, `fd-doc-release-time`, `fd-doc-release-title`
- On `fd-doc-release`: `data-latest`

### Doc Frame (`doc-frame`, component)

- Root: `fd-doc-frame`, shown at `docs/documentation.html#picture-frame`
- Parts: `fd-doc-frame-caption`, `fd-doc-frame-media`, `fd-doc-frame-placeholder`, `fd-doc-frame-play`
- On the root: `data-fd-alt="*"`, `data-fd-hosts="*"`, `data-fd-src="*"`, `data-ratio="photo|square|wide"`, `data-state="failed|loaded|loading|refused" (or bare)`, `data-zoom`
- On `fd-doc-frame-placeholder`: `data-ratio="wide"`
- Events: `fd:change`

### Documentation page (`doc`, component)

- Root: `fd-doc`, shown at `docs/documentation.html#shell`
- Parts: `fd-doc-anchor`, `fd-doc-article`, `fd-doc-aside`, `fd-doc-body`, `fd-doc-brand-tag`, `fd-doc-card-head`, `fd-doc-card-icon`, `fd-doc-card-text`, `fd-doc-card-title`, `fd-doc-content`, `fd-doc-copy`, `fd-doc-crumbs`, `fd-doc-cta`, `fd-doc-cta-brand`, `fd-doc-cta-text`, `fd-doc-cta-title`, `fd-doc-eyebrow`, `fd-doc-foot`, `fd-doc-foot-links`, `fd-doc-foot-row`, `fd-doc-footer`, `fd-doc-footer-bar`, `fd-doc-footer-brand`, `fd-doc-footer-col`, `fd-doc-footer-inner`, `fd-doc-footer-note`, `fd-doc-guide`, `fd-doc-guide-desc`, `fd-doc-guide-time`, `fd-doc-guide-title`, `fd-doc-guides`, `fd-doc-head`, `fd-doc-head-action`, `fd-doc-head-meta`, `fd-doc-helpful`, `fd-doc-helpful-actions`, `fd-doc-helpful-form`, `fd-doc-helpful-q`, `fd-doc-helpful-thanks`, `fd-doc-hero`, `fd-doc-hero-popular`, `fd-doc-hero-search`, `fd-doc-hero-title`, `fd-doc-hit`, `fd-doc-lead`, `fd-doc-main`, `fd-doc-method`, `fd-doc-nav`, `fd-doc-nav-chevron`, `fd-doc-nav-group`, `fd-doc-nav-item`, `fd-doc-nav-label`, `fd-doc-nav-links`, `fd-doc-nav-scroll`, `fd-doc-nav-sections`, `fd-doc-nav-sub`, `fd-doc-nav-tag`, `fd-doc-nav-text`, `fd-doc-otp`, `fd-doc-otp-list`, `fd-doc-pager`, `fd-doc-pager-eyebrow`, `fd-doc-pager-link`, `fd-doc-pager-title`, `fd-doc-panel`, `fd-doc-picker`, `fd-doc-releases`, `fd-doc-releases-empty`, `fd-doc-repo`, `fd-doc-repo-name`, `fd-doc-repo-stars`, `fd-doc-sdk`, `fd-doc-sdk-head`, `fd-doc-sdk-meta`, `fd-doc-sdk-name`, `fd-doc-sdks`, `fd-doc-search`, `fd-doc-section`, `fd-doc-section-desc`, `fd-doc-section-head`, `fd-doc-section-title`, `fd-doc-sections`, `fd-doc-sheet`, `fd-doc-shot`, `fd-doc-shot-bar`, `fd-doc-shot-code`, `fd-doc-shot-pane`, `fd-doc-step`, `fd-doc-step-body`, `fd-doc-step-title`, `fd-doc-switch`, `fd-doc-table`, `fd-doc-tabs`, `fd-doc-title`, `fd-doc-toc`, `fd-doc-toc-title`, `fd-doc-top`, `fd-doc-top-end`, `fd-doc-top-row`, `fd-doc-top-start`, `fd-doc-updated`, `fd-doc-zoom`, `fd-doc-zoom-body`, `fd-doc-zoom-caption`, `fd-doc-zoom-close`
- On the root: `data-contained`
- On `fd-doc-article`: `data-width="wide"`
- On `fd-doc-method`: `data-method="delete|get|patch|post|put"`, `data-size="lg"`
- On `fd-doc-nav-tag`: `data-tone="accent"`
- On `fd-doc-otp-list`: `data-level="2"`
- On `fd-doc-pager-link`: `data-dir="next|prev"`
- On `fd-doc-panel`: `data-at-end`, `data-kind="request|response"`
- On `fd-doc-picker`: `data-fd-menu-value`
- On `fd-doc-shot-bar`: `data-tone="accent|strong"`
- On `fd-doc-step`: `data-state="done"`
- On `fd-doc-switch`: `data-mono`
- On `fd-doc-top`: `data-doc-hide="*"`, `data-doc-show="sm"`
- On `fd-doc-top-row`: `data-row="crumbs|sections|tools"`
- On `fd-doc-zoom-close`: `data-size="sm"`
- State, set by Fire: `data-state="done|open|voted"`
- Events: `fd:change`

### Prose (`prose`, component)

- Root: `fd-prose`, shown at `docs/documentation.html#prose`
- On the root: `data-footnotes`, `data-size="lg|sm"`

### Setup steps (`doc-setup`, component)

- Root: `fd-doc-setup`, shown at `docs/documentation.html#setup`
- Parts: `fd-doc-setup-action`, `fd-doc-setup-desc`, `fd-doc-setup-head`, `fd-doc-setup-hint`, `fd-doc-setup-name`, `fd-doc-setup-panel`, `fd-doc-setup-tile`, `fd-doc-setup-tiles`, `fd-doc-setup-title`, `fd-doc-steps`
- Events: `fd:change`

## Texture & loading

### Loader (`loader`, component)

- Root: `fd-spinner`, shown at `docs/skeletons.html#spinners`
- Parts: `fd-bars-loader`, `fd-braille`, `fd-braille-frame`, `fd-dots`, `fd-pending`, `fd-spin`
- On the root: `data-size="12|16|20|24|32"`, `data-tone="accent|muted"`
- On `fd-bars-loader`: `data-tone="accent"`
- On `fd-braille`: `data-tone="accent"`
- On `fd-dots`: `data-size="sm"`
- On `fd-pending`: `data-block`

### Pagebar (`pagebar`, component)

- Root: `fd-pagebar`, shown at `docs/skeletons.html#pending`
- Parts: `fd-pagebar-fill`
- State, set by Fire: `data-scoped`, `data-state="done|idle|running"`

### Skeleton (`skeleton`, component)

- Root: `fd-skeleton`, shown at `docs/skeletons.html#parts`
- Parts: `fd-shimmer`, `fd-skeleton-avatar`, `fd-skeleton-button`, `fd-skeleton-card`, `fd-skeleton-card-foot`, `fd-skeleton-card-head`, `fd-skeleton-card-titles`, `fd-skeleton-chart`, `fd-skeleton-chart-area`, `fd-skeleton-chart-body`, `fd-skeleton-chart-head`, `fd-skeleton-chart-line`, `fd-skeleton-chart-plot`, `fd-skeleton-chart-titles`, `fd-skeleton-chart-x`, `fd-skeleton-chart-y`, `fd-skeleton-form`, `fd-skeleton-form-actions`, `fd-skeleton-form-control`, `fd-skeleton-form-field`, `fd-skeleton-grid`, `fd-skeleton-hero`, `fd-skeleton-list`, `fd-skeleton-list-row`, `fd-skeleton-list-text`, `fd-skeleton-page`, `fd-skeleton-page-body`, `fd-skeleton-page-icons`, `fd-skeleton-page-main`, `fd-skeleton-page-rail`, `fd-skeleton-page-sep`, `fd-skeleton-page-toolbar`, `fd-skeleton-page-top`, `fd-skeleton-stat`, `fd-skeleton-stat-tile`, `fd-skeleton-table`, `fd-skeleton-table-cell`, `fd-skeleton-table-head`, `fd-skeleton-table-row`, `fd-skeleton-text`, `fd-skeleton-thread`, `fd-skeleton-thread-reply`, `fd-skeleton-thread-tool`, `fd-skeleton-thread-user`, `fd-skeleton-tile`, `fd-skeleton-title`
- On `fd-shimmer`: `data-tone="accent"`
- On `fd-skeleton-avatar`: `data-size="16|20|24|40|48"`
- On `fd-skeleton-button`: `data-size="lg|sm"`, `data-square`
- On `fd-skeleton-chart`: `data-variant="bars"`
- On `fd-skeleton-form-control`: `data-search`
- On `fd-skeleton-page-toolbar`: `data-search`
- On `fd-skeleton-text`: `data-size="lg|sm|xs"`
- On `fd-skeleton-tile`: `data-size="16|20|24|32|48"`
- On `fd-skeleton-title`: `data-size="caption|display|eyebrow|h1|h2|h3|label|lead|mono|stat"`

### Texture (`texture`, component)

- Root: `fd-ascii`, shown at `docs/signature.html#fields`
- Parts: `fd-ascii-canvas`, `fd-corners`, `fd-dotgrid`, `fd-glyph`, `fd-noise`
- On the root: `data-animate="false|true"`, `data-fade="bottom|left|radial|right|top|x|y"`, `data-fd-ascii="auto|bars|contour|flame|grid|halftone|orbit|rain|spark|stipple|terrain|waves"`, `data-inline`, `data-ramp="default|dense|glyph|rain|soft"`, `data-side="left|right"`, `data-signature-mark="chars|dashes|dots|plus|squares"`, `data-signature-marks="corners|dots"`, `data-signature-ramp="default|dense|glyph|rain|soft"`, `data-style="chars|dashes|dots|plus|squares"`, `data-tone="accent|contrast|neutral|strong"`, `data-variant="flat|perspective"`
- On `fd-corners`: `data-gap`, `data-size="lg|md|sm|xl"`, `data-tone="accent"`
- On `fd-dotgrid`: `data-fade="bottom|left|radial|right|top|x|y"`, `data-inline`, `data-size="lg|sm"`, `data-tone="accent"`
- On `fd-glyph`: `data-size="40|48|56|64"`, `data-tone="neutral"`
- Element: `<fd-texture>`

## Website

### Article (`site-article`, section)

- Root: `fd-site-article`, shown at `docs/site-sections.html#article`
- Parts: `fd-site-article-actions`, `fd-site-article-aside`, `fd-site-article-body`, `fd-site-article-cover`, `fd-site-article-foot`, `fd-site-article-head`, `fd-site-article-meta`, `fd-site-article-standfirst`, `fd-site-article-text`, `fd-site-article-title`, `fd-site-authors`, `fd-site-authors-item`, `fd-site-authors-name`, `fd-site-authors-role`, `fd-site-notes`, `fd-site-notes-back`, `fd-site-notes-ref`, `fd-site-refs`
- On the root: `data-layout="aside|cover|plain"`, `data-side="end|start"`
- On `fd-site-article-aside`: `data-state="open"`
- On `fd-site-article-text`: `data-breakout`

### Call to action (`site-cta`, section)

- Root: `fd-site-cta`, shown at `docs/site-sections.html#cta`
- Parts: `fd-site-cta-consent`, `fd-site-cta-done`, `fd-site-cta-form`, `fd-site-cta-panel`
- On the root: `data-ground="image"`, `data-layout="band|card|split"`
- On `fd-site-cta-done`: `data-state="sent|subscribed"`
- Events: `fd:change`

### Comparison section (`site-compare`, section)

- Root: `fd-site-compare`, shown at `docs/site-sections.html#compare`
- Parts: `fd-site-compare-no`, `fd-site-compare-table`, `fd-site-compare-tabs`, `fd-site-compare-yes`
- On the root: `data-layout="versus"`, `data-show="1|2|3|4"`
- Events: `fd:change`

### FAQ section (`site-faq`, section)

- Root: `fd-site-faq`, shown at `docs/site-sections.html#faq`
- Parts: `fd-site-faq-answer`, `fd-site-faq-item`, `fd-site-faq-list`, `fd-site-faq-question`
- On the root: `data-layout="columns|list|split"`

### Features section (`site-features`, section)

- Root: `fd-site-features`, shown at `docs/site-sections.html#features`
- Parts: `fd-site-features-icon`, `fd-site-features-item`, `fd-site-features-items`, `fd-site-features-link`, `fd-site-features-media`, `fd-site-features-text`, `fd-site-features-title`
- On the root: `data-layout="bento|grid|list"`

### Hero (`site-hero`, section)

- Root: `fd-site-hero`, shown at `docs/site-sections.html#hero`
- Parts: `fd-site-hero-media`, `fd-site-hero-note`
- On the root: `data-bleed`, `data-ground="image"`, `data-layout="center|split|stack|start"`, `data-side="end|start"`

### Logo strip (`site-logos`, section)

- Root: `fd-site-logos`, shown at `docs/site-sections.html#logos`
- Parts: `fd-site-logos-item`, `fd-site-logos-lead`, `fd-site-logos-list`, `fd-site-logos-pause`, `fd-site-logos-track`
- On the root: `data-layout="grid|marquee|row"`
- On `fd-site-logos-track`: `data-cloned`, `data-paused`

### Posts section (`site-posts`, section)

- Root: `fd-site-posts`, shown at `docs/site-sections.html#posts`
- Parts: `fd-site-posts-count`, `fd-site-posts-cover`, `fd-site-posts-cover-title`, `fd-site-posts-date`, `fd-site-posts-item`, `fd-site-posts-kind`, `fd-site-posts-list`, `fd-site-posts-media`, `fd-site-posts-meta`, `fd-site-posts-summary`, `fd-site-posts-title`, `fd-site-posts-tools`
- On the root: `data-layout="featured|grid|list"`
- On `fd-site-posts-cover`: `data-ground="inverse|raised"`
- On `fd-site-posts-list`: `data-more`
- Events: `fd:change`

### Pricing section (`site-pricing`, section)

- Root: `fd-site-pricing`, shown at `docs/site-sections.html#pricing`
- Parts: `fd-site-pricing-action`, `fd-site-pricing-amount`, `fd-site-pricing-includes`, `fd-site-pricing-name`, `fd-site-pricing-per`, `fd-site-pricing-period`, `fd-site-pricing-plan`, `fd-site-pricing-plans`, `fd-site-pricing-price`, `fd-site-pricing-summary`
- On the root: `data-layout="columns|rows|single"`, `data-period="*"`
- On `fd-site-pricing-plan`: `data-featured`
- Events: `fd:change`

### Quote section (`site-quote`, section)

- Root: `fd-site-quote`, shown at `docs/site-sections.html#quote`
- Parts: `fd-site-quote-cite`, `fd-site-quote-item`, `fd-site-quote-list`, `fd-site-quote-mark`, `fd-site-quote-name`, `fd-site-quote-role`, `fd-site-quote-stat`, `fd-site-quote-text`, `fd-site-quote-who`
- On the root: `data-layout="grid|pair|proof|single"`

### Section head (`site-head`, pattern)

- Root: `fd-site-head`, shown at `docs/site.html#head`
- Parts: `fd-site-eyebrow`, `fd-site-head-actions`
- On the root: `data-align="center|start"`, `data-layout="split|stack"`

### Site (`site`, pattern)

- Root: `fd-site`, shown at `docs/site.html#shell`
- Parts: `fd-site-backdrop`, `fd-site-display`, `fd-site-heading`, `fd-site-index`, `fd-site-lead`, `fd-site-section`, `fd-site-shot`, `fd-site-text`, `fd-site-title`
- On the root: `data-contained`, `data-ground="page"`, `data-rhythm="tight"`
- On `fd-site-backdrop`: `data-position="center|end|start"`
- On `fd-site-section`: `data-ground="accent|image|inverse|page|raised|sunken|texture"`, `data-layout="center"`, `data-rhythm="loose|tight"`, `data-rule`, `data-scrim="dark|light"`, `data-treatment="duotone|mono|natural|wash"`

### Site container (`site-container`, pattern)

- Root: `fd-site-container`, shown at `docs/site.html#container`
- On the root: `data-width="full|narrow"`

### Site footer (`site-footer`, section)

- Root: `fd-site-footer`, shown at `docs/site-sections.html#footer`
- Parts: `fd-site-footer-brand`, `fd-site-footer-col`, `fd-site-footer-col-title`, `fd-site-footer-cols`, `fd-site-footer-legal`, `fd-site-footer-signup`, `fd-site-footer-text`, `fd-site-footer-wordmark`
- On the root: `data-layout="columns|compact|wordmark"`
- Events: `fd:change`

### Site header (`site-header`, section)

- Root: `fd-site-header`, shown at `docs/site-sections.html#header`
- Parts: `fd-site-header-actions`, `fd-site-header-bar`, `fd-site-header-link`, `fd-site-header-links`, `fd-site-header-nav`, `fd-site-header-toggle`
- On the root: `data-layout="centered|inline"`, `data-scrolled`, `data-state="open"`
- On `fd-site-header-links`: `data-sheet`
- Events: `fd:close`, `fd:open`

### Site picture (`site-media`, component)

- Root: `fd-site-media`, shown at `docs/site.html#pictures`
- On the root: `data-frame`, `data-position="center|end|start"`, `data-ratio="photo|portrait|square|tall|wide"`, `data-treatment="duotone|mono|natural|wash"`

### Split section (`site-split`, section)

- Root: `fd-site-split`, shown at `docs/site-sections.html#split`
- Parts: `fd-site-points`, `fd-site-points-item`, `fd-site-points-text`, `fd-site-points-title`, `fd-site-split-media`, `fd-site-split-text`
- On the root: `data-ratio="even|media" (or bare)`, `data-side="end|start" (or bare)`, `data-sticky`

### Stats section (`site-stats`, section)

- Root: `fd-site-stats`, shown at `docs/site-sections.html#stats`
- Parts: `fd-site-stats-figure`, `fd-site-stats-item`, `fd-site-stats-label`, `fd-site-stats-list`, `fd-site-stats-note`, `fd-site-stats-unit`
- On the root: `data-layout="grid|lead|row"`

### Steps section (`site-steps`, section)

- Root: `fd-site-steps`, shown at `docs/site-sections.html#steps`
- Parts: `fd-site-steps-aside`, `fd-site-steps-detail`, `fd-site-steps-item`, `fd-site-steps-list`, `fd-site-steps-text`, `fd-site-steps-title`
- On the root: `data-layout="rail|row"`

## Tweaks

### Tweaks (`tweaks`, component)

- Root: `fd-tweaks`, shown at `docs/tweaks.html#panel`
- Parts: `fd-tweaks-body`, `fd-tweaks-chip`, `fd-tweaks-chips`, `fd-tweaks-corner`, `fd-tweaks-eyebrow`, `fd-tweaks-face`, `fd-tweaks-face-name`, `fd-tweaks-face-sample`, `fd-tweaks-faces`, `fd-tweaks-foot`, `fd-tweaks-grab`, `fd-tweaks-head`, `fd-tweaks-label`, `fd-tweaks-launcher`, `fd-tweaks-look`, `fd-tweaks-look-mark`, `fd-tweaks-look-name`, `fd-tweaks-look-sample`, `fd-tweaks-look-tile`, `fd-tweaks-looks`, `fd-tweaks-palettes`, `fd-tweaks-range`, `fd-tweaks-readout`, `fd-tweaks-reset`, `fd-tweaks-row`, `fd-tweaks-row-head`, `fd-tweaks-rule`, `fd-tweaks-section`, `fd-tweaks-summary`, `fd-tweaks-swatch`, `fd-tweaks-swatch-dot`, `fd-tweaks-swatch-ink`, `fd-tweaks-swatch-name`, `fd-tweaks-swatch-tile`, `fd-tweaks-title`, `fd-tweaks-tone`, `fd-tweaks-value`
- On `fd-tweaks-corner`: `data-shape="round|square"`
- On `fd-tweaks-row`: `data-inline`
- On `fd-tweaks-rule`: `data-weight="1|1.5|2"`
- State, set by Fire: `data-changed`, `data-dragging`, `data-moved`, `data-state="closed|open"`

## Modules

Parts with no class of their own: functions a page calls.

- `email`: Email, shown at `docs/email.html#examples`
- `initial-helpers`: Initial mark helpers, shown at `docs/shell.html#initial-mark`
- `theme-record`: Theme record, shown at `docs/tweaks.html#records`
- `transitions`: Page transitions, shown at `docs/transitions.html#demo`

184 components, patterns, layouts and sections; 1656 classes.
