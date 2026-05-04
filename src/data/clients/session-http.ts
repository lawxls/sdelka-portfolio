import type { LoginInput, LoginResult, RefreshResult } from "../domains/session";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { SessionClient } from "./session-client";

/**
 * HTTP adapter for the session domain. All endpoints pass `skipRefresh: true`
 * so the http-client's 401-refresh interceptor never recurses through them:
 * - login: a 401 here means "wrong credentials"; retrying after a refresh
 *   wouldn't change the answer, so propagate it directly.
 * - refresh: a 401 here means the refresh cookie is gone or expired; calling
 *   refresh from the refresh path would loop forever.
 * - logout: a 401 here means the refresh cookie is already gone; the local
 *   cleanup in `useLogout` runs anyway, so a refresh-then-retry would just
 *   delay the inevitable.
 */
export function createHttpSessionClient(http: HttpClient = defaultHttpClient): SessionClient {
	return {
		login: (input: LoginInput) => http.post<LoginResult>(`/auth/login/`, { body: input, skipRefresh: true }),

		refresh: () => http.post<RefreshResult>(`/auth/refresh/`, { body: {}, skipRefresh: true }),

		logout: () => http.post<void>(`/auth/logout/`, { body: {}, skipRefresh: true }),
	};
}
