import { ApiError } from "./api-error";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";
import { refreshToken } from "./auth-api";
import { getTenant } from "./tenant";
import type {
	Address,
	AddressType,
	Company,
	CompanySummary,
	Employee,
	EmployeePermissions,
	EmployeeRole,
	Folder,
	NewItemInput,
	PermissionLevel,
	ProcurementItem,
	Totals,
} from "./types";

const BASE = "/api/v1/company";
const COMPANIES_BASE = "/api/v1/companies";

const DECIMAL_FIELDS = new Set([
	"currentPrice",
	"bestPrice",
	"averagePrice",
	"totalOverpayment",
	"totalSavings",
	"totalDeviation",
]);

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

function buildAuthHeaders(existing?: HeadersInit, skipAuth?: boolean): Headers {
	const headers = new Headers(existing);
	headers.set("X-Tenant", getTenant() ?? "");
	if (!skipAuth) {
		const token = getAccessToken();
		if (token) headers.set("Authorization", `Bearer ${token}`);
	}
	return headers;
}

async function ensureOk(response: Response): Promise<void> {
	if (response.status === 401) {
		clearTokens();
		throw new ApiError(401, await response.json().catch(() => null));
	}
	if (!response.ok) {
		throw new ApiError(response.status, await response.json().catch(() => null));
	}
}

let refreshPromise: Promise<void> | null = null;

function attemptRefresh(): Promise<void> {
	if (refreshPromise) return refreshPromise;

	const refresh = getRefreshToken();
	if (!refresh) return Promise.reject(new Error("No refresh token"));

	refreshPromise = refreshToken(refresh)
		.then(({ access }) => {
			if (getRefreshToken() === refresh) {
				setTokens(access, refresh);
			}
		})
		.finally(() => {
			refreshPromise = null;
		});

	return refreshPromise;
}

export async function request<T>(
	path: string,
	options: RequestInit & { skipAuth?: boolean; base?: string } = {},
): Promise<T> {
	const { base = BASE, skipAuth, ...fetchOpts } = options;
	const headers = buildAuthHeaders(fetchOpts.headers, skipAuth);
	let response = await fetch(`${base}${path}`, { ...fetchOpts, headers });

	if (response.status === 401 && !skipAuth && getRefreshToken()) {
		try {
			await attemptRefresh();
			const retryHeaders = buildAuthHeaders(fetchOpts.headers, skipAuth);
			response = await fetch(`${base}${path}`, { ...fetchOpts, headers: retryHeaders });
		} catch {
			// Refresh failed — fall through to ensureOk with original 401 response
		}
	}

	await ensureOk(response);

	if (response.status === 204) return undefined as T;

	const data = await response.json();
	return parseDecimals(data);
}

// --- Company ---

export async function fetchCompanyInfo(): Promise<{ name: string }> {
	return request("/info/");
}

// --- Folders ---

export async function fetchFolders(params?: { company?: string }): Promise<{ folders: Folder[] }> {
	return request(`/folders/${buildQuery((params ?? {}) as Record<string, string | number | undefined>)}`);
}

export async function fetchFolderStats(params?: { company?: string }): Promise<{
	stats: Array<{ folderId: string | null; itemCount: number }>;
	archiveCount: number;
}> {
	return request(`/folders/stats${buildQuery((params ?? {}) as Record<string, string | number | undefined>)}`);
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
	company?: string;
	sort?: string;
	dir?: string;
	cursor?: string;
	limit?: number;
}

export async function updateItem(
	id: string,
	data: { name?: string; folderId?: string | null; isArchived?: boolean },
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

export interface ExportResult {
	blob: Blob;
	filename: string;
}

export async function exportItems(params: Omit<FetchItemsParams, "cursor" | "limit">): Promise<ExportResult> {
	const url = `${BASE}/items/export${buildQuery(params as Record<string, string | number | undefined>)}`;
	const headers = buildAuthHeaders();
	let response = await fetch(url, { headers });

	if (response.status === 401 && getRefreshToken()) {
		try {
			await attemptRefresh();
			const retryHeaders = buildAuthHeaders();
			response = await fetch(url, { headers: retryHeaders });
		} catch {
			// Refresh failed — fall through to ensureOk
		}
	}

	await ensureOk(response);

	const disposition = response.headers.get("Content-Disposition") ?? "";
	const filenameMatch = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)"?/i);
	const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "items.xlsx";

	return { blob: await response.blob(), filename };
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
	company?: string;
}

export async function fetchTotals(params: FetchTotalsParams): Promise<Totals> {
	return request(`/items/totals${buildQuery(params as Record<string, string | number | undefined>)}`);
}

// --- Companies ---

export interface FetchCompaniesParams {
	q?: string;
	sort?: string;
	dir?: string;
	cursor?: string;
	limit?: number;
}

export async function fetchCompanies(params: FetchCompaniesParams): Promise<{
	companies: CompanySummary[];
	nextCursor: string | null;
}> {
	return request(`/${buildQuery(params as Record<string, string | number | undefined>)}`, {
		base: COMPANIES_BASE,
	});
}

export async function fetchCompany(id: string): Promise<Company> {
	return request(`/${id}/`, { base: COMPANIES_BASE });
}

export interface UpdateCompanyData {
	name?: string;
	industry?: string;
	website?: string;
	description?: string;
	preferredPayment?: string;
	preferredDelivery?: string;
	additionalComments?: string;
}

export async function updateCompany(id: string, data: UpdateCompanyData): Promise<Company> {
	return request(`/${id}/`, {
		base: COMPANIES_BASE,
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

export async function deleteCompany(id: string): Promise<void> {
	return request(`/${id}/`, {
		base: COMPANIES_BASE,
		method: "DELETE",
	});
}

export interface CreateCompanyPayload {
	name: string;
	industry?: string;
	website?: string;
	description?: string;
	preferredPayment?: string;
	preferredDelivery?: string;
	additionalComments?: string;
	address: CreateAddressData;
}

export async function createCompany(data: CreateCompanyPayload): Promise<Company> {
	return request("/", {
		base: COMPANIES_BASE,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

// --- Addresses ---

export interface CreateAddressData {
	name: string;
	type: AddressType;
	postalCode: string;
	address: string;
	contactPerson: string;
	phone: string;
}

export interface UpdateAddressData {
	name?: string;
	type?: AddressType;
	postalCode?: string;
	address?: string;
	contactPerson?: string;
	phone?: string;
}

export async function createAddress(companyId: string, data: CreateAddressData): Promise<Address> {
	return request(`/${companyId}/addresses`, {
		base: COMPANIES_BASE,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

export async function updateAddress(companyId: string, addressId: string, data: UpdateAddressData): Promise<Address> {
	return request(`/${companyId}/addresses/${addressId}`, {
		base: COMPANIES_BASE,
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

export async function deleteAddress(companyId: string, addressId: string): Promise<void> {
	return request(`/${companyId}/addresses/${addressId}`, {
		base: COMPANIES_BASE,
		method: "DELETE",
	});
}

// --- Employees ---

export interface CreateEmployeeData {
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: EmployeeRole;
	phone: string;
	email: string;
	isResponsible: boolean;
}

export interface UpdateEmployeeData {
	firstName?: string;
	lastName?: string;
	patronymic?: string;
	position?: string;
	role?: EmployeeRole;
	phone?: string;
	email?: string;
	isResponsible?: boolean;
}

export interface UpdatePermissionsData {
	analytics?: PermissionLevel;
	procurement?: PermissionLevel;
	companies?: PermissionLevel;
	tasks?: PermissionLevel;
}

export async function createEmployee(
	companyId: string,
	data: CreateEmployeeData,
): Promise<Employee & { permissions: EmployeePermissions }> {
	return request(`/${companyId}/employees`, {
		base: COMPANIES_BASE,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

export async function updateEmployee(
	companyId: string,
	employeeId: string,
	data: UpdateEmployeeData,
): Promise<Employee & { permissions: EmployeePermissions }> {
	return request(`/${companyId}/employees/${employeeId}`, {
		base: COMPANIES_BASE,
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}

export async function deleteEmployee(companyId: string, employeeId: string): Promise<void> {
	return request(`/${companyId}/employees/${employeeId}`, {
		base: COMPANIES_BASE,
		method: "DELETE",
	});
}

export async function updateEmployeePermissions(
	companyId: string,
	employeeId: string,
	data: UpdatePermissionsData,
): Promise<EmployeePermissions> {
	return request(`/${companyId}/employees/${employeeId}/permissions`, {
		base: COMPANIES_BASE,
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}
