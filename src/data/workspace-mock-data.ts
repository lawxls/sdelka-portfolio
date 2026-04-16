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
	analytics?: PermissionLevel;
	procurement?: PermissionLevel;
	companies?: PermissionLevel;
	tasks?: PermissionLevel;
}

export interface CurrentEmployee {
	id: number;
	role: EmployeeRole;
}

// --- Seed data ---

const SEED_ME: CurrentEmployee = { id: 1, role: "owner" };

const SEED_USER_SETTINGS: UserSettings = {
	first_name: "Алексей",
	last_name: "Морозов",
	patronymic: "Викторович",
	email: "morozov@sdelka.example",
	phone: "+79161234500",
	avatar_icon: "blue",
	date_joined: "2024-01-15T10:00:00Z",
	mailing_allowed: true,
};

const SEED_COMPANY_INFO: { name: string } = { name: "Сделка" };

const MAIN_COMPANY_SUMMARY: CompanySummary = {
	id: "company-1",
	name: "Сделка",
	isMain: true,
	responsibleEmployeeName: "Морозов Алексей",
	addresses: [
		{
			id: "addr-c1-office",
			name: "Главный офис",
			type: "office",
			address: "г. Москва, ул. Тверская, д. 12, стр. 1",
			isMain: true,
		},
	],
	employeeCount: 4,
	procurementItemCount: 17,
};

// Workspace employees seed — owner + 6 others, spanning roles and registration states.
// IDs 1–4 overlap with the main tenant's company-1 employees so data stays coherent.
const SEED_WORKSPACE_EMPLOYEES: WorkspaceEmployeeDetail[] = [
	{
		id: 1,
		firstName: "Алексей",
		lastName: "Морозов",
		patronymic: "Викторович",
		position: "Генеральный директор",
		role: "owner",
		phone: "+79161234500",
		email: "morozov@sdelka.example",
		isResponsible: true,
		registeredAt: "2024-01-15T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-1",
			employeeId: 1,
			analytics: "edit",
			procurement: "edit",
			companies: "edit",
			tasks: "edit",
		},
	},
	{
		id: 2,
		firstName: "Мария",
		lastName: "Иванова",
		patronymic: "Сергеевна",
		position: "Директор по закупкам",
		role: "admin",
		phone: "+79161234501",
		email: "ivanova@sdelka.example",
		isResponsible: false,
		registeredAt: "2024-02-01T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-2",
			employeeId: 2,
			analytics: "edit",
			procurement: "edit",
			companies: "edit",
			tasks: "edit",
		},
	},
	{
		id: 3,
		firstName: "Павел",
		lastName: "Сергеев",
		patronymic: "Андреевич",
		position: "Старший менеджер по закупкам",
		role: "user",
		phone: "+79161234502",
		email: "sergeev@sdelka.example",
		isResponsible: false,
		registeredAt: "2024-03-12T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-3",
			employeeId: 3,
			analytics: "view",
			procurement: "edit",
			companies: "view",
			tasks: "edit",
		},
	},
	{
		id: 4,
		firstName: "Анна",
		lastName: "Кузнецова",
		patronymic: "Дмитриевна",
		position: "Аналитик",
		role: "user",
		phone: "+79161234503",
		email: "kuznetsova@sdelka.example",
		isResponsible: false,
		registeredAt: "2024-05-20T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-4",
			employeeId: 4,
			analytics: "edit",
			procurement: "view",
			companies: "view",
			tasks: "view",
		},
	},
	{
		id: 5,
		firstName: "Николай",
		lastName: "Фёдоров",
		patronymic: "Олегович",
		position: "Категорийный менеджер",
		role: "user",
		phone: "+79161234504",
		email: "fedorov@sdelka.example",
		isResponsible: false,
		registeredAt: "2024-08-03T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-5",
			employeeId: 5,
			analytics: "view",
			procurement: "edit",
			companies: "view",
			tasks: "edit",
		},
	},
	{
		id: 6,
		firstName: "Екатерина",
		lastName: "Смирнова",
		patronymic: "Николаевна",
		position: "Финансовый аналитик",
		role: "user",
		phone: "+79161234505",
		email: "smirnova@sdelka.example",
		isResponsible: false,
		registeredAt: "2025-01-10T10:00:00Z",
		companies: [MAIN_COMPANY_SUMMARY],
		permissions: {
			id: "perm-w-6",
			employeeId: 6,
			analytics: "edit",
			procurement: "view",
			companies: "none",
			tasks: "view",
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
		email: "popov@sdelka.example",
		isResponsible: false,
		registeredAt: null,
		companies: [],
		permissions: {
			id: "perm-w-7",
			employeeId: 7,
			analytics: "none",
			procurement: "none",
			companies: "none",
			tasks: "none",
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
	return workspaceEmployeesStore.map((e) => {
		const { permissions: _permissions, ...rest } = cloneEmployee(e);
		return rest;
	});
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
			isResponsible: false,
			registeredAt: null,
			companies: [],
			permissions: {
				id: nextId("perm-w"),
				employeeId: id,
				analytics: "none",
				procurement: "none",
				companies: "none",
				tasks: "none",
			},
		});
	}
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
