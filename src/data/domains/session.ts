/**
 * Session domain types — login, registration, email confirmation, and
 * cold-load bootstrap. Backs `useLogin`, `useRegister`, `useConfirmEmail`,
 * `useCheckEmail`, and `useSessionBootstrap`.
 *
 * The refresh token lives in an httpOnly cookie set by Django and never
 * crosses this seam; the access token is returned as a string in JSON
 * bodies and kept in `sessionStorage` by the caller.
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
	user: SessionUser;
}

export interface RefreshResult {
	access: string;
}

export interface RegisterInput {
	email: string;
	password: string;
	password_confirm: string;
	first_name: string;
	last_name: string;
	patronymic?: string;
	phone: string;
	company_name: string;
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
