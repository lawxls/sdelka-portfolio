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

/**
 * Public seam for the auth/session domain. Implementations are in-memory
 * (mock store) or HTTP (Django `/api/v1/auth/*` endpoints). Hooks pull this
 * through context, so swapping adapters is a one-line change in the
 * composition root.
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
	/** Self-signup. Returns the new user record without tokens — the user must
	 * confirm their email (and then `confirmEmail` auto-logs them in). */
	register(input: RegisterInput): Promise<RegisterResult>;
	/** Confirm an email-link uid+token pair; on success the backend issues an
	 * access token + sets the refresh cookie, so the user lands signed in. */
	confirmEmail(input: ConfirmEmailInput): Promise<ConfirmEmailResult>;
	/** Pre-check whether an email is already registered, so the register form
	 * can surface a "this email is taken" hint before the user fills out the
	 * rest of the details stage. */
	checkEmail(email: string): Promise<CheckEmailResult>;
	/** Re-issue an email-confirmation link. Anti-enumeration: the backend
	 * responds with the same 200 regardless of whether the email exists, is
	 * already verified, or has never been seen — the UI never tells the user
	 * which case applies. */
	resendConfirmation(email: string): Promise<void>;
	/** Request a password-reset email. Anti-enumeration: the backend always
	 * responds 200, regardless of whether the email matches a known account —
	 * the UI surfaces the same generic "если аккаунт существует, мы отправили
	 * письмо" success copy in either case. */
	forgotPassword(input: ForgotPasswordInput): Promise<void>;
	/** Consume a password-reset uid+token pair from the email link, validate
	 * the new password, and persist it. The user is NOT auto-logged-in — they
	 * land on a "пароль изменён" success screen and re-enter via /login. */
	resetPassword(input: ResetPasswordInput): Promise<void>;
	/** Authed-only: send the current user a password-reset email. The settings
	 * "change password" CTA calls this — there is no body, the backend pulls
	 * the email from the session. The user completes the change via the link,
	 * which lands on `/reset-password` (same surface as forgot-password). */
	requestPasswordChange(): Promise<void>;
}
