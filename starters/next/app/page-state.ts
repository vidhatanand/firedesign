// The states a screen can be in, reached with `?state=` (the same names as Fire's templates), shared by the page (server:
// what the first paint shows, from `searchParams`) and its behaviour (client: what Retry and the demo switch do next).
//   loading: the skeletons stay   ready: the data   empty: an account with no traffic yet   error: a failed request, with Retry
// A screen lists the ones it supports; any other value, or none, means the default (skeletons, then the data).
export type PageState = 'loading' | 'ready' | 'empty' | 'error';

/** ?state= → one of `allowed`, or undefined for anything else. */
export function askedState<S extends string>(value: string | string[] | null | undefined, allowed: readonly S[]): S | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return allowed.find((state) => state === raw);
}
