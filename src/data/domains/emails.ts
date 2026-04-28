/**
 * Emails domain types — the import surface used by the emails client and
 * contract tests. Behavior, fixtures, and display configs (`EMAIL_TYPE_LABELS`,
 * `EmailStatus`, `EmailType`) live in `emails-mock-data`; components keep
 * importing them from there directly per the existing pattern.
 */
export type { AddEmailPayload, WorkspaceEmail } from "../emails-mock-data";
