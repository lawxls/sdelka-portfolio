export const AUTH_CLEARED_EVENT = "auth:cleared";

const ACCESS_KEY = "auth-access-token";
const INVITATION_KEY = "auth-invitation-code";

/** Access token lives in `sessionStorage` — scoped to the tab so closing the
 * window logs the user out, while a refresh cookie set by Django survives
 * across tabs and reloads. */
export function getAccessToken(): string | null {
	return sessionStorage.getItem(ACCESS_KEY);
}

export function setTokens(access: string): void {
	sessionStorage.setItem(ACCESS_KEY, access);
}

export function clearTokens(): void {
	sessionStorage.removeItem(ACCESS_KEY);
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

export function getInvitationCode(): string | null {
	return localStorage.getItem(INVITATION_KEY);
}

export function setInvitationCode(code: string): void {
	localStorage.setItem(INVITATION_KEY, code);
}

export function clearInvitationCode(): void {
	localStorage.removeItem(INVITATION_KEY);
}
