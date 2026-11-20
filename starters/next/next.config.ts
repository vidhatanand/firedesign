import { realpathSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

// In this repository fire-design is `file:../..`, a symlink out of the project: Turbopack's root must hold the files
// it points at. A project that depends on github:vidhatanand/firedesign#v0.10.2 has a real folder and needs no root.
const here = process.cwd();
const fire = realpathSync(path.join(here, 'node_modules/fire-design'));
const common = (a: string, b: string) => {
  const x = a.split(path.sep), y = b.split(path.sep);
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  return x.slice(0, i).join(path.sep) || path.sep;
};
const root = path.relative(here, fire).startsWith('..') ? common(here, fire) : undefined;

// `next build` uses the slim Fire that scripts/prepare-fire.mjs writes with `fire slim` (.fire-slim/: only the parts,
// modules and fonts this app uses); `next dev` keeps the whole of Fire, and FIRE_SLIM=0 builds with it (to compare).
// fire-design/react loads fire.js by a relative path (../../fire/fire.js): that request goes to the slim entry too, so
// the app has one Fire. fire-design/elements stays: it shares Fire's module files with the entry.
const slim = {
  'fire-design': './.fire-slim/fire.js',
  'fire-design/css': './.fire-slim/fire.css',
  '../../fire/fire.js': './.fire-slim/fire.js',
};

const config = (phase: string): NextConfig => ({
  // The check builds with Ember's look into its own folder, so `npm run build` output is never mixed with it.
  distDir: process.env.FIRE_DIST_DIR || '.next',
  poweredByHeader: false,
  turbopack: {
    ...(root ? { root } : {}),
    ...(phase === PHASE_PRODUCTION_BUILD && process.env.FIRE_SLIM !== '0' ? { resolveAlias: slim } : {}),
  },
  ...(root ? { outputFileTracingRoot: root } : {}),
  // The screens keep the templates' links as written (logs.html, settings.html#team, …), so their markup stays
  // identical to Fire's templates; these rewrites serve them from the routes.
  async rewrites() {
    return ['overview', 'logs', 'settings'].map((name) => ({ source: `/${name}.html`, destination: `/${name}` }));
  },
});

export default config;
