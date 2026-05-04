/**
 * Session domain types — login + cold-load bootstrap. Backs `useLogin` and
 * `useSessionBootstrap`. The refresh token lives in an httpOnly cookie set by
 * Django and never crosses this seam; the access token is returned as a
 * string in JSON bodies and kept in `sessionStorage` by the caller.
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
