const ACCESS_KEY = "auth-access-token";
const REFRESH_KEY = "auth-refresh-token";
const INVITATION_KEY = "auth-invitation-code";

export function getAccessToken(): string | null {
	return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
	return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
	localStorage.setItem(ACCESS_KEY, access);
	localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
	localStorage.removeItem(ACCESS_KEY);
	localStorage.removeItem(REFRESH_KEY);
	window.dispatchEvent(new Event("auth:cleared"));
}

export function isAuthenticated(): boolean {
	return getAccessToken() !== null;
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
