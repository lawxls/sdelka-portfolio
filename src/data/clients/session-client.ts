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

// Auth/session seam. Implementations are in-memory or HTTP (Django
// /api/v1/auth/*); hooks pull this through context.
export interface SessionClient {
	login(input: LoginInput): Promise<LoginResult>;
	/** Refresh value lives in an httpOnly cookie; only the new access string
	 * crosses this seam. */
	refresh(): Promise<RefreshResult>;
	logout(): Promise<void>;
	register(input: RegisterInput): Promise<RegisterResult>;
	/** On success the backend issues an access token + sets the refresh cookie
	 * — the user lands signed in. */
	confirmEmail(input: ConfirmEmailInput): Promise<ConfirmEmailResult>;
	checkEmail(email: string): Promise<CheckEmailResult>;
	/** Anti-enumeration: backend returns 200 regardless of whether the email
	 * exists, is already verified, or is unknown. */
	resendConfirmation(email: string): Promise<void>;
	/** Anti-enumeration: backend always returns 200; UI shows the same success
	 * copy on either branch. */
	forgotPassword(input: ForgotPasswordInput): Promise<void>;
	/** User is NOT auto-logged-in — they re-enter via /login. */
	resetPassword(input: ResetPasswordInput): Promise<void>;
	/** Authed-only: backend pulls the email from the session and emails a
	 * reset link that lands on /reset-password. */
	requestPasswordChange(): Promise<void>;
}
