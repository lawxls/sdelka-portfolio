import { clearToken, getToken } from "./auth";
import { getTenant } from "./tenant";

const BASE = "/api/v1/company";

const DECIMAL_FIELDS = new Set([
	"currentPrice",
	"bestPrice",
	"averagePrice",
	"totalOverpayment",
	"totalSavings",
	"totalDeviation",
]);

/** Recursively parse string decimal fields to numbers at the API boundary. */
export function parseDecimals<T>(obj: T): T {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(parseDecimals) as T;
	if (typeof obj === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			if (DECIMAL_FIELDS.has(key) && typeof value === "string") {
				result[key] = Number(value);
			} else if (Array.isArray(value)) {
				result[key] = value.map(parseDecimals);
			} else {
				result[key] = value;
			}
		}
		return result as T;
	}
	return obj;
}

class ApiError extends Error {
	status: number;
	body: unknown;

	constructor(status: number, body: unknown) {
		super(`API error ${status}`);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}
}

async function request<T>(path: string, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
	const tenant = getTenant();
	const headers = new Headers(options.headers);
	headers.set("X-Tenant", tenant ?? "");

	if (!options.skipAuth) {
		const token = getToken();
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}
	}

	const response = await fetch(`${BASE}${path}`, { ...options, headers });

	if (response.status === 401) {
		clearToken();
		throw new ApiError(401, await response.json().catch(() => null));
	}

	if (!response.ok) {
		throw new ApiError(response.status, await response.json().catch(() => null));
	}

	if (response.status === 204) return undefined as T;

	const data = await response.json();
	return parseDecimals(data);
}

// --- Auth ---

export async function validateCode(code: string): Promise<{ token: string }> {
	return request("/validate-code", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ code }),
		skipAuth: true,
	});
}

// --- Company ---

export async function fetchCompanyInfo(): Promise<{ name: string }> {
	return request("/info/");
}
