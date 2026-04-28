import type { ChangePasswordResponse, CurrentEmployee, UserSettings } from "../domains/profile";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { ProfileClient } from "./profile-client";

export function createHttpProfileClient(http: HttpClient = defaultHttpClient): ProfileClient {
	return {
		me: () => http.get<CurrentEmployee>(`/api/me`),

		settings: () => http.get<UserSettings>(`/api/profile/settings`),

		update: (patch) => http.patch<UserSettings>(`/api/profile/settings`, { body: patch }),

		changePassword: (currentPassword, newPassword) =>
			http.post<ChangePasswordResponse>(`/api/profile/password`, {
				body: { currentPassword, newPassword },
			}),
	};
}
