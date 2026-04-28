/**
 * Notifications domain types — the import surface used by the notifications
 * client and contract tests. Behavior, fixtures, and the icon/title display
 * configs (`NOTIFICATION_TITLES`, `NOTIFICATION_ICONS`) live elsewhere; this
 * module is types-only. Components keep importing the per-type discriminated
 * union members (`SearchCompletedNotification`, etc.) directly from
 * `notification-types.ts` per the existing pattern.
 */
import type { Notification } from "../notification-types";

export type { Notification } from "../notification-types";

/**
 * List response — its own typed shape, distinct from `CursorPage<T>`. The
 * notifications list is a flat snapshot plus a per-call read-id projection
 * (the read state is session-only in the in-memory adapter; HTTP backends
 * surface the per-user persisted set).
 */
export interface NotificationsResponse {
	notifications: Notification[];
	readIds: string[];
}
