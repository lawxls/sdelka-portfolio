/**
 * Session domain types — login, registration, email confirmation, and
 * cold-load bootstrap. Backs `useLogin`, `useRegister`, `useConfirmEmail`,
 * `useCheckEmail`, and `useSessionBootstrap`.
 *
 * Both access and refresh tokens are returned in JSON bodies and stored in
 * `sessionStorage` by the caller. The refresh token is echoed back to the
 * backend on `/auth/logout/` and `/auth/refresh/`.
 */

export interface LoginInput {
	email: string;
	password: string;
}

export interface SessionUser {
	id: number;
	email: string;
}

export interface LoginResult {
	access: string;
	refresh: string;
	user: SessionUser;
}

export interface RefreshResult {
	access: string;
	/** SimpleJWT may rotate refresh tokens; absent when rotation is off. */
	refresh?: string;
}

export interface RegisterInput {
	email: string;
	password: string;
	password_confirm: string;
	first_name: string;
	last_name: string;
	patronymic?: string;
	phone: string;
}

export interface RegisterResult {
	user: SessionUser;
}

export interface ConfirmEmailInput {
	uid: string;
	token: string;
}

/** confirm-email auto-logs the user in: same shape as `LoginResult`. */
export type ConfirmEmailResult = LoginResult;

export interface CheckEmailResult {
	exists: boolean;
}

export interface ForgotPasswordInput {
	email: string;
}

export interface ResetPasswordInput {
	uid: string;
	token: string;
	new_password: string;
	new_password_confirm: string;
}
