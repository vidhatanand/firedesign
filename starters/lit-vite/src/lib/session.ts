/**
 * Who is using the app, as the router's guards see it. This is the starter's stand-in: signed in and allowed
 * everything. A product replaces `stub` with its own session (read from a cookie or an API call before
 * `startRouter`, or after sign-in) by calling `setSession`; guards call `session()` each time they run.
 */
export interface Session {
  readonly signedIn: boolean;
  /** Whether the person may do something, for example `can('billing:read')`. */
  can(permission: string): boolean;
}

/** The stand-in. `sessionStorage['ember-deny']` (comma-separated permissions) takes some away, so the guard can be tried. */
const stub: Session = {
  signedIn: true,
  can(permission) {
    try { return !(sessionStorage.getItem('ember-deny') ?? '').split(',').includes(permission); } catch { return true; }
  },
};

let current: Session = stub;

export const session = (): Session => current;

export function setSession(next: Session): void {
  current = next;
}
