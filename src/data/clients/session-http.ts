import type {
	CheckEmailResult,
	ConfirmEmailInput,
	ConfirmEmailResult,
	ForgotPasswordInput,
	LoginInput,
	LoginResult,
	RefreshResult,
	RegisterInput,
	RegisterResult,
	ResetPasswordInput,
} from "../domains/session";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { SessionClient } from "./session-client";

/**
 * HTTP adapter for the session domain. All endpoints pass `skipRefresh: true`
 * so the http-client's 401-refresh interceptor never recurses through them:
 * - login / register / confirm-email / check-email: the user has no session
 *   yet, so a 401-refresh dance is meaningless.
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

		register: (input: RegisterInput) =>
			http.post<RegisterResult>(`/auth/register/`, { body: input, skipRefresh: true }),

		confirmEmail: (input: ConfirmEmailInput) =>
			http.post<ConfirmEmailResult>(`/auth/confirm-email/`, { body: input, skipRefresh: true }),

		checkEmail: (email: string) =>
			http.post<CheckEmailResult>(`/auth/check-email/`, { body: { email }, skipRefresh: true }),

		resendConfirmation: (email: string) =>
			http.post<void>(`/auth/resend-confirmation/`, { body: { email }, skipRefresh: true }),

		forgotPassword: (input: ForgotPasswordInput) =>
			http.post<void>(`/auth/forgot-password/`, { body: input, skipRefresh: true }),

		resetPassword: (input: ResetPasswordInput) =>
			http.post<void>(`/auth/reset-password/`, { body: input, skipRefresh: true }),

		// Authed call: rides the standard 401-refresh path (no skipRefresh) — if
		// the access token has just expired, the interceptor refreshes silently.
		requestPasswordChange: () => http.post<void>(`/auth/request-password-change/`, { body: {} }),
	};
}
