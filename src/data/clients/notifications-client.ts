import type { NotificationsResponse } from "../domains/notifications";

/**
 * Public seam for the notifications domain. Implementations are in-memory
 * (mock store) or HTTP. Hooks pull this through context, so swapping
 * adapters is a one-line change in the composition root.
 *
 * The list response is `NotificationsResponse` (a flat snapshot plus
 * per-user read-id set) — not `CursorPage<T>`, since the notifications feed
 * isn't cursor-paginated.
 */
export interface NotificationsClient {
	list(): Promise<NotificationsResponse>;
	markAsRead(id: string): Promise<void>;
	markAllAsRead(): Promise<void>;
}
