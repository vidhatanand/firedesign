<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { IconName } from 'fire-design';

// The app shell of templates/shell-static.html. The sidebar and the phone menu list the same destinations; the three
// that this starter has are router links (RouterLink sets aria-current="page" on the current one, which is what
// Fire's nav styles read), the others are placeholders for your own routes.
interface NavItem { label: string; icon: IconName; keys: string; to?: string; badge?: string }
interface NavGroup { label?: string; items: NavItem[] }

const nav: NavGroup[] = [
  { items: [{ label: 'Overview', icon: 'home', keys: 'g o', to: '/overview' }, { label: 'Catalog', icon: 'blocks', keys: 'g c', badge: 'New' }] },
  { label: 'Team', items: [{ label: 'Members', icon: 'users', keys: 'g m' }, { label: 'API keys', icon: 'key-round', keys: 'g k' }, { label: 'Decisions', icon: 'inbox', keys: 'g d' }, { label: 'Activity logs', icon: 'list', keys: 'g l', to: '/logs' }] },
  { label: 'Account', items: [{ label: 'Usage', icon: 'chart-column', keys: 'g u' }, { label: 'Settings', icon: 'settings', keys: 'g s', to: '/settings' }] },
];

const route = useRoute();
</script>

<template>
  <!-- data-fd-rail-tips is written by Fire when it runs; it is in the markup too, so that the app has the same attributes before and after Fire.
       (Chromium reports a stale 0px for the auto margins of .fd-frame if the attribute arrives after the first layout.) -->
  <div class="fd-app" data-sidebar="expanded" data-fd-rail-tips>

    <aside class="fd-sidebar" aria-label="Ember">
      <div class="fd-sidebar-head">
        <RouterLink class="fd-brand" to="/overview">
          <span class="fd-brand-mark"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4.5" y="7.5" width="12" height="12" rx="3.25" transform="rotate(45 10.5 13.5)"/><circle cx="19" cy="5" r="2.5"/><circle cx="14.25" cy="2.25" r="1.25" opacity=".55"/></svg></span>
          <span class="fd-brand-name">Ember</span>
        </RouterLink>
        <button class="fd-btn fd-sidebar-toggle" type="button" data-variant="ghost" data-size="lg" data-icon-only data-fd-sidebar-toggle aria-label="Collapse sidebar"><svg class="fd-icon" data-icon="panel-left" aria-hidden="true"><use href="#i-panel-left"></use></svg></button>
      </div>
      <div class="fd-sidebar-body">
        <nav class="fd-nav" aria-label="Main">
          <template v-for="group in nav" :key="group.label ?? 'main'">
            <p v-if="group.label" class="fd-nav-label">{{ group.label }}</p>
            <component :is="item.to ? 'RouterLink' : 'a'" v-for="item in group.items" :key="item.label" class="fd-nav-item" :data-fd-keys="item.keys" v-bind="item.to ? { to: item.to } : { href: '#' }">
              <!-- the icon's name comes from data, so it is the element (EXPORT I1) -->
              <fd-icon :icon="item.icon"></fd-icon><span class="fd-nav-text">{{ item.label }}</span><span v-if="item.badge" class="fd-nav-badge">{{ item.badge }}</span>
            </component>
          </template>
        </nav>
      </div>
      <div class="fd-sidebar-foot">
        <RouterLink class="fd-account" to="/settings" aria-label="Account, maya@quarry.dev"><span class="fd-account-avatar" aria-hidden="true">MR</span><span class="fd-account-email">maya@quarry.dev</span></RouterLink>
      </div>
    </aside>

    <div class="fd-main">
      <header class="fd-topbar">
        <RouterLink class="fd-topbar-brand" data-only="mobile" to="/overview" aria-label="Ember overview"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4.5" y="7.5" width="12" height="12" rx="3.25" transform="rotate(45 10.5 13.5)"/><circle cx="19" cy="5" r="2.5"/><circle cx="14.25" cy="2.25" r="1.25" opacity=".55"/></svg></RouterLink>
        <span class="fd-topbar-title">Quarry Labs</span>
        <div class="fd-topbar-actions">
          <!-- Running now: the pill counts the items of its popover. Service status: the server sets "degraded" or "outage". -->
          <button class="fd-running" type="button" data-fd-running="ember-running" data-fd-popover="ember-running" data-placement="bottom-end" aria-label="2 running"><span class="fd-running-dot" aria-hidden="true"></span><span class="fd-running-count">2</span><span class="fd-running-label">running</span></button>
          <a class="fd-service-status" data-status="operational" href="https://status.ember.dev" target="_blank" rel="noopener" data-fd-tooltip="All systems operational" aria-label="All systems operational"><svg class="fd-icon" data-icon="activity" aria-hidden="true"><use href="#i-activity"></use></svg><span class="fd-service-status-label">All systems operational</span></a>
          <button class="fd-btn" type="button" data-only="desktop" data-fd-command-open="ember-command" data-fd-keys="/" data-fd-keys-label="Search"><svg class="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search"></use></svg><span class="fd-grow fd-muted">Search…</span><kbd class="fd-kbd">⌘K</kbd></button>
          <button class="fd-btn" type="button" data-icon-only data-only="desktop" data-fd-dialog-open="ember-shortcuts" data-fd-keys="?" data-fd-keys-label="Keyboard shortcuts" data-fd-tooltip="Keyboard shortcuts" aria-label="Keyboard shortcuts"><svg class="fd-icon" data-icon="keyboard" aria-hidden="true"><use href="#i-keyboard"></use></svg></button>
          <button class="fd-btn" type="button" data-icon-only data-fd-tweaks-open data-fd-tooltip="Tweaks" aria-label="Tweaks" aria-expanded="false"><svg class="fd-icon" data-icon="sliders-horizontal" aria-hidden="true"><use href="#i-sliders-horizontal"></use></svg></button>
          <a class="fd-btn" data-variant="ghost" data-only="desktop" href="https://docs.ember.dev"><svg class="fd-icon" data-icon="book-open" aria-hidden="true"><use href="#i-book-open"></use></svg><span>Docs</span></a>
          <RouterLink class="fd-btn" data-only="desktop" to="/settings"><svg class="fd-icon" data-icon="user" aria-hidden="true"><use href="#i-user"></use></svg><span>Your account</span></RouterLink>
          <button class="fd-btn" type="button" data-icon-only data-only="mobile" data-fd-mobile-nav aria-controls="ember-mobile-nav" aria-expanded="false" aria-label="Open menu"><svg class="fd-icon" data-icon="menu" aria-hidden="true"><use href="#i-menu"></use></svg></button>
        </div>
      </header>

      <!-- v-fire: Fire's init runs on the page after it mounts and after each update. The router option of the plugin
           runs it once more on the whole document after a route change. -->
      <main class="fd-page" v-fire>
        <RouterView :key="route.path" />
      </main>
    </div>

    <div class="fd-mobile-nav" id="ember-mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" data-state="closed" hidden>
      <RouterLink class="fd-mobile-nav-account" to="/settings"><span>maya@quarry.dev</span><span class="fd-account-avatar" aria-hidden="true">MR</span></RouterLink>
      <div v-for="group in nav" :key="group.label ?? 'main'" class="fd-mobile-nav-section">
        <p v-if="group.label" class="fd-mobile-nav-label">{{ group.label }}</p>
        <component :is="item.to ? 'RouterLink' : 'a'" v-for="item in group.items" :key="item.label" class="fd-mobile-nav-item" v-bind="item.to ? { to: item.to } : { href: '#' }">
          <span>{{ item.label }}</span><span v-if="item.badge" class="fd-nav-badge">{{ item.badge }}</span><fd-icon :icon="item.icon"></fd-icon>
        </component>
      </div>
    </div>

    <div class="fd-popover" id="ember-running" popover data-size="lg" aria-label="Running now">
      <div class="fd-popover-head"><p class="fd-popover-title">Running now</p></div>
      <div class="fd-popover-body">
        <div class="fd-running-list">
          <RouterLink class="fd-running-item" to="/logs#run_8f2a91" data-kind="crawl"><span class="fd-tile" data-size="28" data-tone="accent"><svg class="fd-icon" data-icon="network" aria-hidden="true"><use href="#i-network"></use></svg></span><span class="fd-running-title">Crawl docs.quarry.dev</span><span class="fd-running-time">2m 08s</span><span class="fd-running-meta">412 of 1,200 pages</span><span class="fd-running-bar" data-fd-vars="--value: 0.34" aria-hidden="true"></span></RouterLink>
          <a class="fd-running-item" href="#" data-kind="monitor"><span class="fd-tile" data-size="28" data-tone="neutral"><svg class="fd-icon" data-icon="radar" aria-hidden="true"><use href="#i-radar"></use></svg></span><span class="fd-running-title">Monitor: acme.dev/changelog</span><span class="fd-running-time">12s</span><span class="fd-running-meta">Checking now · 6 pages</span><span class="fd-running-bar" data-fd-vars="--value: 0.8" aria-hidden="true"></span></a>
        </div>
      </div>
      <div class="fd-popover-foot" data-align="center"><RouterLink class="fd-btn-text" to="/logs"><span>View all runs</span><svg class="fd-icon" data-nudge data-icon="arrow-right" aria-hidden="true"><use href="#i-arrow-right"></use></svg></RouterLink></div>
    </div>

    <dialog class="fd-dialog" id="ember-shortcuts" data-size="md" data-fd-shortcuts>
      <div class="fd-dialog-head">
        <h2 class="fd-h3 fd-dialog-title">Keyboard shortcuts</h2>
        <p class="fd-dialog-desc">They work anywhere except in a field.</p>
        <button class="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close"><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg></button>
      </div>
      <div class="fd-dialog-body"><div data-fd-shortcuts-list></div></div>
    </dialog>

    <dialog class="fd-command" id="ember-command" aria-label="Command palette">
      <div class="fd-command-search">
        <svg class="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search"></use></svg>
        <input class="fd-command-input" type="text" placeholder="Search pages and records…" aria-label="Search commands" autocomplete="off" spellcheck="false">
        <kbd class="fd-kbd">esc</kbd>
      </div>
      <div class="fd-command-list">
        <div class="fd-command-group">
          <p class="fd-command-group-label">Navigation</p>
          <RouterLink class="fd-command-item" to="/overview" data-keywords="home dashboard credits"><svg class="fd-icon" data-icon="home" aria-hidden="true"><use href="#i-home"></use></svg><span class="fd-command-item-label">Overview</span></RouterLink>
          <RouterLink class="fd-command-item" to="/logs" data-keywords="requests history"><svg class="fd-icon" data-icon="list" aria-hidden="true"><use href="#i-list"></use></svg><span class="fd-command-item-label">Activity logs</span></RouterLink>
          <a class="fd-command-item" href="#" data-keywords="credits billing plan"><svg class="fd-icon" data-icon="chart-column" aria-hidden="true"><use href="#i-chart-column"></use></svg><span class="fd-command-item-label">Usage</span></a>
          <RouterLink class="fd-command-item" to="/settings" data-keywords="preferences team account"><svg class="fd-icon" data-icon="settings" aria-hidden="true"><use href="#i-settings"></use></svg><span class="fd-command-item-label">Settings</span></RouterLink>
        </div>
      </div>
      <div class="fd-command-empty" hidden>
        <svg class="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search"></use></svg>
        <p class="fd-command-empty-title">No results for “<span data-fd-command-query></span>”</p>
        <p class="fd-command-empty-text">Try a page name or a run ID.</p>
      </div>
      <div class="fd-command-foot">
        <span><kbd class="fd-kbd">↑</kbd><kbd class="fd-kbd">↓</kbd>navigate</span>
        <span><kbd class="fd-kbd">↵</kbd>select</span>
        <span><kbd class="fd-kbd">esc</kbd>close</span>
      </div>
    </dialog>

    <button class="fd-fab fd-app-fab fd-chat-launcher" type="button" data-fd-chat-toggle="ember-chat" data-fd-tooltip="Chat with support" data-placement="left" aria-label="Chat with support"><span class="fd-chat-launcher-icon" data-role="open"><svg class="fd-icon" data-icon="message-circle" aria-hidden="true"><use href="#i-message-circle"></use></svg></span><span class="fd-chat-launcher-icon" data-role="close"><svg class="fd-icon" data-icon="chevron-down" aria-hidden="true"><use href="#i-chevron-down"></use></svg></span><span class="fd-chat-launcher-badge" hidden></span></button>

  </div>

  <!-- The support chat is a fixed panel at the end of <body>, outside the shell's layout (as templates/shell.js does). Fire builds its contents. -->
  <Teleport to="body">
    <section class="fd-chat" id="ember-chat" data-mode="panel" data-state="closed" data-fd-chat-demo aria-label="Ember support"></section>
  </Teleport>
</template>
