import { routeQuery } from './router';

/**
 * The states a screen can be in, reached with `?state=` (the same names as Fire's templates): `loading` keeps the
 * skeletons, `ready` is the data, `empty` is an account with no traffic yet, `error` is a failed request with Retry.
 * A screen lists the ones it supports; any other value, or none, means the default (skeletons, then the data).
 */
export type PageState = 'loading' | 'ready' | 'empty' | 'error';

/** The `?state=` of the current URL when the screen allows it, else `undefined`. */
export function askedState<S extends string>(allowed: readonly S[]): S | undefined {
  const asked = routeQuery().get('state');
  return allowed.find((state) => state === asked);
}
