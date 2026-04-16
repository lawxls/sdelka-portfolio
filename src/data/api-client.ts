import { ApiError } from "./api-error";
import { clearTokens, getAccessToken } from "./auth";
import {
	createAddressMock,
	createCompanyMock,
	createEmployeeMock,
	deleteAddressMock,
	deleteCompanyMock,
	deleteEmployeeMock,
	fetchCompaniesMock,
	fetchCompanyMock,
	updateAddressMock,
	updateCompanyMock,
	updateEmployeeMock,
	updateEmployeePermissionsMock,
} from "./companies-mock-data";
import {
	createFolderMock,
	deleteFolderMock,
	fetchFolderStatsMock,
	fetchFoldersMock,
	updateFolderMock,
} from "./folders-mock-data";
import {
	createItemsBatchMock,
	deleteItemMock,
	exportItemsMock,
	fetchItemsMock,
	fetchTotalsMock,
	updateItemMock,
} from "./items-mock-data";
import type { Attachment, Task, TaskStatus } from "./task-types";
import {
	changeTaskStatusMock,
	deleteTaskAttachmentMock,
	fetchTaskBoardMock,
	fetchTaskMock,
	fetchTasksMock,
	uploadTaskAttachmentsMock,
} from "./tasks-mock-data";
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
import type {
	CurrentEmployee,
	InviteEmployeeData,
	WorkspaceEmployee,
	WorkspaceEmployeeDetail,
} from "./workspace-mock-data";
import {
	fetchCompanyInfoMock,
	fetchMeMock,
	fetchWorkspaceEmployeeMock,
	fetchWorkspaceEmployeesMock,
	inviteEmployeesMock,
	updateWorkspaceEmployeePermissionsMock,
} from "./workspace-mock-data";

export type { CurrentEmployee, InviteEmployeeData, WorkspaceEmployee, WorkspaceEmployeeDetail };

const BASE = "/api/v1/company";

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

export async function request<T>(
	path: string,
	options: RequestInit & { skipAuth?: boolean; base?: string } = {},
): Promise<T> {
	const { base = BASE, skipAuth, ...fetchOpts } = options;
	const headers = buildAuthHeaders(fetchOpts.headers, skipAuth);
	const response = await fetch(`${base}${path}`, { ...fetchOpts, headers });

	await ensureOk(response);

	if (response.status === 204) return undefined as T;

	const text = await response.text();
	if (!text) return undefined as T;
	const data = JSON.parse(text);
	return parseDecimals(data);
}

// --- Company ---

export async function fetchCompanyInfo(): Promise<{ name: string }> {
	return fetchCompanyInfoMock();
}

// --- Folders ---

export async function fetchFolders(_params?: { company?: string }): Promise<{ folders: Folder[] }> {
	return fetchFoldersMock();
}

export async function fetchFolderStats(_params?: { company?: string }): Promise<{
	stats: Array<{ folderId: string | null; itemCount: number }>;
	archiveCount: number;
}> {
	return fetchFolderStatsMock();
}

export async function createFolder(data: { name: string; color: string }): Promise<Folder> {
	return createFolderMock(data);
}

export async function updateFolder(id: string, data: { name?: string; color?: string }): Promise<Folder> {
	return updateFolderMock(id, data);
}

export async function deleteFolder(id: string): Promise<void> {
	return deleteFolderMock(id);
}

// --- Items ---

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
	return updateItemMock(id, data);
}

export async function deleteItem(id: string): Promise<void> {
	return deleteItemMock(id);
}

export interface BatchCreateResult {
	items?: ProcurementItem[];
	isAsync: boolean;
	taskId?: string;
}

export async function createItemsBatch(items: NewItemInput[]): Promise<BatchCreateResult> {
	return createItemsBatchMock(items);
}

export interface ExportResult {
	blob: Blob;
	filename: string;
}

export async function exportItems(_params: Omit<FetchItemsParams, "cursor" | "limit">): Promise<ExportResult> {
	return exportItemsMock();
}

export async function fetchItems(params: FetchItemsParams): Promise<{
	items: ProcurementItem[];
	nextCursor: string | null;
}> {
	return fetchItemsMock(params);
}

export interface FetchTotalsParams {
	q?: string;
	status?: string;
	deviation?: string;
	folder?: string;
	company?: string;
}

export async function fetchTotals(params: FetchTotalsParams): Promise<Totals> {
	return fetchTotalsMock(params);
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
	return fetchCompaniesMock(params);
}

export async function fetchCompany(id: string): Promise<Company> {
	return fetchCompanyMock(id);
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
	return updateCompanyMock(id, data);
}

export async function deleteCompany(id: string): Promise<void> {
	return deleteCompanyMock(id);
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
	return createCompanyMock(data);
}

// --- Addresses ---

export interface CreateAddressData {
	name: string;
	type: AddressType;
	postalCode: string;
	address: string;
	contactPerson: string;
	phone: string;
	isMain?: boolean;
}

export interface UpdateAddressData {
	name?: string;
	type?: AddressType;
	postalCode?: string;
	address?: string;
	contactPerson?: string;
	phone?: string;
	isMain?: boolean;
}

export async function createAddress(companyId: string, data: CreateAddressData): Promise<Address> {
	return createAddressMock(companyId, data);
}

export async function updateAddress(companyId: string, addressId: string, data: UpdateAddressData): Promise<Address> {
	return updateAddressMock(companyId, addressId, data);
}

export async function deleteAddress(companyId: string, addressId: string): Promise<void> {
	return deleteAddressMock(companyId, addressId);
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
	return createEmployeeMock(companyId, data);
}

export async function updateEmployee(
	companyId: string,
	employeeId: number,
	data: UpdateEmployeeData,
): Promise<Employee & { permissions: EmployeePermissions }> {
	return updateEmployeeMock(companyId, employeeId, data);
}

export async function deleteEmployee(companyId: string, employeeId: number): Promise<void> {
	return deleteEmployeeMock(companyId, employeeId);
}

export async function updateEmployeePermissions(
	companyId: string,
	employeeId: number,
	data: UpdatePermissionsData,
): Promise<EmployeePermissions> {
	return updateEmployeePermissionsMock(companyId, employeeId, data);
}

// --- Workspace Employees ---

export async function fetchWorkspaceEmployees(): Promise<WorkspaceEmployee[]> {
	return fetchWorkspaceEmployeesMock();
}

export async function fetchWorkspaceEmployee(id: number): Promise<WorkspaceEmployeeDetail> {
	return fetchWorkspaceEmployeeMock(id);
}

export async function inviteEmployees(invites: InviteEmployeeData[]): Promise<void> {
	return inviteEmployeesMock(invites);
}

export async function updateWorkspaceEmployeePermissions(
	id: number,
	data: UpdatePermissionsData,
): Promise<EmployeePermissions> {
	return updateWorkspaceEmployeePermissionsMock(id, data);
}

// --- Me ---

export async function fetchMe(): Promise<CurrentEmployee> {
	return fetchMeMock();
}

// --- Tasks ---

export interface BoardColumn {
	results: Task[];
	next: string | null;
	count: number;
}

export interface TaskBoardResponse {
	// Full board (initial load)
	assigned?: BoardColumn;
	in_progress?: BoardColumn;
	completed?: BoardColumn;
	archived?: BoardColumn;
	// Per-column pagination
	results?: Task[];
	next?: string | null;
}

export interface FetchTaskBoardParams {
	q?: string;
	item?: string;
	company?: string;
	sort?: string;
	dir?: string;
	column?: string;
	cursor?: string;
}

export async function fetchTaskBoard(params: FetchTaskBoardParams = {}): Promise<TaskBoardResponse> {
	return fetchTaskBoardMock(params as Parameters<typeof fetchTaskBoardMock>[0]);
}

export interface FetchTasksParams {
	page?: number;
	page_size?: number;
	q?: string;
	item?: string;
	company?: string;
	sort?: string;
	dir?: string;
}

export interface TaskListResponse {
	count: number;
	results: Task[];
	next: string | null;
	previous: string | null;
}

export async function fetchTasks(params: FetchTasksParams = {}): Promise<TaskListResponse> {
	return fetchTasksMock(params as Parameters<typeof fetchTasksMock>[0]);
}

export async function fetchTask(id: string): Promise<Task> {
	return fetchTaskMock(id);
}

export async function changeTaskStatus(
	id: string,
	data: { status: TaskStatus; completedResponse?: string },
): Promise<Task> {
	return changeTaskStatusMock(id, data);
}

export async function uploadTaskAttachments(id: string, files: File[]): Promise<Attachment[]> {
	return uploadTaskAttachmentsMock(id, files);
}

export async function deleteTaskAttachment(id: string, attachmentId: string): Promise<void> {
	return deleteTaskAttachmentMock(id, attachmentId);
}
