// The emails the docs and the tests render: the sign-in email for two looks, and a newsletter issue (0.8; the same
// content templates/site-newsletter.html shows as its sample issue). Ember is Fire's demo product.
export const BRAND = { name: 'Ember' };
export const THEMES = {
  ember: { contract: 'fire/1', palette: 'ember' },
  generated: { contract: 'fire/1', palette: { from: 'accent', accent: '#1f6feb', neutral: 'cool' }, type: 'editorial', dials: { corners: 1.5 } },
};
export const signIn = (extra = {}) => ({
  brand: BRAND,
  preheader: 'Your sign-in link for Ember expires in 15 minutes.',
  blocks: [
    { type: 'heading', text: 'Sign in to Ember' },
    { type: 'text', text: 'Press the button to sign in as maya@acme.example. The link works once and expires in 15 minutes.' },
    { type: 'button', label: 'Sign in to Ember', href: 'https://app.ember.example/auth/verify?token=7f3a91c0' },
    { type: 'text', text: 'On a different device? Enter this code on the sign-in page instead.' },
    { type: 'code', label: 'Your code', value: '482 913' },
    { type: 'keyValue', rows: [
      { label: 'Requested from', value: 'Chrome on macOS' },
      { label: 'Location', value: 'Lisbon, Portugal' },
      { label: 'Time', value: '18 Nov 2026, 09:41 UTC' },
    ] },
    { type: 'divider' },
    { type: 'note', title: 'Not you?', text: 'Ignore this email and nothing happens. If you keep getting these, reply and we will look into it.' },
    { type: 'footer', lines: ['Ember, Inc. 548 Market St, San Francisco'], links: [{ label: 'Privacy', href: 'https://ember.example/privacy' }, { label: 'Help centre', href: 'https://ember.example/help' }] },
  ],
  ...extra,
});

// One issue of Ember Dispatch, the monthly newsletter.
export const newsletter = (extra = {}) => ({
  brand: BRAND,
  preheader: 'Monitors are generally available, and 61% of pricing pages changed in 18 months.',
  blocks: [
    { type: 'heading', text: 'Ember Dispatch, November 2026' },
    { type: 'text', text: 'What shipped in Ember this month, what we measured across the pages our monitors watch, and one customer story. Four minutes to read.' },
    { type: 'section', title: 'Shipped' },
    { type: 'story', kind: 'Release', title: 'Monitors are generally available', text: 'Point a monitor at any URL, choose what counts as a change, and get a signed webhook with the diff. Checks run every 5 minutes to every 7 days, at 1 credit a check.', href: 'https://ember.example/changelog#v2-14-0', label: 'Read the release notes' },
    { type: 'story', kind: 'Release', title: 'Typed JSON in the Python and Node SDKs', text: 'Pass a Pydantic model or a Zod schema to formats and get a typed object back, or a reason why a field is missing.', href: 'https://ember.example/changelog#v2-13-2', label: 'See the SDK changes' },
    { type: 'section', title: 'Measured' },
    { type: 'story', kind: 'Report', title: '61% of pricing pages changed in 18 months', text: 'We watched 4,120 public pricing pages every 6 hours from May 2025 to October 2026. 2,513 of them changed at least once; 38% of all changes raised a price.', href: 'https://ember.example/resources/pricing-page-index-2026', label: 'Read the pricing page index' },
    { type: 'section', title: 'From customers' },
    { type: 'story', kind: 'Customer story', title: 'Fourteen scrapers became three API calls', text: 'Quarry Labs moved its price indexes to Ember in six weeks. Crawl spend fell from $19,100 in July to $12,600 in October.', href: 'https://ember.example/customers/quarry-labs', label: 'Read the Quarry Labs story' },
    { type: 'section', title: 'Also this month' },
    { type: 'list', items: [
      'Stealth proxies: time to first byte fell from 2.1 s to 1.3 s.',
      'Spend caps now work per API key.',
      ['The median scrape is 842 ms. ', { text: 'How we got there', href: 'https://ember.example/blog/median-842-ms' }, '.'],
    ] },
    { type: 'button', label: 'Read this issue on the web', href: 'https://ember.example/newsletter/2026-11', fallback: false },
    { type: 'footer', lines: ['You get this because you subscribed at ember.example. One email on the first Tuesday of each month.', 'Ember, Inc. 548 Market St, San Francisco'], links: [{ label: 'Unsubscribe', href: 'https://ember.example/newsletter/unsubscribe?u=d41f' }, { label: 'Past issues', href: 'https://ember.example/newsletter' }, { label: 'Privacy', href: 'https://ember.example/privacy' }] },
  ],
  ...extra,
});
