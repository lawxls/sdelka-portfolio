const LS_KEY = "auth-timestamp";
const TTL_MS = 24 * 60 * 60 * 1000;
const ACCESS_CODE = "Sd3lk";

export function isAuthenticated(): boolean {
	const stored = localStorage.getItem(LS_KEY);
	if (!stored) return false;
	const timestamp = Number(stored);
	return Date.now() - timestamp < TTL_MS;
}

export function setAuthenticated(): void {
	localStorage.setItem(LS_KEY, String(Date.now()));
}

export function clearAuth(): void {
	localStorage.removeItem(LS_KEY);
}

export function validateCode(code: string): boolean {
	return code === ACCESS_CODE;
}
