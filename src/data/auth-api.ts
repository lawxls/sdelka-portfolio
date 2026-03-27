import { getAccessToken, getRefreshToken } from "./auth";
import { getTenant } from "./tenant";

const BASE = "/api/v1/auth";

class AuthApiError extends Error {
	status: number;
	body: unknown;

	constructor(status: number, body: unknown) {
		super(`Auth API error ${status}`);
		this.name = "AuthApiError";
		this.status = status;
		this.body = body;
	}
}

function buildHeaders(authenticated = false): Headers {
	const headers = new Headers({ "Content-Type": "application/json" });
	headers.set("X-Tenant", getTenant() ?? "");
	if (authenticated) {
		const token = getAccessToken();
		if (token) headers.set("Authorization", `Bearer ${token}`);
	}
	return headers;
}

async function authRequest<T>(path: string, options: RequestInit & { authenticated?: boolean } = {}): Promise<T> {
	const headers = buildHeaders(options.authenticated);
	const response = await fetch(`${BASE}${path}`, { ...options, headers });

	if (!response.ok) {
		const body = await response.json().catch(() => null);
		throw new AuthApiError(response.status, body);
	}

	if (response.status === 204) return undefined as T;
	return response.json();
}

export interface LoginResponse {
	access: string;
	refresh: string;
	user: { email: string };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
	return authRequest("/login", {
		method: "POST",
		body: JSON.stringify({ email, password }),
	});
}

export async function logout(): Promise<void> {
	const refresh = getRefreshToken();
	return authRequest("/logout", {
		method: "POST",
		body: JSON.stringify({ refresh }),
		authenticated: true,
	});
}

export interface ParsedApiError {
	fieldErrors: Record<string, string>;
	detail: string | null;
}

export function parseApiError(body: unknown): ParsedApiError {
	const result: ParsedApiError = { fieldErrors: {}, detail: null };
	if (!body || typeof body !== "object") return result;

	const record = body as Record<string, unknown>;
	for (const [key, value] of Object.entries(record)) {
		if (key === "detail" && typeof value === "string") {
			result.detail = value;
		} else if (typeof value === "string") {
			result.fieldErrors[key] = value;
		}
	}
	return result;
}
