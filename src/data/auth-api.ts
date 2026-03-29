import { ApiError } from "./api-error";
import { getAccessToken, getRefreshToken } from "./auth";
import { getTenant } from "./tenant";

const BASE = "/api/v1/auth";

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
		throw new ApiError(response.status, body);
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

export interface VerifyInvitationCodeResponse {
	valid: boolean;
}

export async function verifyInvitationCode(code: string): Promise<VerifyInvitationCodeResponse> {
	return authRequest("/verify-invitation-code", {
		method: "POST",
		body: JSON.stringify({ code }),
	});
}

export interface CheckEmailResponse {
	exists: boolean;
}

export async function checkEmail(email: string): Promise<CheckEmailResponse> {
	return authRequest("/check-email", {
		method: "POST",
		body: JSON.stringify({ email }),
	});
}

export interface RegisterData {
	email: string;
	password: string;
	first_name: string;
	phone: string;
	invitation_code: string;
}

export async function register(data: RegisterData): Promise<LoginResponse> {
	return authRequest("/register", {
		method: "POST",
		body: JSON.stringify(data),
	});
}

export interface ConfirmEmailResponse {
	message: string;
}

export async function confirmEmail(token: string): Promise<ConfirmEmailResponse> {
	return authRequest("/confirm-email", {
		method: "POST",
		body: JSON.stringify({ token }),
	});
}

export interface ForgotPasswordResponse {
	detail: string;
}

export interface ResetPasswordResponse {
	detail: string;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
	return authRequest("/forgot-password", {
		method: "POST",
		body: JSON.stringify({ email }),
	});
}

export async function resetPassword(token: string, password: string): Promise<ResetPasswordResponse> {
	return authRequest("/reset-password", {
		method: "POST",
		body: JSON.stringify({ token, password }),
	});
}

export interface RefreshTokenResponse {
	access: string;
}

export async function refreshToken(refresh: string): Promise<RefreshTokenResponse> {
	return authRequest("/token/refresh", {
		method: "POST",
		body: JSON.stringify({ refresh }),
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
		} else if (key === "detail" && Array.isArray(value)) {
			result.detail = value.join(". ");
		} else if (typeof value === "string") {
			result.fieldErrors[key] = value;
		}
	}
	return result;
}

export function extractFormErrors(err: unknown): { error: string | null; fieldErrors: Record<string, string> } {
	const body = err instanceof ApiError ? err.body : undefined;
	const parsed = parseApiError(body);
	const hasFields = Object.keys(parsed.fieldErrors).length > 0;
	return {
		error: parsed.detail ?? (hasFields ? null : "Произошла ошибка. Попробуйте ещё раз."),
		fieldErrors: parsed.fieldErrors,
	};
}
