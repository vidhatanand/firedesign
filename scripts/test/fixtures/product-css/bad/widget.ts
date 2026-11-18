import { css } from 'lit';

export const styles = css`
  :host { display: block; }
  .a { color: var(--fd-nope); width: ${w}px; padding: 8px ${x}; }
`;
const notCss = `.b { color: red; }`;
