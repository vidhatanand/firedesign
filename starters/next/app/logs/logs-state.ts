// The states of the activity logs table, shared by the page (server: which blocks the first paint shows, from ?state=)
// and its behaviour (client). `no-results` is the loaded table with a search that matches nothing.
export const LOGS_STATES = ['loading', 'loaded', 'empty', 'error', 'no-results'] as const;
export type AskedLogsState = (typeof LOGS_STATES)[number];
/** The table's own state: what the blocks show. */
export type LogsState = Exclude<AskedLogsState, 'no-results'>;
