export const AUTH_CLEARED_EVENT = "auth:cleared";

const ACCESS_KEY = "auth-access-token";
const REFRESH_KEY = "auth-refresh-token";

/** Both tokens live in `sessionStorage` — scoped to the tab so closing the
 * window ends the session. The backend returns the refresh token in the JSON
 * body (not as an httpOnly cookie); we send it back on `/auth/logout/` and
 * `/auth/refresh/`. */
export function getAccessToken(): string | null {
	return sessionStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
	return sessionStorage.getItem(REFRESH_KEY);
}

/** Stores the access token and, when supplied, the refresh token. Omitting
 * `refresh` leaves any previously stored refresh token untouched — supports
 * `/auth/refresh/` responses that don't rotate the refresh token. */
export function setTokens(access: string, refresh?: string): void {
	sessionStorage.setItem(ACCESS_KEY, access);
	if (refresh !== undefined) sessionStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
	sessionStorage.removeItem(ACCESS_KEY);
	sessionStorage.removeItem(REFRESH_KEY);
	window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
}

export function isAuthenticated(): boolean {
	return getAccessToken() !== null;
}

/** Read the Django CSRF cookie (`csrftoken`). The double-submit pattern echoes
 * this value back in the `X-CSRFToken` header on state-changing requests so the
 * backend can verify the caller controls a same-origin browser context. */
export function readCsrfToken(): string | null {
	if (typeof document === "undefined") return null;
	const cookies = document.cookie ? document.cookie.split(";") : [];
	for (const raw of cookies) {
		const eq = raw.indexOf("=");
		if (eq < 0) continue;
		const name = raw.slice(0, eq).trim();
		if (name === "csrftoken") return decodeURIComponent(raw.slice(eq + 1).trim());
	}
	return null;
}
