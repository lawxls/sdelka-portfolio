import type { NotificationsResponse } from "../domains/notifications";
import type { Notification } from "../notification-types";
import {
	_setNotifications,
	fetchNotificationsMock,
	markAllNotificationsAsReadMock,
	markNotificationAsReadMock,
} from "../notifications-mock-data";
import type { NotificationsClient } from "./notifications-client";

export interface InMemoryNotificationsOptions {
	/** Replace the module-level mock store at construction time. Used by tests
	 * to seed deterministically without reaching into `_setNotifications`
	 * directly. Pass an empty array to reset to a clean slate. */
	seed?: Notification[];
	/** Pre-set read ids alongside `seed`. Defaults to empty. */
	readIds?: string[];
}

/**
 * Build an in-memory notifications adapter wrapping the module-level mock
 * store (`notifications-mock-data`). The store is a singleton so tests that
 * seed via `options.seed` and consumers that rely on the seeded session
 * read state see the same values.
 */
export function createInMemoryNotificationsClient(options?: InMemoryNotificationsOptions): NotificationsClient {
	if (options?.seed !== undefined) {
		_setNotifications(options.seed, options.readIds ?? []);
	}

	return {
		async list(): Promise<NotificationsResponse> {
			return fetchNotificationsMock();
		},

		async markAsRead(id: string): Promise<void> {
			return markNotificationAsReadMock(id);
		},

		async markAllAsRead(): Promise<void> {
			return markAllNotificationsAsReadMock();
		},
	};
}
