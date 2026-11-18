import { realpathSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

// In this repository fire-design is `file:../..`, a symlink out of the project: Turbopack's root must hold the files
// it points at. A project that depends on github:vidhatanand/firedesign#v0.6.0 has a real folder and needs no root.
const here = process.cwd();
const fire = realpathSync(path.join(here, 'node_modules/fire-design'));
const common = (a: string, b: string) => {
  const x = a.split(path.sep), y = b.split(path.sep);
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  return x.slice(0, i).join(path.sep) || path.sep;
};
const root = path.relative(here, fire).startsWith('..') ? common(here, fire) : undefined;

const config: NextConfig = {
  // The check builds with Ember's look into its own folder, so `npm run build` output is never mixed with it.
  distDir: process.env.FIRE_DIST_DIR || '.next',
  poweredByHeader: false,
  ...(root ? { turbopack: { root }, outputFileTracingRoot: root } : {}),
  // The screens keep the templates' links as written (logs.html, settings.html#team, …), so their markup stays
  // identical to Fire's templates; these rewrites serve them from the routes.
  async rewrites() {
    return ['overview', 'logs', 'settings'].map((name) => ({ source: `/${name}.html`, destination: `/${name}` }));
  },
};

export default config;
