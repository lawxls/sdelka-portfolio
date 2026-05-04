import type { LoginInput, LoginResult, RefreshResult } from "../domains/session";

/**
 * Public seam for the auth/session domain. Implementations are in-memory
 * (mock store) or HTTP (Django `/api/v1/auth/*` endpoints). Hooks pull this
 * through context, so swapping adapters is a one-line change in the
 * composition root.
 *
 * This slice ships only `login` and `refresh`. Subsequent slices add
 * `register`, `confirmEmail`, `forgotPassword`, `resetPassword`, `logout`,
 * `requestPasswordChange`, `resendConfirmation`, and `checkEmail`.
 */
export interface SessionClient {
	login(input: LoginInput): Promise<LoginResult>;
	/** Trade the refresh cookie for a fresh access token. The refresh value
	 * itself never enters JS — Django reads it from the httpOnly cookie and
	 * sets a rotated cookie on the response. */
	refresh(): Promise<RefreshResult>;
}
