import type { CurrentEmployee } from "../domains/profile";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { ProfileClient } from "./profile-client";

export function createHttpProfileClient(http: HttpClient = defaultHttpClient): ProfileClient {
	return {
		me: () => http.get<CurrentEmployee>(`/users/me/`),

		update: (patch) => http.patch<CurrentEmployee>(`/users/me/`, { body: patch }),
	};
}
