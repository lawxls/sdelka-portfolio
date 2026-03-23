import { clearToken, getToken } from "./auth";
import { getTenant } from "./tenant";
import type { Folder, ProcurementItem, Totals } from "./types";
import type { NewItemInput } from "./use-custom-items";

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

// --- Folders ---

export async function fetchFolders(): Promise<{ folders: Folder[] }> {
	return request("/folders/");
}

export async function fetchFolderStats(): Promise<{
	stats: Array<{ folderId: string | null; itemCount: number }>;
}> {
	return request("/folders/stats");
}

export async function createFolder(data: { name: string; color: string }): Promise<Folder> {
	return request("/folders/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

export async function updateFolder(id: string, data: { name?: string; color?: string }): Promise<Folder> {
	return request(`/folders/${id}/`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

export async function deleteFolder(id: string): Promise<void> {
	return request(`/folders/${id}/`, { method: "DELETE" });
}

// --- Items ---

function buildQuery(params: { [key: string]: string | number | undefined }): string {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value != null && value !== "") sp.set(key, String(value));
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}

export interface FetchItemsParams {
	q?: string;
	status?: string;
	deviation?: string;
	folder?: string;
	sort?: string;
	dir?: string;
	cursor?: string;
	limit?: number;
}

export async function updateItem(
	id: string,
	data: { name?: string; folderId?: string | null },
): Promise<ProcurementItem> {
	return request(`/items/${id}/`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

export async function deleteItem(id: string): Promise<void> {
	return request(`/items/${id}/`, { method: "DELETE" });
}

export interface BatchCreateResult {
	items?: ProcurementItem[];
	isAsync: boolean;
	taskId?: string;
}

export async function createItemsBatch(items: NewItemInput[]): Promise<BatchCreateResult> {
	return request("/items/batch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ items }),
	});
}

export async function fetchItems(params: FetchItemsParams): Promise<{
	items: ProcurementItem[];
	nextCursor: string | null;
}> {
	return request(`/items/${buildQuery(params as Record<string, string | number | undefined>)}`);
}

export interface FetchTotalsParams {
	q?: string;
	status?: string;
	deviation?: string;
	folder?: string;
}

export async function fetchTotals(params: FetchTotalsParams): Promise<Totals> {
	return request(`/items/totals${buildQuery(params as Record<string, string | number | undefined>)}`);
}
