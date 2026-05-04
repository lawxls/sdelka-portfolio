import type { LoginInput, LoginResult, RefreshResult } from "../domains/session";

/**
 * Public seam for the auth/session domain. Implementations are in-memory
 * (mock store) or HTTP (Django `/api/v1/auth/*` endpoints). Hooks pull this
 * through context, so swapping adapters is a one-line change in the
 * composition root.
 *
 * Subsequent slices add `register`, `confirmEmail`, `forgotPassword`,
 * `resetPassword`, `requestPasswordChange`, `resendConfirmation`, and
 * `checkEmail`.
 */
export interface SessionClient {
	login(input: LoginInput): Promise<LoginResult>;
	/** Trade the refresh cookie for a fresh access token. The refresh value
	 * itself never enters JS — Django reads it from the httpOnly cookie and
	 * sets a rotated cookie on the response. */
	refresh(): Promise<RefreshResult>;
	/** Tell the backend to blacklist the refresh cookie. The hook layer
	 * (`useLogout`) handles the local cleanup (sessionStorage + query cache +
	 * `AUTH_CLEARED_EVENT`) and tolerates errors so a network blip on the way
	 * out still drops the user back to /login. */
	logout(): Promise<void>;
}
