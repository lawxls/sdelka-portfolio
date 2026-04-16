export const AUTH_CLEARED_EVENT = "auth:cleared";

const ACCESS_KEY = "auth-access-token";
const INVITATION_KEY = "auth-invitation-code";

export function getAccessToken(): string | null {
	return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(access: string): void {
	localStorage.setItem(ACCESS_KEY, access);
}

export function clearTokens(): void {
	localStorage.removeItem(ACCESS_KEY);
	window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
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
