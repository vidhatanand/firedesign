import { html } from 'lit';
import type { ScreenSettings } from './screen';

/** The billing panel of the settings screen (templates/settings.html). */
export const billingPanel = (s: ScreenSettings) => html`
    <section class="fd-stack" data-gap="4" id="panel-billing" data-panel="billing" aria-labelledby="h-billing" ?hidden=${s.tab !== 'billing'}>
      <header class="fd-stack" data-gap="1">
        <h2 class="fd-h2" id="h-billing" tabindex="-1">Billing</h2>
        <p class="fd-muted">Your plan, credits and payment method for Quarry Labs.</p>
      </header>

      <div id="billing-summary" data-fd-loading="true">
        <div class="fd-skeleton-stat" data-count="4"></div>
        <div class="fd-stats">
          <div class="fd-stat-tile">
            <span class="fd-stat-label">Plan</span>
            <span class="fd-stat">Hobby</span>
            <span class="fd-stat-sub">$19 per month</span>
          </div>
          <div class="fd-stat-tile">
            <span class="fd-stat-label">Renews</span>
            <span class="fd-stat">Dec 4</span>
            <span class="fd-stat-sub">in 20 days</span>
          </div>
          <div class="fd-stat-tile">
            <span class="fd-stat-label">Credits remaining</span>
            <span class="fd-stat">1,520</span>
            <div class="fd-meter" data-size="sm" data-value="1520" data-max="3000" aria-label="Credits remaining this cycle"><div class="fd-meter-track"><div class="fd-meter-fill"></div></div></div>
            <span class="fd-stat-sub">of 3,000 · resets Nov 23</span>
          </div>
          <div class="fd-stat-tile">
            <span class="fd-stat-label">Payment method</span>
            <span class="fd-stat">Visa</span>
            <span class="fd-stat-sub"><span class="fd-mono">•••• 4242</span> · exp 08/28</span>
            <a class="fd-stat-action" href="#update-card" data-update-card>Update card</a>
          </div>
        </div>
      </div>

      <div class="fd-tabs" role="tablist" aria-label="Billing" data-size="sm">
        <button class="fd-tab" role="tab" id="bt-tab-plan" aria-selected="true" aria-controls="bt-plan" data-value="plan">Plan</button>
        <button class="fd-tab" role="tab" id="bt-tab-coupons" aria-selected="false" aria-controls="bt-coupons" data-value="coupons">Coupons</button>
        <button class="fd-tab" role="tab" id="bt-tab-invoices" aria-selected="false" aria-controls="bt-invoices" data-value="invoices">Invoices <span class="fd-tab-count">5</span></button>
        <button class="fd-tab" role="tab" id="bt-tab-referrals" aria-selected="false" aria-controls="bt-referrals" data-value="referrals">Referrals</button>
      </div>

      
      <div class="fd-tab-panel" role="tabpanel" id="bt-plan" aria-labelledby="bt-tab-plan">
        <div class="fd-setting">
          <div class="fd-setting-text"><h3 class="fd-setting-title">Current plan</h3><p class="fd-setting-desc">Manage your subscription and payment method.</p></div>
          <div class="fd-plan" data-variant="row">
            <div class="fd-plan-info"><span class="fd-plan-name">Hobby</span><span class="fd-badge" data-variant="mono">$19/month</span><span class="fd-plan-allowance">3,000 credits/mo</span></div>
            <div class="fd-plan-actions">
              <button class="fd-btn" type="button" data-variant="primary" data-upgrade>Upgrade</button>
              <button class="fd-btn" type="button" data-variant="outline" data-icon-only aria-label="Plan actions" data-fd-menu="menu-plan" data-placement="bottom-end"><svg class="fd-icon" data-icon="ellipsis-vertical" aria-hidden="true"><use href="#i-ellipsis-vertical"></use></svg></button>
            </div>
          </div>
        </div>

        <div class="fd-setting" data-align="start">
          <div class="fd-setting-text"><h3 class="fd-setting-title">Smart upgrade</h3><p class="fd-setting-desc">When your credits run out mid-cycle, Ember moves you to Standard so jobs keep running, and bills only the prorated difference. Downgrade at any time and the extra credits stay until they reset.</p></div>
          <div class="fd-setting-control"><label class="fd-switch"><input type="checkbox" role="switch" data-saved-toast="Smart upgrade" aria-label="Smart upgrade"><span class="fd-switch-track"></span></label></div>
        </div>

        <div class="fd-setting" data-align="start">
          <div class="fd-setting-text"><h3 class="fd-setting-title">Auto-recharge</h3><p class="fd-setting-desc">Buy a credit pack automatically when your balance drops below a threshold. Charged to Visa <span class="fd-mono">•••• 4242</span>, at most once a day.</p></div>
          <div class="fd-setting-control"><label class="fd-switch"><input type="checkbox" role="switch" id="recharge-switch" checked aria-label="Auto-recharge"><span class="fd-switch-track"></span></label></div>
          <div class="fd-form-cols" id="recharge-fields">
            <div class="fd-field">
              <label class="fd-field-label" for="recharge-threshold">When credits fall below</label>
              <div class="fd-number">
                <button type="button" class="fd-number-step" data-fd-step="-1" aria-label="Decrease threshold"><svg class="fd-icon" data-icon="minus" aria-hidden="true"><use href="#i-minus"></use></svg></button>
                <input class="fd-number-input" type="number" id="recharge-threshold" value="500" min="100" max="5000" step="100">
                <button type="button" class="fd-number-step" data-fd-step="1" aria-label="Increase threshold"><svg class="fd-icon" data-icon="plus" aria-hidden="true"><use href="#i-plus"></use></svg></button>
              </div>
            </div>
            <div class="fd-field">
              <label class="fd-field-label" for="recharge-pack">Add this pack</label>
              <div class="fd-select" data-variant="outline">
                <select id="recharge-pack"><option>5,000 credits · $25</option><option>20,000 credits · $100</option><option>50,000 credits · $225</option></select>
              </div>
            </div>
          </div>
        </div>

        <div class="fd-setting" data-align="start">
          <div class="fd-setting-text">
            <details class="fd-disclosure" id="compare-plans">
              <summary class="fd-disclosure-trigger"><span>Compare plans</span><svg class="fd-icon" data-icon="chevron-down" aria-hidden="true"><use href="#i-chevron-down"></use></svg></summary>
              <div class="fd-disclosure-panel"><div class="fd-disclosure-inner fd-stack" data-gap="5">
                <div class="fd-row">
                  <div class="fd-segmented" role="radiogroup" aria-label="Billing period" id="seg-period">
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="true" data-value="monthly">Monthly</button>
                    <button class="fd-segmented-item" type="button" role="radio" aria-checked="false" data-value="yearly">Yearly · save 20%</button>
                  </div>
                </div>
                <div class="fd-plan-grid fd-column" data-size="lg">
                  <div class="fd-plan">
                    <div class="fd-plan-head"><h3 class="fd-plan-name">Free</h3></div>
                    <div class="fd-plan-price"><span class="fd-plan-amount" data-monthly="$0" data-yearly="$0">$0</span><span class="fd-plan-per" data-per>/month</span></div>
                    <p class="fd-plan-pitch">Try Ember on side projects.</p>
                    <ul class="fd-feature-list" data-size="sm">
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>1,000 credits per month</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>2 concurrent requests</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Community support</span></li>
                      <li data-excluded><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg><span>Webhooks</span></li>
                      <li data-excluded><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg><span>Team seats</span></li>
                    </ul>
                    <div class="fd-plan-cta"><button class="fd-btn" type="button" data-block data-downgrade>Downgrade to Free</button></div>
                  </div>
                  <div class="fd-plan" data-current>
                    <div class="fd-plan-head"><h3 class="fd-plan-name">Hobby</h3><span class="fd-status" data-size="sm" data-tone="success">Current</span></div>
                    <div class="fd-plan-price"><span class="fd-plan-amount" data-monthly="$19" data-yearly="$15">$19</span><span class="fd-plan-per" data-per>/month</span></div>
                    <p class="fd-plan-pitch">For apps that scrape on a schedule.</p>
                    <ul class="fd-feature-list" data-size="sm">
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>3,000 credits per month</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>5 concurrent requests</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Email support</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Webhooks</span></li>
                      <li data-excluded><svg class="fd-icon" data-icon="x" aria-hidden="true"><use href="#i-x"></use></svg><span>Team seats</span></li>
                    </ul>
                    <div class="fd-plan-cta"><button class="fd-btn" type="button" data-block disabled>Current plan</button></div>
                  </div>
                  <div class="fd-plan" data-recommended>
                    <div class="fd-plan-head"><h3 class="fd-plan-name">Standard</h3><span class="fd-badge" data-variant="solid">Recommended</span></div>
                    <div class="fd-plan-price"><span class="fd-plan-amount" data-monthly="$99" data-yearly="$79">$99</span><span class="fd-plan-per" data-per>/month</span></div>
                    <p class="fd-plan-pitch">For products with real traffic.</p>
                    <ul class="fd-feature-list" data-size="sm" data-tone="accent">
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>100,000 credits per month</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>50 concurrent requests</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Priority queue</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Webhooks and audit log</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>5 team seats</span></li>
                    </ul>
                    <div class="fd-plan-cta"><button class="fd-btn" type="button" data-variant="accent-soft" data-block data-plan="Standard">Upgrade to Standard</button></div>
                  </div>
                  <div class="fd-plan">
                    <div class="fd-plan-head"><h3 class="fd-plan-name">Scale</h3></div>
                    <div class="fd-plan-price"><span class="fd-plan-amount" data-monthly="$399" data-yearly="$319">$399</span><span class="fd-plan-per" data-per>/month</span></div>
                    <p class="fd-plan-pitch">For data teams running large crawls.</p>
                    <ul class="fd-feature-list" data-size="sm">
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>500,000 credits per month</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>150 concurrent requests</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Dedicated support channel</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>SSO and custom retention</span></li>
                      <li><svg class="fd-icon" data-icon="check" aria-hidden="true"><use href="#i-check"></use></svg><span>Unlimited team seats</span></li>
                    </ul>
                    <div class="fd-plan-cta"><button class="fd-btn" type="button" data-variant="outline" data-block data-sales>Talk to sales</button></div>
                  </div>
                </div>
              </div></div>
            </details>
          </div>
        </div>
      </div>

      
      <div class="fd-tab-panel" role="tabpanel" id="bt-coupons" aria-labelledby="bt-tab-coupons" hidden>
        <div class="fd-setting" data-align="start" data-control="wide">
          <div class="fd-setting-text"><h3 class="fd-setting-title">Redeem a coupon</h3><p class="fd-setting-desc">Coupons apply to your next invoice. One coupon can be active at a time.</p></div>
          <div class="fd-setting-control">
            <div class="fd-field">
              <label class="fd-field-label fd-sr-only" for="coupon-code">Coupon code</label>
              <div class="fd-input-pair" data-joined>
                <input class="fd-input" id="coupon-code" data-mono placeholder="Enter coupon code" autocomplete="off" spellcheck="false" aria-describedby="coupon-hint coupon-error">
                <button type="button" class="fd-btn" data-variant="outline" id="coupon-apply" disabled>Apply</button>
              </div>
              <p class="fd-field-hint" id="coupon-hint">For this demo, <span class="fd-mono">QUARRY20</span> is a valid code.</p>
              <p class="fd-field-error" id="coupon-error" hidden><svg class="fd-icon" data-size="14" data-icon="circle-alert" aria-hidden="true"><use href="#i-circle-alert"></use></svg><span>That code is not valid or has expired. Check the spelling and try again.</span></p>
            </div>
          </div>
          <div class="fd-callout" data-tone="success" role="status" id="coupon-success" hidden>
            <svg class="fd-icon fd-callout-icon" data-icon="circle-check" aria-hidden="true"><use href="#i-circle-check"></use></svg>
            <div class="fd-callout-content"><p class="fd-callout-title">Coupon applied</p><p class="fd-callout-body">20% off your next 3 invoices. Your Dec 4 invoice will be $15.20.</p></div>
          </div>
        </div>
        <div class="fd-setting" data-align="start">
          <div class="fd-setting-text"><h3 class="fd-setting-title">Applied coupons</h3><p class="fd-setting-desc" id="coupon-empty">No coupons applied yet. Codes you redeem show up here.</p></div>
          <ul class="fd-list" data-card id="coupon-list" aria-label="Applied coupons" hidden>
            <li class="fd-list-row">
              <span class="fd-list-lead" data-tone="accent"><svg class="fd-icon" data-icon="tag" aria-hidden="true"><use href="#i-tag"></use></svg></span>
              <div class="fd-list-body"><span class="fd-list-title fd-mono">QUARRY20</span><span class="fd-list-desc">20% off for 3 months · applied Nov 14</span></div>
              <span class="fd-list-meta"><span class="fd-badge" data-tone="success" data-dot>Active</span></span>
              <span class="fd-list-trail"><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" id="coupon-remove">Remove</button></span>
            </li>
          </ul>
        </div>
      </div>

      
      <div class="fd-tab-panel" role="tabpanel" id="bt-invoices" aria-labelledby="bt-tab-invoices" hidden>
        <div class="fd-setting" data-align="start">
          <div class="fd-setting-text"><h3 class="fd-setting-title">Invoices</h3><p class="fd-setting-desc">Receipts for your Hobby subscription and credit packs. Invoices are sent to <span class="fd-mono">maya@quarry.dev</span>.</p></div>
          <div class="fd-table-wrap">
            <div class="fd-table-scroll">
              <table class="fd-table" data-stack aria-label="Invoices">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th data-num>Amount</th>
                    <th>Status</th>
                    <th data-actions><span class="fd-sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-stack-title>Nov 14, 2026</td>
                    <td data-mono>INV-2026-0121</td>
                    <td data-num>$25.00</td>
                    <td><span class="fd-status" data-tone="warning">Open</span></td>
                    <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0121" aria-label="Download INV-2026-0121"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                  </tr>
                  <tr>
                    <td data-stack-title>Nov 4, 2026</td>
                    <td data-mono>INV-2026-0118</td>
                    <td data-num>$19.00</td>
                    <td><span class="fd-status" data-tone="success">Paid</span></td>
                    <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0118" aria-label="Download INV-2026-0118"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                  </tr>
                  <tr>
                    <td data-stack-title>Oct 21, 2026</td>
                    <td data-mono>INV-2026-0107</td>
                    <td data-num>$25.00</td>
                    <td><span class="fd-status" data-tone="success">Paid</span></td>
                    <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0107" aria-label="Download INV-2026-0107"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                  </tr>
                  <tr>
                    <td data-stack-title>Oct 4, 2026</td>
                    <td data-mono>INV-2026-0096</td>
                    <td data-num>$19.00</td>
                    <td><span class="fd-status" data-tone="success">Paid</span></td>
                    <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0096" aria-label="Download INV-2026-0096"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                  </tr>
                  <tr>
                    <td data-stack-title>Sep 4, 2026</td>
                    <td data-mono>INV-2026-0081</td>
                    <td data-num>$19.00</td>
                    <td><span class="fd-status" data-tone="neutral">Refunded</span></td>
                    <td data-actions><button class="fd-btn" type="button" data-variant="ghost" data-size="sm" data-icon-only data-download="INV-2026-0081" aria-label="Download INV-2026-0081"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fd-table-foot">
              <span class="fd-table-foot-info">5 of 5 invoices · last 90 days</span>
              <div class="fd-table-foot-actions">
                <button class="fd-btn" type="button" data-size="sm" data-download="all invoices"><svg class="fd-icon" data-icon="download" aria-hidden="true"><use href="#i-download"></use></svg><span>Download all</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div class="fd-tab-panel" role="tabpanel" id="bt-referrals" aria-labelledby="bt-tab-referrals" hidden>
        <div class="fd-setting" data-align="start">
          <div class="fd-setting-text"><h3 class="fd-setting-title">Your referral link</h3><p class="fd-setting-desc">Share it with a friend. When they run their first request, you both get 500 credits.</p></div>
          <div class="fd-copy-field" data-value="https://ember.dev/r/quarry-labs-7k2q" data-noun="referral link">
            <span class="fd-copy-field-label">Referral link</span>
            <div class="fd-copy-field-actions"><button type="button" class="fd-btn" data-variant="ghost" data-size="sm" data-icon-only data-fd-field-action="copy" aria-label="Copy referral link" data-fd-toast='{"title":"Referral link copied","tone":"success"}'><svg class="fd-icon" data-icon="copy" aria-hidden="true"><use href="#i-copy"></use></svg></button></div>
            <code class="fd-copy-field-value"></code>
          </div>
          <div class="fd-stats fd-column" data-size="sm">
            <div class="fd-stat-tile"><span class="fd-stat-label">Friends joined</span><span class="fd-stat">3</span><span class="fd-stat-sub">1 invite pending</span></div>
            <div class="fd-stat-tile"><span class="fd-stat-label">Credits earned</span><span class="fd-stat">1,500</span><span class="fd-stat-sub">500 per friend</span></div>
          </div>
        </div>
        <div class="fd-setting" data-align="start">
          <div class="fd-setting-text">
            <h3 class="fd-setting-title">How it works</h3>
            <div class="fd-stack" data-gap="3">
              <p class="fd-setting-desc">Three steps, and nobody has to copy a code.</p>
              <ul class="fd-feature-list">
                <li><svg class="fd-icon" data-icon="share-2" aria-hidden="true"><use href="#i-share-2"></use></svg><span>Send your link to a developer who needs web data.</span></li>
                <li><svg class="fd-icon" data-icon="user-plus" aria-hidden="true"><use href="#i-user-plus"></use></svg><span>They create an Ember account and make their first request.</span></li>
                <li><svg class="fd-icon" data-icon="gift" aria-hidden="true"><use href="#i-gift"></use></svg><span>You each get 500 credits, added within a minute and valid for 90 days.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
