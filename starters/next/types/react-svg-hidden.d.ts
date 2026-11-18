// React renders `hidden` on an <svg> (the sprite is kept out of layout with it, spec I2/N8), but @types/react lists
// `hidden` only for HTML elements.
import 'react';

declare module 'react' {
  interface SVGAttributes<T> {
    hidden?: boolean | undefined;
  }
}
