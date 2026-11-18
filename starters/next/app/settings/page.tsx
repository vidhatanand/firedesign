// The settings screen: the .fd-page of templates/settings.html, converted to JSX per spec/EXPORT.md (a server
// component: plain Fire markup, no Fire script). SettingsScreen renders the <main class="fd-page"> and runs the screen's
// behaviour in the browser once Fire has loaded.
import type { Metadata } from 'next';
import { SettingsScreen } from './settings-screen';
import { resolveTab } from './tabs';


export const metadata: Metadata = { title: 'Settings · Ember' };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const tab = resolveTab((await searchParams).tab);
  return (
    <SettingsScreen>
      <div className="fd-frame">
        <section className="fd-band fd-rise" data-pad="sm" aria-label="Page head">
          <div className="fd-page-head">
            <div className="fd-page-head-text">
              <h1 className="fd-page-head-title">Settings</h1>
              <p className="fd-page-head-desc">Your account, the Quarry Labs team and how it uses Ember.</p>
            </div>
            <div className="fd-page-head-actions">
              <a className="fd-btn" data-variant="outline" href="audit.html">
                <svg className="fd-icon" data-icon="scroll-text" aria-hidden="true"><use href="#i-scroll-text" /></svg>
                <span>Audit log</span>
              </a>
            </div>
          </div>
        </section>
        <section className="fd-band fd-rise" data-fd-vars="--fd-i: 1" data-pad="none" data-grow="" aria-label="Settings" suppressHydrationWarning>
          <div className="fd-split" data-side="start">
            <aside className="fd-panel" aria-label="Settings sections">
              <nav className="fd-subnav" aria-label="Settings">
                <a className="fd-subnav-item" href="?tab=account" data-tab="account" aria-current={tab === 'account' ? 'page' : undefined}>
                  <svg className="fd-icon" data-icon="user" aria-hidden="true"><use href="#i-user" /></svg>
                  <span>Account</span>
                </a>
                <a className="fd-subnav-item" href="?tab=notifications" data-tab="notifications" aria-current={tab === 'notifications' ? 'page' : undefined}>
                  <svg className="fd-icon" data-icon="bell" aria-hidden="true"><use href="#i-bell" /></svg>
                  <span>Notifications</span>
                </a>
                <hr className="fd-subnav-sep" />
                <a className="fd-subnav-item" href="?tab=team" data-tab="team" aria-current={tab === 'team' ? 'page' : undefined}>
                  <svg className="fd-icon" data-icon="users" aria-hidden="true"><use href="#i-users" /></svg>
                  <span>Team</span>
                  <span className="fd-subnav-meta" data-bind="member-count">4</span>
                </a>
                <a className="fd-subnav-item" href="?tab=features" data-tab="features" aria-current={tab === 'features' ? 'page' : undefined}>
                  <svg className="fd-icon" data-icon="toggle-left" aria-hidden="true"><use href="#i-toggle-left" /></svg>
                  <span>Features</span>
                  <span className="fd-subnav-meta" data-bind="features-on">6</span>
                </a>
                <a className="fd-subnav-item" href="?tab=billing" data-tab="billing" aria-current={tab === 'billing' ? 'page' : undefined}>
                  <svg className="fd-icon" data-icon="credit-card" aria-hidden="true"><use href="#i-credit-card" /></svg>
                  <span>Billing</span>
                </a>
                <hr className="fd-subnav-sep" />
                <a className="fd-subnav-item" href="?tab=data-sources" data-tab="data-sources" aria-current={tab === 'data-sources' ? 'page' : undefined}>
                  <svg className="fd-icon" data-icon="database" aria-hidden="true"><use href="#i-database" /></svg>
                  <span>Data sources</span>
                  <span className="fd-subnav-meta" data-bind="sources-on">4</span>
                </a>
                <a className="fd-subnav-item" href="?tab=connected-apps" data-tab="connected-apps" aria-current={tab === 'connected-apps' ? 'page' : undefined}>
                  <svg className="fd-icon" data-icon="plug" aria-hidden="true"><use href="#i-plug" /></svg>
                  <span>Connected apps</span>
                  <span className="fd-subnav-meta" data-bind="apps-total">4</span>
                </a>
                <a className="fd-subnav-item" href="?tab=advanced" data-tab="advanced" aria-current={tab === 'advanced' ? 'page' : undefined}>
                  <svg className="fd-icon" data-icon="settings-2" aria-hidden="true"><use href="#i-settings-2" /></svg>
                  <span>Advanced</span>
                </a>
              </nav>
            </aside>
            <div className="fd-split-main">
              <div className="fd-states" id="settings-states" data-state="ready">
                {/* Loading: the shape of a settings panel */}
                <div className="fd-stack" data-gap="6" data-when="loading" aria-busy="true" aria-label="Loading settings">
                  <div className="fd-skeleton-text" data-lines="2"></div>
                  <div className="fd-skeleton-list" data-rows="5"></div>
                </div>
                {/* Error */}
                <div className="fd-empty" data-tone="danger" data-when="error" role="alert">
                  <span className="fd-empty-icon">
                    <svg className="fd-icon" data-icon="triangle-alert" aria-hidden="true"><use href="#i-triangle-alert" /></svg>
                  </span>
                  <h2 className="fd-empty-title">Couldn’t load settings</h2>
                  <p className="fd-empty-text">The request timed out after 10 seconds. Nothing you saved was lost.</p>
                  <div className="fd-empty-actions">
                    <button className="fd-btn" type="button" data-fd-set-state="loading">
                      <svg className="fd-icon" data-icon="refresh-cw" aria-hidden="true"><use href="#i-refresh-cw" /></svg>
                      <span>Try again</span>
                    </button>
                  </div>
                  <p className="fd-empty-meta">
                    <span>Request ID</span>
                    <code className="fd-code">req_5c81d0e2</code>
                    <button className="fd-btn" type="button" data-size="xs" data-variant="ghost" data-icon-only="" data-fd-copy="req_5c81d0e2" aria-label="Copy request ID">
                      <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
                    </button>
                  </p>
                </div>
                {/* Ready: one panel per subnav item */}
                <div data-when="ready">
                  {/* ===================================================== Account */}
                  <section className="fd-stack" data-gap="1" id="panel-account" data-panel="account" aria-labelledby="h-account" hidden={tab !== 'account'}>
                    <header className="fd-stack" data-gap="1">
                      <h2 className="fd-h2" id="h-account" tabIndex={-1}>Account</h2>
                      <p className="fd-muted">Sign-in, appearance and privacy for <span className="fd-mono">maya@quarry.dev</span>.</p>
                    </header>
                    <div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Change password</h3>
                          <p className="fd-setting-desc">You sign in with Google. To also sign in with a password, we will email you a link to set one.</p>
                        </div>
                        <div className="fd-setting-control">
                          <button className="fd-btn" type="button" data-fd-toast={"{\"title\":\"Check your inbox\",\"description\":\"We sent a link to maya@quarry.dev. It expires in 30 minutes.\",\"tone\":\"success\"}"}>
                            <svg className="fd-icon" data-icon="key-round" aria-hidden="true"><use href="#i-key-round" /></svg>
                            <span>Email me a link</span>
                          </button>
                        </div>
                      </div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Email preferences</h3>
                          <div className="fd-stack" data-gap="3">
                            <p className="fd-setting-desc">Ember emails <span className="fd-mono">maya@quarry.dev</span> about:</p>
                            <ul className="fd-feature-list" data-size="sm">
                              <li>
                                <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                <span>Product updates and new endpoints, about twice a month</span>
                              </li>
                              <li>
                                <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                <span>Receipts and security notices, always on</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                        <div className="fd-setting-control">
                          <button className="fd-btn" type="button" data-fd-toast={"{\"title\":\"Preferences email sent\",\"description\":\"Open it to change what Ember sends you.\",\"tone\":\"success\"}"}>
                            <span>Send</span>
                          </button>
                        </div>
                      </div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Two-factor authentication</h3>
                          <p className="fd-setting-desc">Ask for a code from your authenticator app each time you sign in on a new device.</p>
                        </div>
                        <div className="fd-setting-control">
                          <label className="fd-switch">
                            <input type="checkbox" role="switch" id="twofa-switch" aria-label="Two-factor authentication" />
                            <span className="fd-switch-track"></span>
                          </label>
                        </div>
                      </div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Appearance</h3>
                          <p className="fd-setting-desc">Current: <strong data-bind="theme-label">Light (System)</strong></p>
                        </div>
                        <div className="fd-setting-control">
                          <div className="fd-segmented" data-icon-only="" role="radiogroup" aria-label="Appearance" id="seg-theme">
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Light" data-value="light">
                              <svg className="fd-icon" data-icon="sun" aria-hidden="true"><use href="#i-sun" /></svg>
                            </button>
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Dark" data-value="dark">
                              <svg className="fd-icon" data-icon="moon" aria-hidden="true"><use href="#i-moon" /></svg>
                            </button>
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="true" aria-label="System" data-value="system">
                              <svg className="fd-icon" data-icon="monitor" aria-hidden="true"><use href="#i-monitor" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Density</h3>
                          <p className="fd-setting-desc">Compact tightens rows and controls so more fits on screen.</p>
                        </div>
                        <div className="fd-setting-control">
                          <div className="fd-segmented" role="radiogroup" aria-label="Density" id="seg-density">
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="true" data-value="comfortable">Comfortable</button>
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="compact">Compact</button>
                          </div>
                        </div>
                      </div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Accent</h3>
                          <p className="fd-setting-desc">Pick the colour for buttons, links and active states on this device.</p>
                        </div>
                        <div className="fd-setting-control">
                          <div className="fd-segmented" data-icon-only="" data-size="sm" role="radiogroup" aria-label="Accent colour" id="seg-accent">
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="true" aria-label="Ember" data-value="ember">
                              <span className="fd-badge" data-variant="solid" data-dot="" data-accent="ember"></span>
                            </button>
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Volt" data-value="volt">
                              <span className="fd-badge" data-variant="solid" data-dot="" data-accent="volt"></span>
                            </button>
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Iris" data-value="iris">
                              <span className="fd-badge" data-variant="solid" data-dot="" data-accent="iris"></span>
                            </button>
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Ocean" data-value="ocean">
                              <span className="fd-badge" data-variant="solid" data-dot="" data-accent="ocean"></span>
                            </button>
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Forest" data-value="forest">
                              <span className="fd-badge" data-variant="solid" data-dot="" data-accent="forest"></span>
                            </button>
                            <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" aria-label="Ink" data-value="ink">
                              <span className="fd-badge" data-variant="solid" data-dot="" data-accent="ink"></span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Privacy mode</h3>
                          <p className="fd-setting-desc">Hide sensitive account details while you share your screen. Blurs your email in the sidebar; hover it to reveal.</p>
                        </div>
                        <div className="fd-setting-control">
                          <label className="fd-switch">
                            <input type="checkbox" role="switch" id="privacy-switch" aria-label="Privacy mode" />
                            <span className="fd-switch-track"></span>
                            <span className="fd-switch-text">
                              <span className="fd-switch-label" data-bind="privacy-label">Off</span>
                            </span>
                          </label>
                        </div>
                      </div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Account owner email</h3>
                          <p className="fd-setting-desc"><strong className="fd-mono">maya@quarry.dev</strong> owns this account and receives billing and security emails.</p>
                        </div>
                        <div className="fd-setting-control">
                          <button className="fd-btn" type="button" data-variant="outline" data-fd-dialog-open="dlg-email">
                            <svg className="fd-icon" data-icon="pencil" aria-hidden="true"><use href="#i-pencil" /></svg>
                            <span>Change email</span>
                          </button>
                        </div>
                      </div>
                      <div className="fd-setting" data-tone="danger">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Delete account</h3>
                          <p className="fd-setting-desc">Permanently delete your account, API keys and run history. <strong>This cannot be undone.</strong></p>
                        </div>
                        <div className="fd-setting-control">
                          <button className="fd-btn" type="button" data-variant="danger" data-fd-dialog-open="dlg-delete-account">Delete account</button>
                        </div>
                      </div>
                    </div>
                  </section>
                  {/* ===================================================== Team */}
                  <form className="fd-stack" data-gap="1" id="panel-team" data-panel="team" aria-labelledby="h-team" data-fd-dirty="" noValidate autoComplete="off" hidden={tab !== 'team'}>
                    <header className="fd-stack" data-gap="1">
                      <h2 className="fd-h2" id="h-team" tabIndex={-1}>Team</h2>
                      <p className="fd-muted" data-bind="team-summary">Quarry Labs · 4 members · 2 pending invites</p>
                      {/* Who can edit: always on the page, so nobody finds out by trying */}
                      <p className="fd-row fd-small fd-muted" data-gap="1-5" id="team-editors">
                        <svg className="fd-icon" data-size="14" data-icon="users" aria-hidden="true"><use href="#i-users" /></svg>
                        <span>Owners and admins can edit. Last changed by <span data-bind="team-changed-by">Tomasz Nowak, Nov 12</span>.</span>
                      </p>
                      <p className="fd-row fd-small fd-muted" data-gap="1-5" id="team-viewer" data-member-only="" hidden>
                        <svg className="fd-icon" data-size="14" data-icon="lock" aria-hidden="true"><use href="#i-lock" /></svg>
                        <span>You are a member, so you can read these settings. Ask Maya Reyes or Tomasz Nowak to change them.</span>
                      </p>
                    </header>
                    <div>
                      <div className="fd-form-row" data-layout="stack">
                        <div className="fd-form-row-text">
                          <label className="fd-form-row-label" htmlFor="team-name">Team name</label>
                          <span className="fd-form-row-desc">Shown on invoices and to the people you invite.</span>
                        </div>
                        <div className="fd-form-row-control">
                          <div className="fd-field">
                            <input className="fd-input" id="team-name" name="name" defaultValue="Quarry Labs" maxLength={40} autoComplete="off" aria-describedby="team-name-error" data-admin="" />
                            <p className="fd-field-error" id="team-name-error" hidden>
                              <svg className="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert" /></svg>
                              <span>Enter a team name.</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="fd-form-row" data-layout="stack">
                        <div className="fd-form-row-text">
                          <label className="fd-form-row-label" htmlFor="team-slug">Team slug</label>
                          <span className="fd-form-row-desc">A vanity name for your team URLs. Leave it blank to use the team ID.</span>
                        </div>
                        <div className="fd-form-row-control">
                          <div className="fd-field">
                            <input className="fd-input" id="team-slug" name="slug" defaultValue="quarry-labs" placeholder="e.g. quarry-labs" autoComplete="off" spellCheck="false" aria-describedby="team-slug-hint team-slug-error" data-admin="" />
                            <p className="fd-field-hint" id="team-slug-hint" data-mono="">ember.dev/app/t/<span data-bind="slug-preview">quarry-labs</span>/usage</p>
                            <p className="fd-field-error" id="team-slug-error" hidden>
                              <svg className="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert" /></svg>
                              <span>Use 3 to 32 lowercase letters, numbers or dashes.</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="fd-form-row" data-layout="stack">
                        <div className="fd-form-row-text">
                          <span className="fd-form-row-label" id="team-region-label">Default region</span>
                          <span className="fd-form-row-desc">Where new crawls and scrapes run unless a request names one.</span>
                        </div>
                        <div className="fd-form-row-control">
                          <div className="fd-segmented" role="radiogroup" aria-labelledby="team-region-label" id="team-region">
                            <label className="fd-segmented-item">
                              <input type="radio" name="region" value="us-east" data-admin="" />
                              <span>US East</span>
                            </label>
                            <label className="fd-segmented-item">
                              <input type="radio" name="region" value="eu-west" defaultChecked data-admin="" />
                              <span>EU West</span>
                            </label>
                            <label className="fd-segmented-item">
                              <input type="radio" name="region" value="ap-south" data-admin="" />
                              <span>Asia Pacific</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="fd-form-row" data-layout="stack">
                        <div className="fd-form-row-text">
                          <label className="fd-form-row-label" htmlFor="invite-email">Invite team members</label>
                          <span className="fd-form-row-desc">Add people to Quarry Labs. Invites expire after 7 days.</span>
                        </div>
                        <div className="fd-form-row-control">
                          <div className="fd-field">
                            <div className="fd-input-pair">
                              <input className="fd-input" type="email" id="invite-email" placeholder="Enter email address" autoComplete="off" aria-describedby="invite-hint" data-admin="" />
                              <label className="fd-select">
                                <span className="fd-sr-only">Role</span>
                                <select id="invite-role" data-admin="">
                                  <option>Member</option>
                                  <option>Admin</option>
                                  <option>Billing</option>
                                </select>
                              </label>
                              <button type="button" className="fd-btn" id="invite-send" disabled>
                                <svg className="fd-icon" data-icon="mail" aria-hidden="true"><use href="#i-mail" /></svg>
                                <span>Send invite</span>
                              </button>
                            </div>
                            <p className="fd-field-hint" id="invite-hint">Invited members get an email with instructions to join your team.</p>
                          </div>
                        </div>
                      </div>
                      <div className="fd-form-row" data-layout="stack">
                        <div className="fd-form-row-text">
                          <span className="fd-form-row-label" id="members-label">Team members <span className="fd-badge" data-bind="member-badge">4</span></span>
                          <span className="fd-form-row-desc">Admins manage billing, keys and members. Members can use the API and playground.</span>
                        </div>
                        <div className="fd-form-row-control">
                          <div id="members-wrap" data-fd-loading="true">
                            <div className="fd-skeleton-list" data-rows="6"></div>
                            <ul className="fd-list" data-card="" aria-labelledby="members-label" id="members-list">
                              <li className="fd-list-row" data-member="maya@quarry.dev">
                                <span className="fd-list-lead" data-shape="round" data-tone="accent">MR</span>
                                <div className="fd-list-body">
                                  <span className="fd-list-title">Maya Reyes <span className="fd-badge" data-variant="outline">You</span></span>
                                  <span className="fd-list-desc">maya@quarry.dev</span>
                                </div>
                                <span className="fd-list-meta">
                                  <span className="fd-badge">Owner</span>
                                </span>
                                <span className="fd-list-trail"></span>
                              </li>
                              <li className="fd-list-row" data-member="tomasz@quarry.dev">
                                <span className="fd-list-lead" data-shape="round" data-tone="info">TN</span>
                                <div className="fd-list-body">
                                  <span className="fd-list-title">Tomasz Nowak</span>
                                  <span className="fd-list-desc">tomasz@quarry.dev</span>
                                </div>
                                <span className="fd-list-meta">
                                  <label className="fd-select" data-size="sm">
                                    <span className="fd-sr-only">Role for Tomasz Nowak</span>
                                    <select data-role="" data-admin="">
                                      <option>Admin</option>
                                      <option>Member</option>
                                      <option>Billing</option>
                                    </select>
                                  </label>
                                </span>
                                <span className="fd-list-trail">
                                  <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for Tomasz Nowak" data-fd-menu="menu-member" data-placement="bottom-end">
                                    <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                                  </button>
                                </span>
                              </li>
                              <li className="fd-list-row" data-member="amara@quarry.dev">
                                <span className="fd-list-lead" data-shape="round" data-tone="success">AO</span>
                                <div className="fd-list-body">
                                  <span className="fd-list-title">Amara Okafor</span>
                                  <span className="fd-list-desc">amara@quarry.dev</span>
                                </div>
                                <span className="fd-list-meta">
                                  <label className="fd-select" data-size="sm">
                                    <span className="fd-sr-only">Role for Amara Okafor</span>
                                    <select data-role="" data-admin="" defaultValue="Member">
                                      <option>Admin</option>
                                      <option>Member</option>
                                      <option>Billing</option>
                                    </select>
                                  </label>
                                </span>
                                <span className="fd-list-trail">
                                  <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for Amara Okafor" data-fd-menu="menu-member" data-placement="bottom-end">
                                    <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                                  </button>
                                </span>
                              </li>
                              <li className="fd-list-row" data-member="lukas@quarry.dev">
                                <span className="fd-list-lead" data-shape="round" data-tone="violet">LS</span>
                                <div className="fd-list-body">
                                  <span className="fd-list-title">Lukas Schmidt</span>
                                  <span className="fd-list-desc">lukas@quarry.dev</span>
                                </div>
                                <span className="fd-list-meta">
                                  <label className="fd-select" data-size="sm">
                                    <span className="fd-sr-only">Role for Lukas Schmidt</span>
                                    <select data-role="" data-admin="" defaultValue="Billing">
                                      <option>Admin</option>
                                      <option>Member</option>
                                      <option>Billing</option>
                                    </select>
                                  </label>
                                </span>
                                <span className="fd-list-trail">
                                  <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for Lukas Schmidt" data-fd-menu="menu-member" data-placement="bottom-end">
                                    <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                                  </button>
                                </span>
                              </li>
                              <li className="fd-list-row" data-invite="jun@northwind.dev" data-role-name="Member">
                                <span className="fd-list-lead" data-shape="round" data-tone="warning">
                                  <svg className="fd-icon" data-icon="mail" aria-hidden="true"><use href="#i-mail" /></svg>
                                </span>
                                <div className="fd-list-body">
                                  <span className="fd-list-title">jun@northwind.dev</span>
                                  <span className="fd-list-desc">Invited Nov 11 · Member</span>
                                </div>
                                <span className="fd-list-meta">
                                  <span className="fd-badge" data-tone="warning">Invite sent</span>
                                </span>
                                <span className="fd-list-trail">
                                  <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-resend="">Resend</button>
                                  <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for jun@northwind.dev" data-fd-menu="menu-invite" data-placement="bottom-end">
                                    <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                                  </button>
                                </span>
                              </li>
                              <li className="fd-list-row" data-invite="priya@brightline.io" data-role-name="Admin">
                                <span className="fd-list-lead" data-shape="round" data-tone="warning">
                                  <svg className="fd-icon" data-icon="mail" aria-hidden="true"><use href="#i-mail" /></svg>
                                </span>
                                <div className="fd-list-body">
                                  <span className="fd-list-title">priya@brightline.io</span>
                                  <span className="fd-list-desc">Invited Nov 13 · Admin</span>
                                </div>
                                <span className="fd-list-meta">
                                  <span className="fd-badge" data-tone="warning">Invite sent</span>
                                </span>
                                <span className="fd-list-trail">
                                  <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-resend="">Resend</button>
                                  <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for priya@brightline.io" data-fd-menu="menu-invite" data-placement="bottom-end">
                                    <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                                  </button>
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <hr className="fd-divider" />
                      <div className="fd-setting" data-size="sm">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Pending invites</h3>
                          <p className="fd-setting-desc" data-bind="pending-desc">2 people have been invited and have not joined yet. Invites expire after 7 days.</p>
                        </div>
                        <div className="fd-setting-control">
                          <button className="fd-btn" type="button" data-size="sm" id="resend-all">Resend all</button>
                          <button className="fd-btn" type="button" data-variant="danger-soft" data-size="sm" id="revoke-all">Revoke all</button>
                        </div>
                      </div>
                      <div className="fd-setting" data-size="sm">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Leave team</h3>
                          <p className="fd-setting-desc">Leave Quarry Labs and lose access to its keys, runs and monitors.</p>
                        </div>
                        <div className="fd-setting-control">
                          <div className="fd-reason">
                            <button className="fd-btn" type="button" data-variant="ghost" id="leave-team" aria-disabled="true" aria-describedby="leave-reason">
                              <svg className="fd-icon" data-icon="log-out" aria-hidden="true"><use href="#i-log-out" /></svg>
                              <span>Leave team</span>
                            </button>
                            <p className="fd-reason-text" id="leave-reason">
                              <svg className="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock" /></svg>
                              <span>
                                <span className="fd-reason-why">You are the only owner.</span>
                                {' '}
                                <span className="fd-reason-who">Make another member an owner first.</span>
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="fd-form-actions" data-variant="sticky" hidden>
                      <span className="fd-form-actions-text">You have unsaved changes</span>
                      <button type="reset" className="fd-btn" data-variant="ghost">Discard</button>
                      <button type="submit" className="fd-btn" data-variant="primary" id="team-save-all">Save changes</button>
                    </div>
                  </form>
                  {/* ===================================================== Features: a list of switches, grouped rows in one table */}
                  <section className="fd-stack" data-gap="4" id="panel-features" data-panel="features" aria-labelledby="h-features" hidden={tab !== 'features'}>
                    <header className="fd-stack" data-gap="1">
                      <h2 className="fd-h2" id="h-features" tabIndex={-1}>Features</h2>
                      <p className="fd-muted">What every key on Quarry Labs can use. A switch applies at once.</p>
                      <p className="fd-row fd-small fd-muted" data-gap="1-5">
                        <svg className="fd-icon" data-size="14" data-icon="users" aria-hidden="true"><use href="#i-users" /></svg>
                        <span>Owners and admins turn features on and off.</span>
                      </p>
                      <p className="fd-row fd-small fd-muted" data-gap="1-5" data-member-only="" hidden>
                        <svg className="fd-icon" data-size="14" data-icon="lock" aria-hidden="true"><use href="#i-lock" /></svg>
                        <span>You are a member, so the switches are read-only. Ask Maya Reyes or Tomasz Nowak.</span>
                      </p>
                    </header>
                    <div className="fd-toolbar" aria-label="Find a feature">
                      <div className="fd-search fd-toolbar-search" data-variant="soft">
                        <svg className="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search" /></svg>
                        <input className="fd-search-input" id="feature-search" type="search" placeholder="Screenshots" aria-label="Search features" autoComplete="off" />
                        <button type="button" className="fd-search-clear" aria-label="Clear search">
                          <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
                        </button>
                      </div>
                      <div className="fd-toolbar-end">
                        <span className="fd-small fd-muted" id="feature-count" aria-live="polite">6 of 10 on</span>
                      </div>
                    </div>
                    <div className="fd-table-wrap" id="features-wrap">
                      <div className="fd-table-scroll">
                        <table className="fd-table" id="features-table" data-collapsible="" data-stack="" aria-label="Features by area">
                          <thead>
                            <tr>
                              <th>Feature</th>
                              <th data-col="sm" data-stack="hide">Status</th>
                              <th data-col="fit">On</th>
                            </tr>
                          </thead>
                          <tbody className="fd-table-group">
                            <tr className="fd-table-group-head">
                              <th scope="rowgroup" colSpan={3}>
                                <span className="fd-table-group-title">Crawling</span>
                                <span className="fd-table-group-count" data-auto="">4</span>
                              </th>
                            </tr>
                            <tr data-feature="JavaScript rendering">
                              <td data-stack-title="">
                                <div className="fd-table-two">
                                  <span className="fd-table-title">JavaScript rendering</span>
                                  <span className="fd-table-sub">Render pages in a browser before extracting. 1 extra credit a page.</span>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-status" data-tone="success">On</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" defaultChecked aria-label="JavaScript rendering" data-admin="" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                            <tr data-feature="Stealth proxies">
                              <td data-stack-title="">
                                <div className="fd-table-two">
                                  <span className="fd-table-title">Stealth proxies</span>
                                  <span className="fd-table-sub">Retry blocked pages through residential proxies.</span>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-status" data-tone="success">On</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" defaultChecked aria-label="Stealth proxies" data-admin="" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                            <tr data-feature="Follow subdomains">
                              <td data-stack-title="">
                                <div className="fd-table-two">
                                  <span className="fd-table-title">Follow subdomains</span>
                                  <span className="fd-table-sub">Crawls may leave the start host for its subdomains.</span>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-status" data-tone="neutral">Off</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Follow subdomains" data-admin="" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                            <tr data-feature="Full-page screenshots">
                              <td data-stack-title="">
                                <div className="fd-table-two">
                                  <span className="fd-table-title">Full-page screenshots</span>
                                  <span className="fd-table-sub">Add a screenshot to every scrape result.</span>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-status" data-tone="neutral">Off</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Full-page screenshots" data-admin="" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                          </tbody>
                          <tbody className="fd-table-group">
                            <tr className="fd-table-group-head">
                              <th scope="rowgroup" colSpan={3}>
                                <span className="fd-table-group-title">Agents</span>
                                <span className="fd-table-group-count" data-auto="">3</span>
                              </th>
                            </tr>
                            <tr data-feature="Agent endpoint">
                              <td data-stack-title="">
                                <div className="fd-table-two">
                                  <span className="fd-table-title">Agent endpoint</span>
                                  <span className="fd-table-sub">Let keys call <span className="fd-mono">/agent</span> for research that takes many steps.</span>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-status" data-tone="success">On</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" defaultChecked aria-label="Agent endpoint" data-admin="" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                            <tr data-feature="Browser actions">
                              <td data-stack-title="">
                                <div className="fd-table-two">
                                  <span className="fd-table-title">Browser actions</span>
                                  <span className="fd-table-sub">Agents can click, type and scroll with <span className="fd-mono">/interact</span>.</span>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-status" data-tone="success">On</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" defaultChecked aria-label="Browser actions" data-admin="" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                            <tr data-feature="Ask before large runs">
                              <td data-stack-title="">
                                <div className="fd-table-two">
                                  <span className="fd-table-title">Ask before large runs</span>
                                  <span className="fd-table-sub">An agent pauses and asks before a run passes 200 credits.</span>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-status" data-tone="success">On</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" defaultChecked aria-label="Ask before large runs" data-admin="" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                          </tbody>
                          <tbody className="fd-table-group">
                            <tr className="fd-table-group-head">
                              <th scope="rowgroup" colSpan={3}>
                                <span className="fd-table-group-title">Monitors</span>
                                <span className="fd-table-group-count" data-auto="">1</span>
                              </th>
                            </tr>
                            <tr data-feature="Change history">
                              <td data-stack-title="">
                                <div className="fd-table-two">
                                  <span className="fd-table-title">Change history</span>
                                  <span className="fd-table-sub">Keep a diff of every change a monitor finds, for 90 days.</span>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-status" data-tone="success">On</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" defaultChecked aria-label="Change history" data-admin="" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                          </tbody>
                          <tbody className="fd-table-group">
                            <tr className="fd-table-group-head">
                              <th scope="rowgroup" colSpan={3}>
                                <span className="fd-table-group-title">Preview</span>
                                <span className="fd-table-group-count" data-auto="">2</span>
                              </th>
                            </tr>
                            <tr data-feature="Deep research">
                              <td data-stack-title="">
                                <div className="fd-table-two">
                                  <span className="fd-table-title">Deep research <span className="fd-badge" data-tone="violet">Preview</span></span>
                                  <span className="fd-table-sub">Agents read up to 200 pages for one answer. May change.</span>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-status" data-tone="neutral">Off</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Deep research" data-admin="" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                            <tr data-feature="Schema extraction" data-locked="">
                              <td data-stack-title="">
                                <div className="fd-stack" data-gap="1-5">
                                  <div className="fd-table-two">
                                    <span className="fd-table-title">Schema extraction</span>
                                    <span className="fd-table-sub">Extract to a JSON schema you define, checked on every page.</span>
                                  </div>
                                  <p className="fd-reason-text" id="reason-schema">
                                    <svg className="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock" /></svg>
                                    <span>
                                      <span className="fd-reason-why">On the Standard plan.</span>
                                      {' '}
                                      <span className="fd-reason-who">Billing admins can upgrade.</span>
                                    </span>
                                  </p>
                                </div>
                              </td>
                              <td data-stack="hide">
                                <span className="fd-badge" data-variant="outline">Standard</span>
                              </td>
                              <td>
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" disabled aria-label="Schema extraction" aria-describedby="reason-schema" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="fd-empty" data-size="sm" id="features-none" hidden>
                      <span className="fd-empty-icon">
                        <svg className="fd-icon" data-icon="search" aria-hidden="true"><use href="#i-search" /></svg>
                      </span>
                      <h3 className="fd-empty-title">No feature matches</h3>
                      <p className="fd-empty-text">Try another word, like “proxies” or “agent”.</p>
                      <div className="fd-empty-actions">
                        <button className="fd-btn" type="button" id="features-clear">
                          <span>Clear search</span>
                        </button>
                      </div>
                    </div>
                  </section>
                  {/* ===================================================== Billing */}
                  <section className="fd-stack" data-gap="4" id="panel-billing" data-panel="billing" aria-labelledby="h-billing" hidden={tab !== 'billing'}>
                    <header className="fd-stack" data-gap="1">
                      <h2 className="fd-h2" id="h-billing" tabIndex={-1}>Billing</h2>
                      <p className="fd-muted">Your plan, credits and payment method for Quarry Labs.</p>
                    </header>
                    <div id="billing-summary" data-fd-loading="true">
                      <div className="fd-skeleton-stat" data-count="4"></div>
                      <div className="fd-stats">
                        <div className="fd-stat-tile">
                          <span className="fd-stat-label">Plan</span>
                          <span className="fd-stat">Hobby</span>
                          <span className="fd-stat-sub">$19 per month</span>
                        </div>
                        <div className="fd-stat-tile">
                          <span className="fd-stat-label">Renews</span>
                          <span className="fd-stat">Dec 4</span>
                          <span className="fd-stat-sub">in 20 days</span>
                        </div>
                        <div className="fd-stat-tile">
                          <span className="fd-stat-label">Credits remaining</span>
                          <span className="fd-stat">1,520</span>
                          <div className="fd-meter" data-size="sm" data-value="1520" data-max="3000" aria-label="Credits remaining this cycle">
                            <div className="fd-meter-track">
                              <div className="fd-meter-fill"></div>
                            </div>
                          </div>
                          <span className="fd-stat-sub">of 3,000 · resets Nov 23</span>
                        </div>
                        <div className="fd-stat-tile">
                          <span className="fd-stat-label">Payment method</span>
                          <span className="fd-stat">Visa</span>
                          <span className="fd-stat-sub"><span className="fd-mono">•••• 4242</span> · exp 08/28</span>
                          <a className="fd-stat-action" href="#update-card" data-update-card="">Update card</a>
                        </div>
                      </div>
                    </div>
                    <div className="fd-tabs" role="tablist" aria-label="Billing" data-size="sm">
                      <button className="fd-tab" role="tab" id="bt-tab-plan" aria-selected="true" aria-controls="bt-plan" data-value="plan">Plan</button>
                      <button className="fd-tab" role="tab" id="bt-tab-coupons" aria-selected="false" aria-controls="bt-coupons" data-value="coupons">Coupons</button>
                      <button className="fd-tab" role="tab" id="bt-tab-invoices" aria-selected="false" aria-controls="bt-invoices" data-value="invoices">Invoices <span className="fd-tab-count">5</span></button>
                      <button className="fd-tab" role="tab" id="bt-tab-referrals" aria-selected="false" aria-controls="bt-referrals" data-value="referrals">Referrals</button>
                    </div>
                    {/* Plan */}
                    <div className="fd-tab-panel" role="tabpanel" id="bt-plan" aria-labelledby="bt-tab-plan">
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Current plan</h3>
                          <p className="fd-setting-desc">Manage your subscription and payment method.</p>
                        </div>
                        <div className="fd-plan" data-variant="row">
                          <div className="fd-plan-info">
                            <span className="fd-plan-name">Hobby</span>
                            <span className="fd-badge" data-variant="mono">$19/month</span>
                            <span className="fd-plan-allowance">3,000 credits/mo</span>
                          </div>
                          <div className="fd-plan-actions">
                            <button className="fd-btn" type="button" data-variant="primary" data-upgrade="">Upgrade</button>
                            <button className="fd-btn" type="button" data-variant="outline" data-icon-only="" aria-label="Plan actions" data-fd-menu="menu-plan" data-placement="bottom-end">
                              <svg className="fd-icon" data-icon="ellipsis-vertical" aria-hidden="true"><use href="#i-ellipsis-vertical" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Smart upgrade</h3>
                          <p className="fd-setting-desc">When your credits run out mid-cycle, Ember moves you to Standard so jobs keep running, and bills only the prorated difference. Downgrade at any time and the extra credits stay until they reset.</p>
                        </div>
                        <div className="fd-setting-control">
                          <label className="fd-switch">
                            <input type="checkbox" role="switch" data-saved-toast="Smart upgrade" aria-label="Smart upgrade" />
                            <span className="fd-switch-track"></span>
                          </label>
                        </div>
                      </div>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Auto-recharge</h3>
                          <p className="fd-setting-desc">Buy a credit pack automatically when your balance drops below a threshold. Charged to Visa <span className="fd-mono">•••• 4242</span>, at most once a day.</p>
                        </div>
                        <div className="fd-setting-control">
                          <label className="fd-switch">
                            <input type="checkbox" role="switch" id="recharge-switch" defaultChecked aria-label="Auto-recharge" />
                            <span className="fd-switch-track"></span>
                          </label>
                        </div>
                        <div className="fd-form-cols" id="recharge-fields">
                          <div className="fd-field">
                            <label className="fd-field-label" htmlFor="recharge-threshold">When credits fall below</label>
                            <div className="fd-number">
                              <button type="button" className="fd-number-step" data-fd-step="-1" aria-label="Decrease threshold">
                                <svg className="fd-icon" data-icon="minus" aria-hidden="true"><use href="#i-minus" /></svg>
                              </button>
                              <input className="fd-number-input" type="number" id="recharge-threshold" defaultValue="500" min="100" max="5000" step="100" />
                              <button type="button" className="fd-number-step" data-fd-step="1" aria-label="Increase threshold">
                                <svg className="fd-icon" data-icon="plus" aria-hidden="true"><use href="#i-plus" /></svg>
                              </button>
                            </div>
                          </div>
                          <div className="fd-field">
                            <label className="fd-field-label" htmlFor="recharge-pack">Add this pack</label>
                            <div className="fd-select" data-variant="outline">
                              <select id="recharge-pack">
                                <option>5,000 credits · $25</option>
                                <option>20,000 credits · $100</option>
                                <option>50,000 credits · $225</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <details className="fd-disclosure" id="compare-plans">
                            <summary className="fd-disclosure-trigger">
                              <span>Compare plans</span>
                              <svg className="fd-icon" data-icon="chevron-down" aria-hidden="true"><use href="#i-chevron-down" /></svg>
                            </summary>
                            <div className="fd-disclosure-panel">
                              <div className="fd-disclosure-inner fd-stack" data-gap="5">
                                <div className="fd-row">
                                  <div className="fd-segmented" role="radiogroup" aria-label="Billing period" id="seg-period">
                                    <button className="fd-segmented-item" type="button" role="radio" aria-checked="true" data-value="monthly">Monthly</button>
                                    <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="yearly">Yearly · save 20%</button>
                                  </div>
                                </div>
                                <div className="fd-plan-grid fd-column" data-size="lg">
                                  <div className="fd-plan">
                                    <div className="fd-plan-head">
                                      <h3 className="fd-plan-name">Free</h3>
                                    </div>
                                    <div className="fd-plan-price">
                                      <span className="fd-plan-amount" data-monthly="$0" data-yearly="$0">$0</span>
                                      <span className="fd-plan-per" data-per="">/month</span>
                                    </div>
                                    <p className="fd-plan-pitch">Try Ember on side projects.</p>
                                    <ul className="fd-feature-list" data-size="sm">
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>1,000 credits per month</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>2 concurrent requests</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>Community support</span>
                                      </li>
                                      <li data-excluded="">
                                        <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
                                        <span>Webhooks</span>
                                      </li>
                                      <li data-excluded="">
                                        <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
                                        <span>Team seats</span>
                                      </li>
                                    </ul>
                                    <div className="fd-plan-cta">
                                      <button className="fd-btn" type="button" data-block="" data-downgrade="">Downgrade to Free</button>
                                    </div>
                                  </div>
                                  <div className="fd-plan" data-current="">
                                    <div className="fd-plan-head">
                                      <h3 className="fd-plan-name">Hobby</h3>
                                      <span className="fd-status" data-size="sm" data-tone="success">Current</span>
                                    </div>
                                    <div className="fd-plan-price">
                                      <span className="fd-plan-amount" data-monthly="$19" data-yearly="$15">$19</span>
                                      <span className="fd-plan-per" data-per="">/month</span>
                                    </div>
                                    <p className="fd-plan-pitch">For apps that scrape on a schedule.</p>
                                    <ul className="fd-feature-list" data-size="sm">
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>3,000 credits per month</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>5 concurrent requests</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>Email support</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>Webhooks</span>
                                      </li>
                                      <li data-excluded="">
                                        <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
                                        <span>Team seats</span>
                                      </li>
                                    </ul>
                                    <div className="fd-plan-cta">
                                      <button className="fd-btn" type="button" data-block="" disabled>Current plan</button>
                                    </div>
                                  </div>
                                  <div className="fd-plan" data-recommended="">
                                    <div className="fd-plan-head">
                                      <h3 className="fd-plan-name">Standard</h3>
                                      <span className="fd-badge" data-variant="solid">Recommended</span>
                                    </div>
                                    <div className="fd-plan-price">
                                      <span className="fd-plan-amount" data-monthly="$99" data-yearly="$79">$99</span>
                                      <span className="fd-plan-per" data-per="">/month</span>
                                    </div>
                                    <p className="fd-plan-pitch">For products with real traffic.</p>
                                    <ul className="fd-feature-list" data-size="sm" data-tone="accent">
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>100,000 credits per month</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>50 concurrent requests</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>Priority queue</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>Webhooks and audit log</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>5 team seats</span>
                                      </li>
                                    </ul>
                                    <div className="fd-plan-cta">
                                      <button className="fd-btn" type="button" data-variant="accent-soft" data-block="" data-plan="Standard">Upgrade to Standard</button>
                                    </div>
                                  </div>
                                  <div className="fd-plan">
                                    <div className="fd-plan-head">
                                      <h3 className="fd-plan-name">Scale</h3>
                                    </div>
                                    <div className="fd-plan-price">
                                      <span className="fd-plan-amount" data-monthly="$399" data-yearly="$319">$399</span>
                                      <span className="fd-plan-per" data-per="">/month</span>
                                    </div>
                                    <p className="fd-plan-pitch">For data teams running large crawls.</p>
                                    <ul className="fd-feature-list" data-size="sm">
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>500,000 credits per month</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>150 concurrent requests</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>Dedicated support channel</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>SSO and custom retention</span>
                                      </li>
                                      <li>
                                        <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
                                        <span>Unlimited team seats</span>
                                      </li>
                                    </ul>
                                    <div className="fd-plan-cta">
                                      <button className="fd-btn" type="button" data-variant="outline" data-block="" data-sales="">Talk to sales</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                    {/* Coupons */}
                    <div className="fd-tab-panel" role="tabpanel" id="bt-coupons" aria-labelledby="bt-tab-coupons" hidden>
                      <div className="fd-setting" data-align="start" data-control="wide">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Redeem a coupon</h3>
                          <p className="fd-setting-desc">Coupons apply to your next invoice. One coupon can be active at a time.</p>
                        </div>
                        <div className="fd-setting-control">
                          <div className="fd-field">
                            <label className="fd-field-label fd-sr-only" htmlFor="coupon-code">Coupon code</label>
                            <div className="fd-input-pair" data-joined="">
                              <input className="fd-input" id="coupon-code" data-mono="" placeholder="Enter coupon code" autoComplete="off" spellCheck="false" aria-describedby="coupon-hint coupon-error" />
                              <button type="button" className="fd-btn" data-variant="outline" id="coupon-apply" disabled>Apply</button>
                            </div>
                            <p className="fd-field-hint" id="coupon-hint">For this demo, <span className="fd-mono">QUARRY20</span> is a valid code.</p>
                            <p className="fd-field-error" id="coupon-error" hidden>
                              <svg className="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert" /></svg>
                              <span>That code is not valid or has expired. Check the spelling and try again.</span>
                            </p>
                          </div>
                        </div>
                        <div className="fd-callout" data-tone="success" role="status" id="coupon-success" hidden>
                          <svg className="fd-icon fd-callout-icon" data-icon="circle-check" aria-hidden="true"><use href="#i-circle-check" /></svg>
                          <div className="fd-callout-content">
                            <p className="fd-callout-title">Coupon applied</p>
                            <p className="fd-callout-body">20% off your next 3 invoices. Your Dec 4 invoice will be $15.20.</p>
                          </div>
                        </div>
                      </div>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Applied coupons</h3>
                          <p className="fd-setting-desc" id="coupon-empty">No coupons applied yet. Codes you redeem show up here.</p>
                        </div>
                        <ul className="fd-list" data-card="" id="coupon-list" aria-label="Applied coupons" hidden>
                          <li className="fd-list-row">
                            <span className="fd-list-lead" data-tone="accent">
                              <svg className="fd-icon" data-icon="tag" aria-hidden="true"><use href="#i-tag" /></svg>
                            </span>
                            <div className="fd-list-body">
                              <span className="fd-list-title fd-mono">QUARRY20</span>
                              <span className="fd-list-desc">20% off for 3 months · applied Nov 14</span>
                            </div>
                            <span className="fd-list-meta">
                              <span className="fd-badge" data-tone="success" data-dot="">Active</span>
                            </span>
                            <span className="fd-list-trail">
                              <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" id="coupon-remove">Remove</button>
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    {/* Invoices */}
                    <div className="fd-tab-panel" role="tabpanel" id="bt-invoices" aria-labelledby="bt-tab-invoices" hidden>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Invoices</h3>
                          <p className="fd-setting-desc">Receipts for your Hobby subscription and credit packs. Invoices are sent to <span className="fd-mono">maya@quarry.dev</span>.</p>
                        </div>
                        <div className="fd-table-wrap">
                          <div className="fd-table-scroll">
                            <table className="fd-table" data-stack="" aria-label="Invoices">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Invoice</th>
                                  <th data-num="">Amount</th>
                                  <th>Status</th>
                                  <th data-actions="">
                                    <span className="fd-sr-only">Actions</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td data-stack-title="">Nov 14, 2026</td>
                                  <td data-mono="">INV-2026-0121</td>
                                  <td data-num="">$25.00</td>
                                  <td>
                                    <span className="fd-status" data-tone="warning">Open</span>
                                  </td>
                                  <td data-actions="">
                                    <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-download="INV-2026-0121" aria-label="Download INV-2026-0121">
                                      <svg className="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download" /></svg>
                                    </button>
                                  </td>
                                </tr>
                                <tr>
                                  <td data-stack-title="">Nov 4, 2026</td>
                                  <td data-mono="">INV-2026-0118</td>
                                  <td data-num="">$19.00</td>
                                  <td>
                                    <span className="fd-status" data-tone="success">Paid</span>
                                  </td>
                                  <td data-actions="">
                                    <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-download="INV-2026-0118" aria-label="Download INV-2026-0118">
                                      <svg className="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download" /></svg>
                                    </button>
                                  </td>
                                </tr>
                                <tr>
                                  <td data-stack-title="">Oct 21, 2026</td>
                                  <td data-mono="">INV-2026-0107</td>
                                  <td data-num="">$25.00</td>
                                  <td>
                                    <span className="fd-status" data-tone="success">Paid</span>
                                  </td>
                                  <td data-actions="">
                                    <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-download="INV-2026-0107" aria-label="Download INV-2026-0107">
                                      <svg className="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download" /></svg>
                                    </button>
                                  </td>
                                </tr>
                                <tr>
                                  <td data-stack-title="">Oct 4, 2026</td>
                                  <td data-mono="">INV-2026-0096</td>
                                  <td data-num="">$19.00</td>
                                  <td>
                                    <span className="fd-status" data-tone="success">Paid</span>
                                  </td>
                                  <td data-actions="">
                                    <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-download="INV-2026-0096" aria-label="Download INV-2026-0096">
                                      <svg className="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download" /></svg>
                                    </button>
                                  </td>
                                </tr>
                                <tr>
                                  <td data-stack-title="">Sep 4, 2026</td>
                                  <td data-mono="">INV-2026-0081</td>
                                  <td data-num="">$19.00</td>
                                  <td>
                                    <span className="fd-status" data-tone="neutral">Refunded</span>
                                  </td>
                                  <td data-actions="">
                                    <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-download="INV-2026-0081" aria-label="Download INV-2026-0081">
                                      <svg className="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download" /></svg>
                                    </button>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div className="fd-table-foot">
                            <span className="fd-table-foot-info">5 of 5 invoices · last 90 days</span>
                            <div className="fd-table-foot-actions">
                              <button className="fd-btn" type="button" data-size="sm" data-download="all invoices">
                                <svg className="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download" /></svg>
                                <span>Download all</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Referrals */}
                    <div className="fd-tab-panel" role="tabpanel" id="bt-referrals" aria-labelledby="bt-tab-referrals" hidden>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Your referral link</h3>
                          <p className="fd-setting-desc">Share it with a friend. When they run their first request, you both get 500 credits.</p>
                        </div>
                        <div className="fd-copy-field" data-value="https://ember.dev/r/quarry-labs-7k2q" data-noun="referral link">
                          <span className="fd-copy-field-label">Referral link</span>
                          <div className="fd-copy-field-actions">
                            <button type="button" className="fd-btn" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-field-action="copy" aria-label="Copy referral link" data-fd-toast={"{\"title\":\"Referral link copied\",\"tone\":\"success\"}"}>
                              <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
                            </button>
                          </div>
                          <code className="fd-copy-field-value"></code>
                        </div>
                        <div className="fd-stats fd-column" data-size="sm">
                          <div className="fd-stat-tile">
                            <span className="fd-stat-label">Friends joined</span>
                            <span className="fd-stat">3</span>
                            <span className="fd-stat-sub">1 invite pending</span>
                          </div>
                          <div className="fd-stat-tile">
                            <span className="fd-stat-label">Credits earned</span>
                            <span className="fd-stat">1,500</span>
                            <span className="fd-stat-sub">500 per friend</span>
                          </div>
                        </div>
                      </div>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">How it works</h3>
                          <div className="fd-stack" data-gap="3">
                            <p className="fd-setting-desc">Three steps, and nobody has to copy a code.</p>
                            <ul className="fd-feature-list">
                              <li>
                                <svg className="fd-icon" data-icon="share-2" aria-hidden="true"><use href="#i-share-2" /></svg>
                                <span>Send your link to a developer who needs web data.</span>
                              </li>
                              <li>
                                <svg className="fd-icon" data-icon="user-plus" aria-hidden="true"><use href="#i-user-plus" /></svg>
                                <span>They create an Ember account and make their first request.</span>
                              </li>
                              <li>
                                <svg className="fd-icon" data-icon="gift" aria-hidden="true"><use href="#i-gift" /></svg>
                                <span>You each get 500 credits, added within a minute and valid for 90 days.</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                  {/* ===================================================== Data sources */}
                  <section className="fd-stack" data-gap="5" id="panel-data-sources" data-panel="data-sources" aria-labelledby="h-data-sources" hidden={tab !== 'data-sources'}>
                    <header className="fd-stack" data-gap="1">
                      <h2 className="fd-h2" id="h-data-sources" tabIndex={-1}>Data sources</h2>
                      <p className="fd-muted">Choose which catalog providers your agents can call and cap what each one can spend every month.</p>
                    </header>
                    <div className="fd-stack" data-gap="5">
                      <div className="fd-callout" data-tone="info" role="note">
                        <svg className="fd-icon fd-callout-icon" data-icon="info" aria-hidden="true"><use href="#i-info" /></svg>
                        <div className="fd-callout-content">
                          <p className="fd-callout-title">Providers set their own terms</p>
                          <p className="fd-callout-body">Each provider is a separate data licensor. Accepting its terms lets everyone on Quarry Labs call it, and Ember bills credits at the provider’s rate. When a provider updates its terms you will be asked to review them again.</p>
                        </div>
                      </div>
                      <div className="fd-grid" data-min="lg" data-gap="4" id="provider-grid">
                        <article className="fd-card" data-provider="Northwind People" data-terms="Oct 3">
                          <header className="fd-card-head">
                            <span className="fd-tile" data-size="36" data-tone="info">NP</span>
                            <div className="fd-card-heading">
                              <h3 className="fd-title">Northwind People <span className="fd-verified" role="img" aria-label="Verified"></span></h3>
                              <p className="fd-card-desc">People and company enrichment</p>
                            </div>
                            <div className="fd-card-action">
                              <label className="fd-switch">
                                <input type="checkbox" role="switch" defaultChecked aria-label="Enable Northwind People" />
                                <span className="fd-switch-track"></span>
                              </label>
                            </div>
                          </header>
                          <div className="fd-card-body fd-row" data-wrap="" data-justify="between" data-gap="2">
                            <span className="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Oct 3</span>
                            <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open="">View terms</button>
                          </div>
                          <footer className="fd-card-foot">
                            <label className="fd-field-label" htmlFor="cap-northwind">Monthly spend cap</label>
                            <div className="fd-input-group" data-fit="">
                              <input className="fd-input" type="number" size={6} id="cap-northwind" defaultValue="1000" min="0" step="50" />
                              <span className="fd-input-affix" data-kind="unit">credits</span>
                            </div>
                          </footer>
                        </article>
                        <article className="fd-card" data-provider="Tessera Finance" data-terms="Oct 3">
                          <header className="fd-card-head">
                            <span className="fd-tile" data-size="36" data-tone="violet">TF</span>
                            <div className="fd-card-heading">
                              <h3 className="fd-title">Tessera Finance <span className="fd-verified" role="img" aria-label="Verified"></span></h3>
                              <p className="fd-card-desc">Filings, ratios and segment revenue</p>
                            </div>
                            <div className="fd-card-action">
                              <label className="fd-switch">
                                <input type="checkbox" role="switch" defaultChecked aria-label="Enable Tessera Finance" />
                                <span className="fd-switch-track"></span>
                              </label>
                            </div>
                          </header>
                          <div className="fd-card-body fd-row" data-wrap="" data-justify="between" data-gap="2">
                            <span className="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Oct 3</span>
                            <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open="">View terms</button>
                          </div>
                          <footer className="fd-card-foot">
                            <label className="fd-field-label" htmlFor="cap-tessera">Monthly spend cap</label>
                            <div className="fd-input-group" data-fit="">
                              <input className="fd-input" type="number" size={6} id="cap-tessera" defaultValue="500" min="0" step="50" />
                              <span className="fd-input-affix" data-kind="unit">credits</span>
                            </div>
                          </footer>
                        </article>
                        <article className="fd-card" data-provider="Halyard Funding" data-terms="Oct 3">
                          <header className="fd-card-head">
                            <span className="fd-tile" data-size="36" data-tone="accent">HF</span>
                            <div className="fd-card-heading">
                              <h3 className="fd-title">Halyard Funding <span className="fd-verified" role="img" aria-label="Verified"></span></h3>
                              <p className="fd-card-desc">Startup funding rounds since 2026</p>
                            </div>
                            <div className="fd-card-action">
                              <label className="fd-switch">
                                <input type="checkbox" role="switch" aria-label="Enable Halyard Funding" />
                                <span className="fd-switch-track"></span>
                              </label>
                            </div>
                          </header>
                          <div className="fd-card-body fd-row" data-wrap="" data-justify="between" data-gap="2">
                            <span className="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Oct 3</span>
                            <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open="">View terms</button>
                          </div>
                          <footer className="fd-card-foot">
                            <label className="fd-field-label" htmlFor="cap-halyard">Monthly spend cap</label>
                            <div className="fd-input-group" data-fit="">
                              <input className="fd-input" type="number" size={6} id="cap-halyard" defaultValue="200" min="0" step="50" disabled />
                              <span className="fd-input-affix" data-kind="unit">credits</span>
                            </div>
                          </footer>
                        </article>
                        <article className="fd-card" data-provider="Parcel Retail" data-terms="">
                          <header className="fd-card-head">
                            <span className="fd-tile" data-size="36" data-tone="success">PR</span>
                            <div className="fd-card-heading">
                              <h3 className="fd-title">Parcel Retail <span className="fd-verified" role="img" aria-label="Verified"></span></h3>
                              <p className="fd-card-desc">Prices, stock and variants</p>
                            </div>
                            <div className="fd-card-action">
                              <label className="fd-switch">
                                <input type="checkbox" role="switch" disabled aria-label="Enable Parcel Retail" />
                                <span className="fd-switch-track"></span>
                              </label>
                            </div>
                          </header>
                          <div className="fd-card-body fd-row" data-wrap="" data-justify="between" data-gap="2">
                            <span className="fd-status" data-size="sm" data-tone="warning" data-bind="terms-status">Terms need review</span>
                            <button className="fd-btn" type="button" data-variant="outline" data-size="sm" data-terms-open="">Review terms</button>
                          </div>
                          <footer className="fd-card-foot">
                            <label className="fd-field-label" htmlFor="cap-parcel">Monthly spend cap</label>
                            <div className="fd-input-group" data-fit="">
                              <input className="fd-input" type="number" size={6} id="cap-parcel" defaultValue="300" min="0" step="50" disabled />
                              <span className="fd-input-affix" data-kind="unit">credits</span>
                            </div>
                          </footer>
                        </article>
                        <article className="fd-card" data-provider="Mapleton Places" data-terms="Nov 2">
                          <header className="fd-card-head">
                            <span className="fd-tile" data-size="36" data-tone="info">MP</span>
                            <div className="fd-card-heading">
                              <h3 className="fd-title">Mapleton Places <span className="fd-verified" role="img" aria-label="Verified"></span></h3>
                              <p className="fd-card-desc">Listings, hours and reviews</p>
                            </div>
                            <div className="fd-card-action">
                              <label className="fd-switch">
                                <input type="checkbox" role="switch" defaultChecked aria-label="Enable Mapleton Places" />
                                <span className="fd-switch-track"></span>
                              </label>
                            </div>
                          </header>
                          <div className="fd-card-body fd-row" data-wrap="" data-justify="between" data-gap="2">
                            <span className="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Nov 2</span>
                            <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open="">View terms</button>
                          </div>
                          <footer className="fd-card-foot">
                            <label className="fd-field-label" htmlFor="cap-mapleton">Monthly spend cap</label>
                            <div className="fd-input-group" data-fit="">
                              <input className="fd-input" type="number" size={6} id="cap-mapleton" defaultValue="250" min="0" step="50" />
                              <span className="fd-input-affix" data-kind="unit">credits</span>
                            </div>
                          </footer>
                        </article>
                        <article className="fd-card" data-provider="Docsmith" data-terms="Oct 3">
                          <header className="fd-card-head">
                            <span className="fd-tile" data-size="36" data-tone="neutral">DS</span>
                            <div className="fd-card-heading">
                              <h3 className="fd-title">Docsmith <span className="fd-verified" role="img" aria-label="Verified"></span></h3>
                              <p className="fd-card-desc">Developer docs, repos and changelogs</p>
                            </div>
                            <div className="fd-card-action">
                              <label className="fd-switch">
                                <input type="checkbox" role="switch" defaultChecked aria-label="Enable Docsmith" />
                                <span className="fd-switch-track"></span>
                              </label>
                            </div>
                          </header>
                          <div className="fd-card-body fd-row" data-wrap="" data-justify="between" data-gap="2">
                            <span className="fd-status" data-size="sm" data-tone="success" data-bind="terms-status">Terms accepted Oct 3</span>
                            <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-terms-open="">View terms</button>
                          </div>
                          <footer className="fd-card-foot">
                            <label className="fd-field-label" htmlFor="cap-docsmith">Monthly spend cap</label>
                            <div className="fd-input-group" data-fit="">
                              <input className="fd-input" type="number" size={6} id="cap-docsmith" defaultValue="100" min="0" step="50" />
                              <span className="fd-input-affix" data-kind="unit">credits</span>
                            </div>
                          </footer>
                        </article>
                      </div>
                    </div>
                  </section>
                  {/* ===================================================== Connected apps */}
                  <section className="fd-stack" data-gap="4" id="panel-connected-apps" data-panel="connected-apps" aria-labelledby="h-connected-apps" hidden={tab !== 'connected-apps'}>
                    <header className="fd-stack" data-gap="1">
                      <h2 className="fd-h2" id="h-connected-apps" tabIndex={-1}>Connected apps</h2>
                      <p className="fd-muted">MCP clients and OAuth apps that can use Ember on behalf of Quarry Labs.</p>
                    </header>
                    <div className="fd-stack" data-gap="4">
                      <div className="fd-row" data-justify="between" data-wrap="">
                        <p className="fd-small fd-muted" data-bind="apps-count">4 apps connected</p>
                        <a className="fd-btn" data-variant="outline" href="install.html">
                          <svg className="fd-icon" data-icon="plus" aria-hidden="true"><use href="#i-plus" /></svg>
                          <span>Connect an app</span>
                        </a>
                      </div>
                      <ul className="fd-list" data-card="" id="apps-list" aria-label="Connected apps">
                        <li className="fd-list-row" data-app="Claude Code">
                          <span className="fd-list-lead">
                            <svg className="fd-icon" data-icon="terminal" aria-hidden="true"><use href="#i-terminal" /></svg>
                          </span>
                          <div className="fd-list-body">
                            <span className="fd-list-title">Claude Code</span>
                            <div className="fd-stack" data-gap="1-5">
                              <span className="fd-list-desc">Connected Nov 2 by maya@quarry.dev</span>
                              <span className="fd-row" data-wrap="" data-gap="1">
                                <span className="fd-badge" data-variant="mono">search</span>
                                <span className="fd-badge" data-variant="mono">scrape</span>
                                <span className="fd-badge" data-variant="mono">crawl</span>
                                <span className="fd-badge" data-variant="mono">agent</span>
                              </span>
                            </div>
                          </div>
                          <span className="fd-list-meta"></span>
                          <span className="fd-list-trail">
                            <button className="fd-btn" type="button" data-variant="danger-soft" data-size="sm" data-disconnect="">Disconnect</button>
                          </span>
                        </li>
                        <li className="fd-list-row" data-app="Cursor">
                          <span className="fd-list-lead">
                            <svg className="fd-icon" data-icon="square-terminal" aria-hidden="true"><use href="#i-square-terminal" /></svg>
                          </span>
                          <div className="fd-list-body">
                            <span className="fd-list-title">Cursor</span>
                            <div className="fd-stack" data-gap="1-5">
                              <span className="fd-list-desc">Connected Oct 19 by tomasz@quarry.dev</span>
                              <span className="fd-row" data-wrap="" data-gap="1">
                                <span className="fd-badge" data-variant="mono">search</span>
                                <span className="fd-badge" data-variant="mono">scrape</span>
                              </span>
                            </div>
                          </div>
                          <span className="fd-list-meta"></span>
                          <span className="fd-list-trail">
                            <button className="fd-btn" type="button" data-variant="danger-soft" data-size="sm" data-disconnect="">Disconnect</button>
                          </span>
                        </li>
                        <li className="fd-list-row" data-app="n8n">
                          <span className="fd-list-lead" data-tone="success">
                            <svg className="fd-icon" data-icon="workflow" aria-hidden="true"><use href="#i-workflow" /></svg>
                          </span>
                          <div className="fd-list-body">
                            <span className="fd-list-title">n8n</span>
                            <div className="fd-stack" data-gap="1-5">
                              <span className="fd-list-desc">Connected Sep 27 by maya@quarry.dev</span>
                              <span className="fd-row" data-wrap="" data-gap="1">
                                <span className="fd-badge" data-variant="mono">scrape</span>
                                <span className="fd-badge" data-variant="mono">extract</span>
                                <span className="fd-badge" data-variant="mono">webhooks:write</span>
                              </span>
                            </div>
                          </div>
                          <span className="fd-list-meta"></span>
                          <span className="fd-list-trail">
                            <button className="fd-btn" type="button" data-variant="danger-soft" data-size="sm" data-disconnect="">Disconnect</button>
                          </span>
                        </li>
                        <li className="fd-list-row" data-app="Slack">
                          <span className="fd-list-lead" data-tone="violet">
                            <svg className="fd-icon" data-icon="hash" aria-hidden="true"><use href="#i-hash" /></svg>
                          </span>
                          <div className="fd-list-body">
                            <span className="fd-list-title">Slack</span>
                            <div className="fd-stack" data-gap="1-5">
                              <span className="fd-list-desc">Connected Sep 9 by amara@quarry.dev</span>
                              <span className="fd-row" data-wrap="" data-gap="1">
                                <span className="fd-badge" data-variant="mono">monitors:read</span>
                              </span>
                            </div>
                          </div>
                          <span className="fd-list-meta"></span>
                          <span className="fd-list-trail">
                            <button className="fd-btn" type="button" data-variant="danger-soft" data-size="sm" data-disconnect="">Disconnect</button>
                          </span>
                        </li>
                      </ul>
                      <div className="fd-empty" data-size="sm" id="apps-empty" hidden>
                        <span className="fd-empty-icon">
                          <svg className="fd-icon" data-icon="plug" aria-hidden="true"><use href="#i-plug" /></svg>
                        </span>
                        <h3 className="fd-empty-title">No connected apps</h3>
                        <p className="fd-empty-text">Apps you connect, like Claude Code or Cursor, show up here with the scopes they can use.</p>
                        <div className="fd-empty-actions">
                          <a className="fd-btn" data-variant="outline" href="install.html">
                            <svg className="fd-icon" data-icon="plus" aria-hidden="true"><use href="#i-plus" /></svg>
                            <span>Connect an app</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </section>
                  {/* ===================================================== Notifications */}
                  <section className="fd-stack" data-gap="1" id="panel-notifications" data-panel="notifications" aria-labelledby="h-notifications" hidden={tab !== 'notifications'}>
                    <header className="fd-stack" data-gap="1">
                      <h2 className="fd-h2" id="h-notifications" tabIndex={-1}>Notifications</h2>
                      <p className="fd-muted">Choose what reaches you and where. These settings are personal, so teammates keep their own.</p>
                    </header>
                    <div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Email notifications</h3>
                          <p className="fd-setting-desc">Usage alerts, run summaries and billing notices sent to <span className="fd-mono">maya@quarry.dev</span>.</p>
                        </div>
                        <div className="fd-setting-control">
                          <button className="fd-btn" type="button" data-variant="outline" data-fd-dialog-open="dlg-email-prefs">
                            <svg className="fd-icon" data-icon="mail" aria-hidden="true"><use href="#i-mail" /></svg>
                            <span>Manage email notifications</span>
                          </button>
                        </div>
                      </div>
                      <div className="fd-form-row" data-layout="stack">
                        <div className="fd-form-row-text">
                          <span className="fd-form-row-label">Your notifications</span>
                          <span className="fd-form-row-desc">Choose what shows up in Ember and as desktop alerts.</span>
                        </div>
                        <div className="fd-form-row-control">
                          <div className="fd-matrix" data-cols="2" id="notif-matrix">
                            <div className="fd-matrix-head">
                              <span>Category</span>
                              <span className="fd-matrix-cell">In-app</span>
                              <span className="fd-matrix-cell">Browser</span>
                            </div>
                            <div className="fd-matrix-row">
                              <div className="fd-matrix-text">
                                <span className="fd-matrix-label">{"Billing & payments"}</span>
                                <span className="fd-matrix-desc">Failed payments, top-ups and plan changes. Always shown in-app.</span>
                              </div>
                              <div className="fd-matrix-cell">
                                <span className="fd-switch-lock"><svg className="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock" /></svg>Always</span>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Billing and payments, browser" defaultChecked />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                            </div>
                            <div className="fd-matrix-row">
                              <div className="fd-matrix-text">
                                <span className="fd-matrix-label">{"Usage & limits"}</span>
                                <span className="fd-matrix-desc">Credit thresholds, rate limits and concurrency limits.</span>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Usage and limits, in-app" defaultChecked />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Usage and limits, browser" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                            </div>
                            <div className="fd-matrix-row">
                              <div className="fd-matrix-text">
                                <span className="fd-matrix-label">Monitors</span>
                                <span className="fd-matrix-desc">Changes detected on the pages you watch.</span>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Monitors, in-app" defaultChecked />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Monitors, browser" defaultChecked />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                            </div>
                            <div className="fd-matrix-row">
                              <div className="fd-matrix-text">
                                <span className="fd-matrix-label">Jobs</span>
                                <span className="fd-matrix-desc">Crawls, batch scrapes and agent runs finishing or failing.</span>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Jobs, in-app" defaultChecked />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Jobs, browser" defaultChecked />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                            </div>
                            <div className="fd-matrix-row">
                              <div className="fd-matrix-text">
                                <span className="fd-matrix-label">{"Team & account"}</span>
                                <span className="fd-matrix-desc">Members joining, API keys created and security changes.</span>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Team and account, in-app" defaultChecked />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Team and account, browser" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                            </div>
                            <div className="fd-matrix-row">
                              <div className="fd-matrix-text">
                                <span className="fd-matrix-label">Product updates</span>
                                <span className="fd-matrix-desc">New endpoints, providers and changes to the API.</span>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Product updates, in-app" defaultChecked />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                              <div className="fd-matrix-cell">
                                <label className="fd-switch">
                                  <input type="checkbox" role="switch" aria-label="Product updates, browser" />
                                  <span className="fd-switch-track"></span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <hr className="fd-divider" />
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Browser alerts</h3>
                          <p className="fd-setting-desc">Permission: <span className="fd-status" data-size="sm" data-tone="warning" id="perm-status" role="status">Not enabled</span></p>
                          <p className="fd-setting-desc">Ember needs your browser’s permission to show alerts while this tab is in the background.</p>
                        </div>
                        <div className="fd-setting-control">
                          <button className="fd-btn" type="button" data-variant="outline" id="enable-alerts">
                            <svg className="fd-icon" data-icon="bell" aria-hidden="true"><use href="#i-bell" /></svg>
                            <span>Enable desktop alerts</span>
                          </button>
                        </div>
                      </div>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Quiet hours</h3>
                          <p className="fd-setting-desc">Pause browser alerts overnight. In-app notifications still collect so you can catch up in the morning.</p>
                        </div>
                        <div className="fd-setting-control">
                          <label className="fd-switch">
                            <input type="checkbox" role="switch" id="quiet-switch" defaultChecked aria-label="Quiet hours" />
                            <span className="fd-switch-track"></span>
                          </label>
                        </div>
                        <div className="fd-form-cols" id="quiet-fields">
                          <div className="fd-field">
                            <label className="fd-field-label" htmlFor="quiet-from">From</label>
                            <div className="fd-select" data-variant="outline">
                              <select id="quiet-from" data-saved-toast="Quiet hours" defaultValue="10:00 PM">
                                <option>9:00 PM</option>
                                <option>10:00 PM</option>
                                <option>11:00 PM</option>
                                <option>12:00 AM</option>
                              </select>
                            </div>
                          </div>
                          <div className="fd-field">
                            <label className="fd-field-label" htmlFor="quiet-to">To</label>
                            <div className="fd-select" data-variant="outline">
                              <select id="quiet-to" data-saved-toast="Quiet hours" defaultValue="7:00 AM">
                                <option>6:00 AM</option>
                                <option>7:00 AM</option>
                                <option>8:00 AM</option>
                                <option>9:00 AM</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                  {/* ===================================================== Advanced */}
                  <section className="fd-stack" data-gap="1" id="panel-advanced" data-panel="advanced" aria-labelledby="h-advanced" hidden={tab !== 'advanced'}>
                    <header className="fd-stack" data-gap="1">
                      <h2 className="fd-h2" id="h-advanced" tabIndex={-1}>Advanced</h2>
                      <p className="fd-muted">Webhooks, network access and data handling for Quarry Labs.</p>
                    </header>
                    <div>
                      <div className="fd-form-row" data-layout="stack">
                        <div className="fd-form-row-text">
                          <span className="fd-form-row-label" id="whsec-label">Webhook signing secret</span>
                          <span className="fd-form-row-desc">Verify that webhook requests really come from Ember by checking the signature header with this secret.</span>
                        </div>
                        <div className="fd-form-row-control">
                          <div className="fd-field">
                            <div className="fd-secret" id="whsec" role="group" aria-labelledby="whsec-label" data-value="whsec_9d2e7a41b6c04f58a3e17c92d0b85f64" data-mask="full" data-noun="signing secret">
                              <code className="fd-secret-value"></code>
                              <div className="fd-secret-actions">
                                <button type="button" className="fd-btn" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-field-action="reveal" aria-label="Show signing secret">
                                  <svg className="fd-icon" data-icon="eye" aria-hidden="true"><use href="#i-eye" /></svg>
                                </button>
                                <button type="button" className="fd-btn" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-field-action="copy" aria-label="Copy signing secret">
                                  <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
                                </button>
                                <button type="button" className="fd-btn" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-field-action="rotate" aria-label="Rotate signing secret">
                                  <svg className="fd-icon" data-icon="rotate-ccw" aria-hidden="true"><use href="#i-rotate-ccw" /></svg>
                                </button>
                              </div>
                            </div>
                            <p className="fd-field-hint">Keep it out of client code. Rotating invalidates the old secret at once. <a className="fd-link" href="#docs">Webhook security</a></p>
                          </div>
                        </div>
                      </div>
                      <div className="fd-form-row" data-layout="stack">
                        <div className="fd-form-row-text">
                          <span className="fd-form-row-label" id="endpoints-label">Webhook endpoints</span>
                          <span className="fd-form-row-desc">Ember sends signed events to these HTTPS URLs when runs and monitors finish.</span>
                        </div>
                        <div className="fd-form-row-control">
                          <div className="fd-table-wrap">
                            <div className="fd-table-scroll">
                              <table className="fd-table" data-stack="" aria-labelledby="endpoints-label" id="endpoints-table">
                                <thead>
                                  <tr>
                                    <th>URL</th>
                                    <th>Events</th>
                                    <th>Last delivery</th>
                                    <th data-actions="">
                                      <span className="fd-sr-only">Actions</span>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr data-endpoint="https://api.quarry.dev/hooks/ember">
                                    <td data-mono="" data-stack-title="">
                                      <span className="fd-table-trunc">https://api.quarry.dev/hooks/ember</span>
                                    </td>
                                    <td>
                                      <span className="fd-row" data-wrap="" data-gap="1">
                                        <span className="fd-badge" data-variant="mono">crawl.completed</span>
                                        <span className="fd-badge" data-variant="mono">monitor.changed</span>
                                      </span>
                                    </td>
                                    <td>
                                      <span className="fd-status" data-size="sm" data-tone="success">200 · 4 min ago</span>
                                    </td>
                                    <td data-actions="">
                                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for api.quarry.dev endpoint" data-fd-menu="menu-endpoint" data-placement="bottom-end">
                                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                                      </button>
                                    </td>
                                  </tr>
                                  <tr data-endpoint="https://n8n.quarry.dev/webhook/ember-runs">
                                    <td data-mono="" data-stack-title="">
                                      <span className="fd-table-trunc">https://n8n.quarry.dev/webhook/ember-runs</span>
                                    </td>
                                    <td>
                                      <span className="fd-row" data-wrap="" data-gap="1">
                                        <span className="fd-badge" data-variant="mono">agent.finished</span>
                                      </span>
                                    </td>
                                    <td>
                                      <span className="fd-status" data-size="sm" data-tone="danger">503 · 2 hr ago</span>
                                    </td>
                                    <td data-actions="">
                                      <button className="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for n8n.quarry.dev endpoint" data-fd-menu="menu-endpoint" data-placement="bottom-end">
                                        <svg className="fd-icon" data-icon="ellipsis" aria-hidden="true"><use href="#i-ellipsis" /></svg>
                                      </button>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <div className="fd-table-foot">
                              <span className="fd-table-foot-info" data-bind="endpoint-count">2 endpoints</span>
                              <div className="fd-table-foot-actions">
                                <button className="fd-btn" type="button" data-size="sm" data-fd-dialog-open="dlg-endpoint">
                                  <svg className="fd-icon" data-icon="plus" aria-hidden="true"><use href="#i-plus" /></svg>
                                  <span>Add endpoint</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="fd-form-row" data-layout="stack">
                        <div className="fd-form-row-text">
                          <label className="fd-form-row-label" htmlFor="allowlist">IP allowlist</label>
                          <span className="fd-form-row-desc">Only requests from these addresses can use your API keys. Leave it empty to allow any address.</span>
                        </div>
                        <div className="fd-form-row-control">
                          <div className="fd-field">
                            <div className="fd-tag-input" id="allowlist-tags" data-fd-tag-input="" data-mono="" data-value="203.0.113.0/24,198.51.100.7" data-pattern={"^((25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])(/(3[0-2]|[12]?[0-9]))?$"}>
                              <input className="fd-tag-input-field" id="allowlist" placeholder="Add an IP or CIDR, like 203.0.113.0/24" autoComplete="off" spellCheck="false" aria-describedby="allowlist-hint allowlist-error" />
                            </div>
                            <p className="fd-field-hint" id="allowlist-hint">Changes apply at once. Include your own address so you do not lock yourself out.</p>
                            <p className="fd-field-error" id="allowlist-error" hidden>
                              <svg className="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert" /></svg>
                              <span>Fix or remove the entries shown in red. Use an IPv4 address or a CIDR range.</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title" id="sso-title">Require single sign-on</h3>
                          <p className="fd-setting-desc">Members sign in through your identity provider only.</p>
                        </div>
                        <div className="fd-setting-control">
                          <label className="fd-switch">
                            <input type="checkbox" role="switch" disabled aria-labelledby="sso-title" aria-describedby="reason-sso" />
                            <span className="fd-switch-track"></span>
                          </label>
                        </div>
                        <p className="fd-reason-text" id="reason-sso">
                          <svg className="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock" /></svg>
                          <span>
                            <span className="fd-reason-why">Single sign-on is on the Scale plan.</span>
                            {' '}
                            <span className="fd-reason-who">Billing admins can upgrade.</span>
                          </span>
                        </p>
                      </div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Data retention</h3>
                          <p className="fd-setting-desc">How long Ember keeps request logs and run output before deleting them.</p>
                        </div>
                        <div className="fd-setting-control">
                          <label className="fd-select">
                            <span className="fd-sr-only">Data retention</span>
                            <select id="retention" data-saved-toast="Data retention" defaultValue="30 days">
                              <option>7 days</option>
                              <option>30 days</option>
                              <option>90 days</option>
                              <option>1 year</option>
                            </select>
                          </label>
                        </div>
                      </div>
                      <div className="fd-setting" data-align="start">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Zero data retention</h3>
                          <p className="fd-setting-desc">Ember stores no page content or request bodies for this team.</p>
                        </div>
                        <div className="fd-setting-control">
                          <label className="fd-switch">
                            <input type="checkbox" role="switch" id="zdr-switch" aria-label="Zero data retention" />
                            <span className="fd-switch-track"></span>
                          </label>
                        </div>
                        <div className="fd-callout" data-tone="info" data-size="sm" role="note">
                          <svg className="fd-icon fd-callout-icon" data-icon="info" aria-hidden="true"><use href="#i-info" /></svg>
                          <div className="fd-callout-content">
                            <p className="fd-callout-body">Logs keep only the URL, status, timing and credits. Runs cannot be replayed and monitors cannot show diffs while this is on.</p>
                          </div>
                        </div>
                      </div>
                      <div className="fd-setting">
                        <div className="fd-setting-text">
                          <h3 className="fd-setting-title">Export data</h3>
                          <p className="fd-setting-desc">Download your runs, logs and usage as a ZIP of CSV files. Large exports are emailed to <span className="fd-mono">maya@quarry.dev</span>.</p>
                        </div>
                        <div className="fd-setting-control">
                          <button className="fd-btn" type="button" data-variant="outline" id="export-data">
                            <svg className="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download" /></svg>
                            <span>Export data</span>
                          </button>
                        </div>
                      </div>
                      {/* Destructive, and on its own section: confirmed on the page, not in a dialog */}
                      <div className="fd-setting" data-tone="danger" data-align="start" id="delete-team-row">
                        <div className="fd-setting-text">
                          <div className="fd-row" data-align="start" data-gap="3">
                            <span className="fd-tile" data-size="44" data-tone="accent">QL</span>
                            <div>
                              <h3 className="fd-setting-title" id="delete-team-title">Delete team</h3>
                              <p className="fd-setting-desc"><span className="fd-label">Quarry Labs</span> and its 4 API keys, 12 monitors and 30 days of logs will be permanently deleted. <strong>This cannot be undone.</strong></p>
                            </div>
                          </div>
                        </div>
                        <form className="fd-confirm-inline" method="dialog" id="delete-team" data-fd-confirm-inline="" data-confirm="quarry-labs" aria-labelledby="delete-team-title">
                          <div className="fd-field">
                            <label className="fd-field-label" htmlFor="dt-confirm">Type <span className="fd-confirm-phrase">quarry-labs</span> to confirm</label>
                            <input className="fd-input" id="dt-confirm" name="confirm" autoComplete="off" autoCapitalize="off" spellCheck="false" required data-fd-confirm-input="" aria-describedby="dt-confirm-rule" data-admin="" />
                            <p className="fd-confirm-inline-rule" id="dt-confirm-rule" data-fd-confirm-rule="">Type it exactly as shown. Case counts.</p>
                          </div>
                          <div className="fd-form-actions">
                            <button className="fd-btn" type="submit" data-variant="danger" data-fd-confirm-submit="">Delete team</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="fd-band" data-pad="sm" data-grow="" aria-label="Demo state">
          <div className="fd-row" data-wrap="" data-justify="between">
            <span className="fd-eyebrow">Demo state</span>
            <div className="fd-segmented" data-size="sm" id="state-switch" role="radiogroup" aria-label="Page state">
              <button className="fd-segmented-item" type="button" role="radio" aria-checked="true" data-value="ready">Loaded</button>
              <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="loading">Loading</button>
              <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="error">Error</button>
              <button className="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="member">As a member</button>
            </div>
          </div>
        </section>
      </div>
<div className="fd-menu" id="menu-member" popover="" role="menu" aria-label="Member actions">
        <button className="fd-menu-item" data-value="copy">
          <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
          <span className="fd-menu-item-label">Copy email</span>
        </button>
        <hr className="fd-menu-sep" />
        <button className="fd-menu-item" data-value="remove" data-tone="danger">
          <svg className="fd-icon" data-icon="trash-2" aria-hidden="true"><use href="#i-trash-2" /></svg>
          <span className="fd-menu-item-label">Remove from team</span>
        </button>
      </div>
<div className="fd-menu" id="menu-invite" popover="" role="menu" aria-label="Invite actions">
        <button className="fd-menu-item" data-value="resend">
          <svg className="fd-icon" data-icon="send" aria-hidden="true"><use href="#i-send" /></svg>
          <span className="fd-menu-item-label">Resend invite</span>
        </button>
        <button className="fd-menu-item" data-value="copy">
          <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
          <span className="fd-menu-item-label">Copy email</span>
        </button>
        <hr className="fd-menu-sep" />
        <button className="fd-menu-item" data-value="remove" data-tone="danger">
          <svg className="fd-icon" data-icon="trash-2" aria-hidden="true"><use href="#i-trash-2" /></svg>
          <span className="fd-menu-item-label">Revoke invite</span>
        </button>
      </div>
<div className="fd-menu" id="menu-plan" popover="" role="menu" aria-label="Plan actions">
        <button className="fd-menu-item" data-value="compare">
          <svg className="fd-icon" data-icon="layers" aria-hidden="true"><use href="#i-layers" /></svg>
          <span className="fd-menu-item-label">Compare plans</span>
        </button>
        <button className="fd-menu-item" data-value="invoices">
          <svg className="fd-icon" data-icon="receipt" aria-hidden="true"><use href="#i-receipt" /></svg>
          <span className="fd-menu-item-label">View invoices</span>
        </button>
        <hr className="fd-menu-sep" />
        <button className="fd-menu-item" data-value="cancel" data-tone="danger">
          <svg className="fd-icon" data-icon="circle-x" aria-hidden="true"><use href="#i-circle-x" /></svg>
          <span className="fd-menu-item-label">Cancel subscription</span>
        </button>
      </div>
<div className="fd-menu" id="menu-endpoint" popover="" role="menu" aria-label="Endpoint actions">
        <button className="fd-menu-item" data-value="test">
          <svg className="fd-icon" data-icon="send" aria-hidden="true"><use href="#i-send" /></svg>
          <span className="fd-menu-item-label">Send test event</span>
        </button>
        <button className="fd-menu-item" data-value="copy">
          <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
          <span className="fd-menu-item-label">Copy URL</span>
        </button>
        <hr className="fd-menu-sep" />
        <button className="fd-menu-item" data-value="delete" data-tone="danger">
          <svg className="fd-icon" data-icon="trash-2" aria-hidden="true"><use href="#i-trash-2" /></svg>
          <span className="fd-menu-item-label">Delete endpoint</span>
        </button>
      </div>
<dialog className="fd-dialog" id="dlg-confirm" data-size="sm">
        <div className="fd-dialog-head">
          <h2 className="fd-h3 fd-dialog-title" data-confirm-title="">Are you sure?</h2>
          <p className="fd-dialog-desc" data-confirm-desc=""></p>
        </div>
        <div className="fd-dialog-foot">
          <button className="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close="">Cancel</button>
          <button className="fd-btn" type="button" data-variant="danger" data-fd-dialog-close="" value="ok" data-confirm-ok="">Confirm</button>
        </div>
      </dialog>
<dialog className="fd-dialog" id="dlg-2fa" data-size="md">
        <section data-step="scan">
          <div className="fd-dialog-head">
            <h2 className="fd-h3 fd-dialog-title">Set up two-factor authentication</h2>
            <p className="fd-dialog-desc">Scan the code with an authenticator app, then enter the 6-digit code it shows.</p>
            <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
              <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
            </button>
          </div>
          <div className="fd-dialog-body fd-stack">
            <div className="fd-row" data-wrap="" data-align="start" data-gap="6">
              <figure className="fd-qr" data-size="sm">
                <svg viewBox="0 0 33 33" role="img" aria-label="Authenticator setup code for Ember">
                  <path fill="currentColor" d="M4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM7 4h1v1h-1zM8 4h1v1h-1zM9 4h1v1h-1zM10 4h1v1h-1zM17 4h1v1h-1zM22 4h1v1h-1zM23 4h1v1h-1zM24 4h1v1h-1zM25 4h1v1h-1zM26 4h1v1h-1zM27 4h1v1h-1zM28 4h1v1h-1zM4 5h1v1h-1zM10 5h1v1h-1zM14 5h1v1h-1zM15 5h1v1h-1zM16 5h1v1h-1zM17 5h1v1h-1zM18 5h1v1h-1zM19 5h1v1h-1zM22 5h1v1h-1zM28 5h1v1h-1zM4 6h1v1h-1zM6 6h1v1h-1zM7 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM13 6h1v1h-1zM14 6h1v1h-1zM15 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM25 6h1v1h-1zM26 6h1v1h-1zM28 6h1v1h-1zM4 7h1v1h-1zM6 7h1v1h-1zM7 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM12 7h1v1h-1zM15 7h1v1h-1zM17 7h1v1h-1zM18 7h1v1h-1zM19 7h1v1h-1zM20 7h1v1h-1zM22 7h1v1h-1zM24 7h1v1h-1zM25 7h1v1h-1zM26 7h1v1h-1zM28 7h1v1h-1zM4 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM25 8h1v1h-1zM26 8h1v1h-1zM28 8h1v1h-1zM4 9h1v1h-1zM10 9h1v1h-1zM12 9h1v1h-1zM14 9h1v1h-1zM15 9h1v1h-1zM16 9h1v1h-1zM19 9h1v1h-1zM20 9h1v1h-1zM22 9h1v1h-1zM28 9h1v1h-1zM4 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM9 10h1v1h-1zM10 10h1v1h-1zM12 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM20 10h1v1h-1zM22 10h1v1h-1zM23 10h1v1h-1zM24 10h1v1h-1zM25 10h1v1h-1zM26 10h1v1h-1zM27 10h1v1h-1zM28 10h1v1h-1zM12 11h1v1h-1zM14 11h1v1h-1zM16 11h1v1h-1zM19 11h1v1h-1zM20 11h1v1h-1zM4 12h1v1h-1zM6 12h1v1h-1zM7 12h1v1h-1zM8 12h1v1h-1zM9 12h1v1h-1zM10 12h1v1h-1zM13 12h1v1h-1zM16 12h1v1h-1zM17 12h1v1h-1zM18 12h1v1h-1zM19 12h1v1h-1zM22 12h1v1h-1zM23 12h1v1h-1zM24 12h1v1h-1zM25 12h1v1h-1zM26 12h1v1h-1zM5 13h1v1h-1zM6 13h1v1h-1zM11 13h1v1h-1zM15 13h1v1h-1zM16 13h1v1h-1zM20 13h1v1h-1zM23 13h1v1h-1zM27 13h1v1h-1zM5 14h1v1h-1zM6 14h1v1h-1zM7 14h1v1h-1zM8 14h1v1h-1zM10 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM13 14h1v1h-1zM14 14h1v1h-1zM16 14h1v1h-1zM19 14h1v1h-1zM21 14h1v1h-1zM23 14h1v1h-1zM25 14h1v1h-1zM27 14h1v1h-1zM28 14h1v1h-1zM7 15h1v1h-1zM8 15h1v1h-1zM11 15h1v1h-1zM14 15h1v1h-1zM18 15h1v1h-1zM19 15h1v1h-1zM20 15h1v1h-1zM21 15h1v1h-1zM22 15h1v1h-1zM23 15h1v1h-1zM28 15h1v1h-1zM4 16h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM11 16h1v1h-1zM12 16h1v1h-1zM14 16h1v1h-1zM17 16h1v1h-1zM18 16h1v1h-1zM19 16h1v1h-1zM21 16h1v1h-1zM22 16h1v1h-1zM24 16h1v1h-1zM26 16h1v1h-1zM27 16h1v1h-1zM28 16h1v1h-1zM4 17h1v1h-1zM6 17h1v1h-1zM7 17h1v1h-1zM11 17h1v1h-1zM16 17h1v1h-1zM17 17h1v1h-1zM20 17h1v1h-1zM23 17h1v1h-1zM25 17h1v1h-1zM27 17h1v1h-1zM4 18h1v1h-1zM9 18h1v1h-1zM10 18h1v1h-1zM14 18h1v1h-1zM19 18h1v1h-1zM22 18h1v1h-1zM23 18h1v1h-1zM24 18h1v1h-1zM25 18h1v1h-1zM27 18h1v1h-1zM28 18h1v1h-1zM4 19h1v1h-1zM7 19h1v1h-1zM11 19h1v1h-1zM12 19h1v1h-1zM13 19h1v1h-1zM16 19h1v1h-1zM18 19h1v1h-1zM20 19h1v1h-1zM23 19h1v1h-1zM24 19h1v1h-1zM28 19h1v1h-1zM4 20h1v1h-1zM6 20h1v1h-1zM8 20h1v1h-1zM10 20h1v1h-1zM11 20h1v1h-1zM12 20h1v1h-1zM13 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM18 20h1v1h-1zM20 20h1v1h-1zM21 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM26 20h1v1h-1zM12 21h1v1h-1zM13 21h1v1h-1zM14 21h1v1h-1zM18 21h1v1h-1zM19 21h1v1h-1zM20 21h1v1h-1zM24 21h1v1h-1zM25 21h1v1h-1zM4 22h1v1h-1zM5 22h1v1h-1zM6 22h1v1h-1zM7 22h1v1h-1zM8 22h1v1h-1zM9 22h1v1h-1zM10 22h1v1h-1zM13 22h1v1h-1zM14 22h1v1h-1zM15 22h1v1h-1zM16 22h1v1h-1zM17 22h1v1h-1zM20 22h1v1h-1zM22 22h1v1h-1zM24 22h1v1h-1zM26 22h1v1h-1zM27 22h1v1h-1zM28 22h1v1h-1zM4 23h1v1h-1zM10 23h1v1h-1zM12 23h1v1h-1zM13 23h1v1h-1zM14 23h1v1h-1zM15 23h1v1h-1zM19 23h1v1h-1zM20 23h1v1h-1zM24 23h1v1h-1zM25 23h1v1h-1zM4 24h1v1h-1zM6 24h1v1h-1zM7 24h1v1h-1zM8 24h1v1h-1zM10 24h1v1h-1zM12 24h1v1h-1zM13 24h1v1h-1zM14 24h1v1h-1zM15 24h1v1h-1zM19 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM22 24h1v1h-1zM23 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM27 24h1v1h-1zM28 24h1v1h-1zM4 25h1v1h-1zM6 25h1v1h-1zM7 25h1v1h-1zM8 25h1v1h-1zM10 25h1v1h-1zM12 25h1v1h-1zM13 25h1v1h-1zM16 25h1v1h-1zM17 25h1v1h-1zM19 25h1v1h-1zM20 25h1v1h-1zM21 25h1v1h-1zM22 25h1v1h-1zM24 25h1v1h-1zM25 25h1v1h-1zM26 25h1v1h-1zM27 25h1v1h-1zM28 25h1v1h-1zM4 26h1v1h-1zM6 26h1v1h-1zM7 26h1v1h-1zM8 26h1v1h-1zM10 26h1v1h-1zM12 26h1v1h-1zM17 26h1v1h-1zM18 26h1v1h-1zM19 26h1v1h-1zM25 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM4 27h1v1h-1zM10 27h1v1h-1zM13 27h1v1h-1zM16 27h1v1h-1zM17 27h1v1h-1zM20 27h1v1h-1zM21 27h1v1h-1zM22 27h1v1h-1zM23 27h1v1h-1zM24 27h1v1h-1zM25 27h1v1h-1zM28 27h1v1h-1zM4 28h1v1h-1zM5 28h1v1h-1zM6 28h1v1h-1zM7 28h1v1h-1zM8 28h1v1h-1zM9 28h1v1h-1zM10 28h1v1h-1zM12 28h1v1h-1zM14 28h1v1h-1zM16 28h1v1h-1zM18 28h1v1h-1zM21 28h1v1h-1zM22 28h1v1h-1zM23 28h1v1h-1zM24 28h1v1h-1zM25 28h1v1h-1zM26 28h1v1h-1zM27 28h1v1h-1zM28 28h1v1h-1z"></path>
                </svg>
              </figure>
              <div className="fd-stack fd-column" data-size="xs" data-gap="2">
                <p className="fd-small fd-muted">Cannot scan it? Enter this key in your app instead.</p>
                <code className="fd-code">EMBR 7K2Q 9XJM 4TWP</code>
              </div>
            </div>
            <div className="fd-field">
              <span className="fd-field-label" id="otp-2fa-label">Verification code</span>
              <div className="fd-otp" id="otp-2fa" data-fd-otp="" data-length="6" role="group" aria-labelledby="otp-2fa-label"></div>
              <p className="fd-field-hint" id="otp-2fa-hint">For this demo the code is <span className="fd-mono">482913</span>.</p>
              <p className="fd-field-error" id="otp-2fa-error" hidden>
                <svg className="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert" /></svg>
                <span>That code is not right. Check your app and try again.</span>
              </p>
            </div>
          </div>
          <div className="fd-dialog-foot">
            <button className="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close="">Cancel</button>
            <button className="fd-btn" type="button" data-variant="primary" id="twofa-verify" data-fd-dialog-step="recovery" data-fd-dialog-step-delay="600">
              <span>Verify and continue</span>
            </button>
          </div>
        </section>
        <section data-step="recovery" hidden>
          <div className="fd-dialog-head">
            <h2 className="fd-h3 fd-dialog-title">Save your recovery codes</h2>
            <p className="fd-dialog-desc">Each code works once if you lose access to your authenticator app.</p>
            <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
              <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
            </button>
          </div>
          <div className="fd-dialog-body fd-stack">
            <div className="fd-callout" data-tone="warning" role="note">
              <svg className="fd-icon fd-callout-icon" data-icon="triangle-alert" aria-hidden="true"><use href="#i-triangle-alert" /></svg>
              <div className="fd-callout-content">
                <p className="fd-callout-title">Store them somewhere safe</p>
                <p className="fd-callout-body">We show these once. A password manager is a good place for them.</p>
              </div>
            </div>
            <figure className="fd-codeblock">
              <button className="fd-codeblock-copy" aria-label="Copy recovery codes">
                <svg className="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy" /></svg>
              </button>
              <pre className="fd-codeblock-body"><code data-lang="text">{"k7f2-9xqm  p4vd-83hn\nt2zc-6wje  m9ra-4ukb\nh5ns-1dyq  x8gp-7ltv\nc3bw-0fok  v6ie-2rnz"}</code></pre>
            </figure>
          </div>
          <div className="fd-dialog-foot">
            <button className="fd-btn" type="button" data-variant="primary" data-fd-dialog-close="" value="done">I have saved them</button>
          </div>
        </section>
      </dialog>
<dialog className="fd-dialog" id="dlg-email" data-size="sm" data-reset="">
        <form method="dialog" data-fd-validate="">
          <div className="fd-dialog-head">
            <h2 className="fd-h3 fd-dialog-title">Change account email</h2>
            <p className="fd-dialog-desc">We send a confirmation link to the new address. Your email changes once you open it.</p>
            <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
              <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
            </button>
          </div>
          <div className="fd-dialog-body fd-stack">
            <div className="fd-field">
              <span className="fd-field-label">Current email</span>
              <input className="fd-input" defaultValue="maya@quarry.dev" readOnly aria-label="Current email" />
            </div>
            <div className="fd-field">
              <label className="fd-field-label" htmlFor="new-email" data-required="">New email</label>
              <input className="fd-input" type="email" id="new-email" name="email" required autoComplete="off" placeholder="maya@newdomain.dev" data-error-required="Enter the new email address." data-error-type="Enter a valid email address, like maya@newdomain.dev." />
            </div>
          </div>
          <div className="fd-dialog-foot">
            <button className="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close="">Cancel</button>
            <button className="fd-btn" type="submit" value="send" data-variant="primary">
              <span>Send confirmation</span>
            </button>
          </div>
        </form>
      </dialog>
<dialog className="fd-dialog fd-confirm" id="dlg-delete-account" data-size="sm" data-confirm="maya@quarry.dev">
        <form method="dialog">
          <div className="fd-dialog-head">
            <h2 className="fd-h3 fd-dialog-title">Delete your account</h2>
            <p className="fd-dialog-desc">This deletes your account, your API keys and your run history. Teams you own must be deleted or transferred first. You can’t undo this.</p>
          </div>
          <div className="fd-dialog-body">
            <div className="fd-field">
              <label className="fd-field-label" htmlFor="da-confirm">Type <span className="fd-confirm-phrase">maya@quarry.dev</span> to confirm</label>
              <input className="fd-input" id="da-confirm" data-fd-confirm-input="" autoComplete="off" autoCapitalize="off" spellCheck="false" />
            </div>
          </div>
          <div className="fd-dialog-foot">
            <button className="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close="">Cancel</button>
            <button className="fd-btn" type="submit" data-variant="danger" value="confirm" data-fd-confirm-submit="" disabled>
              <span>Delete account</span>
            </button>
          </div>
        </form>
      </dialog>
<dialog className="fd-dialog" id="dlg-terms" data-size="md">
        <div className="fd-dialog-head">
          <h2 className="fd-h3 fd-dialog-title" data-terms-title="">Provider terms</h2>
          <p className="fd-dialog-desc" data-terms-desc="">Last updated Sep 12, 2026.</p>
          <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
            <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
          </button>
        </div>
        <div className="fd-dialog-body fd-stack">
          <ul className="fd-feature-list" data-size="sm">
            <li>
              <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
              <span>Results can be used inside your product and shown to your own customers.</span>
            </li>
            <li>
              <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
              <span>Raw data cannot be resold, redistributed or used to build a competing dataset.</span>
            </li>
            <li>
              <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
              <span>Calls are billed in credits at the rate on the provider page, with no minimum.</span>
            </li>
            <li>
              <svg className="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check" /></svg>
              <span>Either side can end access with 30 days’ notice.</span>
            </li>
          </ul>
          <label className="fd-checkbox" id="terms-accept-wrap">
            <input type="checkbox" id="terms-accept" />
            <span className="fd-checkbox-box"></span>
            <span className="fd-checkbox-text">
              <span className="fd-checkbox-label">I accept these terms for Quarry Labs</span>
              <span className="fd-checkbox-desc">Everyone on the team can then call this provider.</span>
            </span>
          </label>
        </div>
        <div className="fd-dialog-foot">
          <button className="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close="">Close</button>
          <button className="fd-btn" type="button" data-variant="primary" data-fd-dialog-close="" value="accept" id="terms-accept-btn" disabled>Accept terms</button>
        </div>
      </dialog>
<dialog className="fd-dialog" id="dlg-email-prefs" data-size="md">
        <div className="fd-dialog-head">
          <h2 className="fd-h3 fd-dialog-title">Email notifications</h2>
          <p className="fd-dialog-desc">Sent to <span className="fd-mono">maya@quarry.dev</span>.</p>
          <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
            <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
          </button>
        </div>
        <div className="fd-dialog-body fd-options">
          <label className="fd-switch">
            <input type="checkbox" role="switch" defaultChecked />
            <span className="fd-switch-track"></span>
            <span className="fd-switch-text">
              <span className="fd-switch-label">Failed runs</span>
              <span className="fd-switch-desc">One email per failing crawl, batch or monitor, at most once an hour.</span>
            </span>
          </label>
          <label className="fd-switch">
            <input type="checkbox" role="switch" defaultChecked />
            <span className="fd-switch-track"></span>
            <span className="fd-switch-text">
              <span className="fd-switch-label">Usage alerts</span>
              <span className="fd-switch-desc">When you pass 80% and 95% of your monthly credits.</span>
            </span>
          </label>
          <label className="fd-switch">
            <input type="checkbox" role="switch" />
            <span className="fd-switch-track"></span>
            <span className="fd-switch-text">
              <span className="fd-switch-label">Weekly usage summary</span>
              <span className="fd-switch-desc">Credits used per endpoint, every Monday.</span>
            </span>
          </label>
          <label className="fd-switch" data-locked="">
            <input type="checkbox" role="switch" defaultChecked disabled />
            <span className="fd-switch-track"></span>
            <span className="fd-switch-text">
              <span className="fd-switch-label">Billing and security</span>
            </span>
            <span className="fd-switch-lock"><svg className="fd-icon" data-icon="lock" aria-hidden="true"><use href="#i-lock" /></svg>Always</span>
          </label>
        </div>
        <div className="fd-dialog-foot">
          <button className="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close="">Cancel</button>
          <button className="fd-btn" type="button" data-variant="primary" data-fd-dialog-close="" value="save">Save preferences</button>
        </div>
      </dialog>
<dialog className="fd-dialog" id="dlg-endpoint" data-size="md" data-reset="">
        <form method="dialog" data-fd-validate="">
          <div className="fd-dialog-head">
            <h2 className="fd-h3 fd-dialog-title">Add webhook endpoint</h2>
            <p className="fd-dialog-desc">Ember sends a signed POST to this URL. It must answer with a 2xx within 10 seconds.</p>
            <button className="fd-btn fd-dialog-close" type="button" data-variant="ghost" data-size="sm" data-icon-only="" data-fd-dialog-close="" aria-label="Close">
              <svg className="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x" /></svg>
            </button>
          </div>
          <div className="fd-dialog-body fd-stack">
            <div className="fd-field">
              <label className="fd-field-label" htmlFor="ep-url" data-required="">Endpoint URL</label>
              <input className="fd-input" data-mono="" type="url" id="ep-url" name="url" required pattern="https://.+" autoComplete="off" spellCheck="false" placeholder="https://api.quarry.dev/hooks/ember" data-error-required="Enter the URL that should receive events." data-error-type="Enter a full URL starting with https://." data-error-pattern="Endpoints must use https://." />
            </div>
            <div className="fd-field" role="group" aria-labelledby="ep-events-label">
              <span className="fd-field-label" id="ep-events-label">Events</span>
              <div className="fd-options">
                <label className="fd-checkbox">
                  <input type="checkbox" name="events" value="crawl.completed" defaultChecked />
                  <span className="fd-checkbox-box"></span>
                  <span className="fd-checkbox-text">
                    <span className="fd-checkbox-label fd-mono">crawl.completed</span>
                  </span>
                </label>
                <label className="fd-checkbox">
                  <input type="checkbox" name="events" value="monitor.changed" />
                  <span className="fd-checkbox-box"></span>
                  <span className="fd-checkbox-text">
                    <span className="fd-checkbox-label fd-mono">monitor.changed</span>
                  </span>
                </label>
                <label className="fd-checkbox">
                  <input type="checkbox" name="events" value="agent.finished" />
                  <span className="fd-checkbox-box"></span>
                  <span className="fd-checkbox-text">
                    <span className="fd-checkbox-label fd-mono">agent.finished</span>
                  </span>
                </label>
                <label className="fd-checkbox">
                  <input type="checkbox" name="events" value="batch.completed" />
                  <span className="fd-checkbox-box"></span>
                  <span className="fd-checkbox-text">
                    <span className="fd-checkbox-label fd-mono">batch.completed</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div className="fd-dialog-foot">
            <button className="fd-btn" type="button" data-variant="ghost" data-fd-dialog-close="">Cancel</button>
            <button className="fd-btn" type="submit" value="add" data-variant="primary">
              <span>Add endpoint</span>
            </button>
          </div>
        </form>
      </dialog>
    </SettingsScreen>
  );
}
