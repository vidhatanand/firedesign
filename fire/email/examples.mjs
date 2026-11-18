// The sign-in email the docs and the tests render, for two looks. Ember is Fire's demo product.
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
