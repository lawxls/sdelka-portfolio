const LS_KEY = "auth-token";

export function getToken(): string | null {
	return localStorage.getItem(LS_KEY);
}

export function setToken(token: string): void {
	localStorage.setItem(LS_KEY, token);
}

export function clearToken(): void {
	localStorage.removeItem(LS_KEY);
	window.dispatchEvent(new Event("auth:cleared"));
}

export function hasToken(): boolean {
	return getToken() !== null;
}
