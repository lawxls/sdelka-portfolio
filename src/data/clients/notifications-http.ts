import type { NotificationsResponse } from "../domains/notifications";
import type { HttpClient } from "../http-client";
import type { NotificationsClient } from "./notifications-client";

const EMPTY_RESPONSE: NotificationsResponse = { notifications: [], readIds: [] };

// Backend has no /notifications endpoint yet — keep the seam in place but skip
// the HTTP fetch so the bell renders an empty state instead of paging on 404s.
export function createHttpNotificationsClient(_http?: HttpClient): NotificationsClient {
	return {
		list: () => Promise.resolve(EMPTY_RESPONSE),
		markAsRead: () => Promise.resolve(),
		markAllAsRead: () => Promise.resolve(),
	};
}
