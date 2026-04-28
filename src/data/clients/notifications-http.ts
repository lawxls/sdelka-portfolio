import type { NotificationsResponse } from "../domains/notifications";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { NotificationsClient } from "./notifications-client";

const enc = encodeURIComponent;

export function createHttpNotificationsClient(http: HttpClient = defaultHttpClient): NotificationsClient {
	return {
		list: () => http.get<NotificationsResponse>(`/api/notifications`),

		markAsRead: (id: string) => http.post<void>(`/api/notifications/${enc(id)}/read`),

		markAllAsRead: () => http.post<void>(`/api/notifications/read-all`),
	};
}
