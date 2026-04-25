import { _getCompanySummariesByIds } from "./companies-mock-data";
import { delay, nextId } from "./mock-utils";
import type { CompanySummary, Employee, EmployeePermissions, EmployeeRole, PermissionLevel } from "./types";

// --- Types ---

export interface UserSettings {
	first_name: string;
	last_name: string;
	patronymic?: string | null;
	email: string;
	phone: string;
	avatar_icon: string;
	date_joined: string;
	mailing_allowed: boolean;
}

export type SettingsPatch = Partial<
	Pick<UserSettings, "first_name" | "last_name" | "patronymic" | "phone" | "mailing_allowed">
>;

export interface ChangePasswordResponse {
	detail: string;
}

export interface WorkspaceEmployee extends Employee {
	companies: CompanySummary[];
}

export type WorkspaceEmployeeDetail = WorkspaceEmployee & { permissions: EmployeePermissions };

export interface InviteEmployeeData {
	email: string;
	position: string;
	role: EmployeeRole;
	companies: string[];
}

export interface UpdatePermissionsData {
	procurement?: PermissionLevel;
	tasks?: PermissionLevel;
	companies?: PermissionLevel;
	employees?: PermissionLevel;
	emails?: PermissionLevel;
}

export interface CurrentEmployee {
	id: number;
	role: EmployeeRole;
}

// --- Seed data ---

const SEED_ME: CurrentEmployee = { id: 1, role: "admin" };

const SEED_USER_SETTINGS: UserSettings = {
	first_name: "Иван",
	last_name: "Журавлёв",
	patronymic: "Сергеевич",
	email: "ivan.zhuravlyov.58@mostholding.ru",
	phone: "+79161000001",
	avatar_icon: "blue",
	date_joined: "2024-01-15T10:00:00Z",
	mailing_allowed: true,
};

const SEED_COMPANY_INFO: { name: string } = { name: "ОРМАТЕК" };

const MAIN_COMPANY_SUMMARY: CompanySummary = {
	id: "company-1",
	name: "ОРМАТЕК",
	isMain: true,
	addresses: [
		{
			id: "addr-c1-office",
			name: "Головной офис",
			address: "г. Москва, Ленинградское шоссе, д. 16А, стр. 1",
			isMain: true,
		},
	],
	employeeCount: 4,
	procurementItemCount: 8,
};

// Workspace employees seed — admin + 6 others, spanning roles and registration states.
// IDs 1–4 overlap with the main tenant's company-1 employees so data stays coherent.
const SEED_WORKSPACE_EMPLOYEES: WorkspaceEmployeeDetail[] = [
	{
		id: 1,
		firstName: "Иван",
		lastName: "Журавлёв",
		patronymic: "Сергеевич",
		position: "Директор по закупкам",
		role: "admin",
		phone: "+79161000001",
		email: "ivan.zhuravlyov.58@mostholding.ru",
		registeredAt: "2024-01-15T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-1",
			employeeId: 1,
			procurement: "edit",
			tasks: "edit",
			companies: "edit",
			employees: "edit",
			emails: "edit",
		},
	},
	{
		id: 2,
		firstName: "Ольга",
		lastName: "Соколова",
		patronymic: "Андреевна",
		position: "Руководитель отдела закупок",
		role: "admin",
		phone: "+79161000002",
		email: "o.sokolova@ormatek.com",
		registeredAt: "2024-02-01T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-2",
			employeeId: 2,
			procurement: "edit",
			tasks: "edit",
			companies: "edit",
			employees: "edit",
			emails: "edit",
		},
	},
	{
		id: 3,
		firstName: "Дмитрий",
		lastName: "Орлов",
		patronymic: "Михайлович",
		position: "Менеджер по закупкам",
		role: "user",
		phone: "+79161000003",
		email: "d.orlov@ormatek.com",
		registeredAt: "2024-03-12T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-3",
			employeeId: 3,
			procurement: "edit",
			tasks: "edit",
			companies: "view",
			employees: "view",
			emails: "view",
		},
	},
	{
		id: 4,
		firstName: "Екатерина",
		lastName: "Белова",
		patronymic: "Игоревна",
		position: "Аналитик отдела закупок",
		role: "user",
		phone: "+79161000004",
		email: "e.belova@ormatek.com",
		registeredAt: "2024-05-20T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-4",
			employeeId: 4,
			procurement: "view",
			tasks: "view",
			companies: "view",
			employees: "none",
			emails: "none",
		},
	},
	{
		id: 5,
		firstName: "Николай",
		lastName: "Фёдоров",
		patronymic: "Олегович",
		position: "Категорийный менеджер",
		role: "user",
		phone: "+79161000005",
		email: "n.fedorov@ormatek.com",
		registeredAt: "2024-08-03T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-5",
			employeeId: 5,
			procurement: "edit",
			tasks: "edit",
			companies: "view",
			employees: "none",
			emails: "view",
		},
	},
	{
		id: 6,
		firstName: "Анна",
		lastName: "Смирнова",
		patronymic: "Николаевна",
		position: "Финансовый аналитик",
		role: "user",
		phone: "+79161000006",
		email: "a.smirnova@ormatek.com",
		registeredAt: "2025-01-10T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-6",
			employeeId: 6,
			procurement: "view",
			tasks: "view",
			companies: "none",
			employees: "none",
			emails: "none",
		},
	},
	{
		id: 7,
		firstName: "Дмитрий",
		lastName: "Попов",
		patronymic: "",
		position: "Менеджер по закупкам",
		role: "user",
		phone: "",
		email: "d.popov@ormatek.com",
		registeredAt: null,
		companies: [],
		permissions: {
			id: "perm-w-7",
			employeeId: 7,
			procurement: "none",
			tasks: "none",
			companies: "none",
			employees: "none",
			emails: "none",
		},
	},
];

// --- Mutable stores ---

let meStore: CurrentEmployee = { ...SEED_ME };
let userSettingsStore: UserSettings = { ...SEED_USER_SETTINGS };
let companyInfoStore: { name: string } = { ...SEED_COMPANY_INFO };
let workspaceEmployeesStore: WorkspaceEmployeeDetail[] = [];

function cloneEmployee(e: WorkspaceEmployeeDetail): WorkspaceEmployeeDetail {
	return {
		...e,
		companies: e.companies.map((c) => ({ ...c, addresses: c.addresses.map((a) => ({ ...a })) })),
		permissions: { ...e.permissions },
	};
}

function seedStore() {
	meStore = { ...SEED_ME };
	userSettingsStore = { ...SEED_USER_SETTINGS };
	companyInfoStore = { ...SEED_COMPANY_INFO };
	workspaceEmployeesStore = SEED_WORKSPACE_EMPLOYEES.map(cloneEmployee);
}

seedStore();

export function _resetWorkspaceStore(): void {
	seedStore();
}

export function _setWorkspaceEmployees(employees: WorkspaceEmployeeDetail[]): void {
	workspaceEmployeesStore = employees.map(cloneEmployee);
}

export function _setUserSettings(settings: UserSettings): void {
	userSettingsStore = { ...settings };
}

export function _setCompanyInfo(info: { name: string }): void {
	companyInfoStore = { ...info };
}

export function _setMe(me: CurrentEmployee): void {
	meStore = { ...me };
}

// --- Mock API: me ---

export async function fetchMeMock(): Promise<CurrentEmployee> {
	await delay();
	return { ...meStore };
}

// --- Mock API: company info ---

export async function fetchCompanyInfoMock(): Promise<{ name: string }> {
	await delay();
	return { ...companyInfoStore };
}

// --- Mock API: user settings (profile) ---

export async function fetchSettingsMock(): Promise<UserSettings> {
	await delay();
	return { ...userSettingsStore };
}

export async function patchSettingsMock(data: SettingsPatch): Promise<UserSettings> {
	await delay();
	userSettingsStore = { ...userSettingsStore, ...data };
	return { ...userSettingsStore };
}

export async function changePasswordMock(
	_currentPassword: string,
	_newPassword: string,
): Promise<ChangePasswordResponse> {
	await delay();
	return { detail: "Пароль успешно изменён" };
}

// --- Mock API: workspace employees ---

export async function fetchWorkspaceEmployeesMock(): Promise<WorkspaceEmployee[]> {
	await delay();
	return workspaceEmployeesStore.map(({ permissions: _permissions, ...rest }) => ({
		...rest,
		companies: rest.companies.map((c) => ({ ...c, addresses: c.addresses.map((a) => ({ ...a })) })),
	}));
}

export async function fetchWorkspaceEmployeeMock(id: number): Promise<WorkspaceEmployeeDetail> {
	await delay();
	const found = workspaceEmployeesStore.find((e) => e.id === id);
	if (!found) throw new Error(`Workspace employee ${id} not found`);
	return cloneEmployee(found);
}

let workspaceEmployeeIdCounter = 1000;
function nextWorkspaceEmployeeId(): number {
	workspaceEmployeeIdCounter += 1;
	return workspaceEmployeeIdCounter;
}

export async function inviteEmployeesMock(invites: InviteEmployeeData[]): Promise<void> {
	await delay();
	for (const invite of invites) {
		const id = nextWorkspaceEmployeeId();
		workspaceEmployeesStore.push({
			id,
			firstName: "",
			lastName: "",
			patronymic: "",
			position: invite.position,
			role: invite.role,
			phone: "",
			email: invite.email,
			registeredAt: null,
			companies: _getCompanySummariesByIds(invite.companies),
			permissions: {
				id: nextId("perm-w"),
				employeeId: id,
				procurement: "none",
				tasks: "none",
				companies: "none",
				employees: "none",
				emails: "none",
			},
		});
	}
}

export async function deleteWorkspaceEmployeesMock(ids: number[]): Promise<void> {
	await delay();
	const toRemove = new Set(ids);
	workspaceEmployeesStore = workspaceEmployeesStore.filter((e) => {
		if (!toRemove.has(e.id)) return true;
		return e.role !== "user";
	});
}

export async function updateWorkspaceEmployeePermissionsMock(
	id: number,
	data: UpdatePermissionsData,
): Promise<EmployeePermissions> {
	await delay();
	const idx = workspaceEmployeesStore.findIndex((e) => e.id === id);
	if (idx === -1) throw new Error(`Workspace employee ${id} not found`);
	const updated = { ...workspaceEmployeesStore[idx].permissions, ...data };
	workspaceEmployeesStore[idx] = { ...workspaceEmployeesStore[idx], permissions: updated };
	return { ...updated };
}
