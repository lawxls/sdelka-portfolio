import { delay, nextId, paginate } from "./mock-utils";
import type {
	Address,
	AddressSummary,
	Company,
	CompanySummary,
	Employee,
	EmployeePermissions,
	PermissionLevel,
} from "./types";

// --- Seed data ---

const SEED_COMPANIES: Company[] = [
	{
		id: "company-1",
		name: "ОРМАТЕК",
		industry: "Производство матрасов и мебели для сна",
		website: "https://ormatek.com",
		description:
			"Крупнейший российский производитель матрасов, кроватей и мебели для сна. Собственное производство, федеральная сеть салонов.",
		preferredPayment: "Безналичный расчёт, отсрочка 30 дней",
		preferredDelivery: "Доставка до производства в Аксайском районе Ростовской обл.",
		additionalComments: "Приоритет — первичка (без вторсырья), сертификаты соответствия.",
		isMain: true,
		employeeCount: 4,
		procurementItemCount: 8,
		addresses: [
			{
				id: "addr-c1-office",
				name: "Головной офис",
				type: "office",
				postalCode: "125171",
				address: "г. Москва, Ленинградское шоссе, д. 16А, стр. 1",
				contactPerson: "Журавлёв Иван",
				phone: "+74957960707",
				isMain: true,
			},
			{
				id: "addr-c1-prod",
				name: "Производство",
				type: "production",
				postalCode: "346720",
				address: "Ростовская обл., Аксайский р-н, Грушевское с/п, Южная промзона",
				contactPerson: "Королёв Сергей",
				phone: "+78633200101",
				isMain: false,
			},
		],
		employees: [
			{
				id: 1,
				firstName: "Иван",
				lastName: "Журавлёв",
				patronymic: "Сергеевич",
				position: "Директор по закупкам",
				role: "owner",
				phone: "+79161000001",
				email: "ivan.zhuravlyov.58@mostholding.ru",
				isResponsible: true,
				registeredAt: "2024-01-15T10:00:00Z",
				permissions: {
					id: "perm-c1-1",
					employeeId: 1,
					analytics: "edit",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
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
				isResponsible: false,
				registeredAt: "2024-02-01T10:00:00Z",
				permissions: {
					id: "perm-c1-2",
					employeeId: 2,
					analytics: "edit",
					procurement: "edit",
					companies: "edit",
					tasks: "edit",
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
				isResponsible: false,
				registeredAt: "2024-03-12T10:00:00Z",
				permissions: {
					id: "perm-c1-3",
					employeeId: 3,
					analytics: "view",
					procurement: "edit",
					companies: "view",
					tasks: "edit",
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
				isResponsible: false,
				registeredAt: "2024-05-20T10:00:00Z",
				permissions: {
					id: "perm-c1-4",
					employeeId: 4,
					analytics: "edit",
					procurement: "view",
					companies: "view",
					tasks: "view",
				},
			},
		],
	},
];

// --- Mutable store ---

let companiesStore: Company[] = [];

function cloneCompany(c: Company): Company {
	return {
		...c,
		addresses: c.addresses.map((a) => ({ ...a })),
		employees: c.employees.map((e) => ({ ...e, permissions: { ...e.permissions } })),
	};
}

function seedStore() {
	companiesStore = SEED_COMPANIES.map(cloneCompany);
}

seedStore();

export function _resetCompaniesStore(): void {
	seedStore();
}

export function _setCompanies(companies: Company[]): void {
	companiesStore = companies.map(cloneCompany);
}

export function _getCompanies(): Company[] {
	return companiesStore.map(cloneCompany);
}

export function _getCompanySummariesByIds(ids: string[]): CompanySummary[] {
	const set = new Set(ids);
	return companiesStore.filter((c) => set.has(c.id)).map(toSummary);
}

// --- Internal helpers ---

function findCompanyIndex(id: string): number {
	return companiesStore.findIndex((c) => c.id === id);
}

function requireCompany(id: string): Company {
	const idx = findCompanyIndex(id);
	if (idx === -1) throw new Error(`Company ${id} not found`);
	return companiesStore[idx];
}

function toAddressSummary(a: Address): AddressSummary {
	return { id: a.id, name: a.name, type: a.type, address: a.address, isMain: a.isMain };
}

function responsibleEmployeeName(employees: Company["employees"]): string | null {
	const responsible = employees.find((e) => e.isResponsible);
	if (!responsible) return null;
	return `${responsible.lastName} ${responsible.firstName}`.trim();
}

function toSummary(c: Company): CompanySummary {
	return {
		id: c.id,
		name: c.name,
		isMain: c.isMain,
		responsibleEmployeeName: responsibleEmployeeName(c.employees),
		addresses: c.addresses.map(toAddressSummary),
		employeeCount: c.employees.length || c.employeeCount,
		procurementItemCount: c.procurementItemCount,
	};
}

type CompanySortFieldKey = "name" | "employeeCount" | "procurementItemCount";

function sortCompanies(items: Company[], field: CompanySortFieldKey, dir: "asc" | "desc"): Company[] {
	const mul = dir === "asc" ? 1 : -1;
	return [...items].sort((a, b) => {
		if (field === "name") return mul * a.name.localeCompare(b.name, "ru");
		if (field === "employeeCount")
			return mul * ((a.employees.length || a.employeeCount) - (b.employees.length || b.employeeCount));
		return mul * (a.procurementItemCount - b.procurementItemCount);
	});
}

// --- Mock API: companies list/detail ---

export interface FetchCompaniesParams {
	q?: string;
	sort?: string;
	dir?: string;
	cursor?: string;
	limit?: number;
}

export async function fetchAllCompaniesMock(): Promise<CompanySummary[]> {
	await delay();
	return companiesStore.map(toSummary);
}

export async function fetchCompaniesMock(params: FetchCompaniesParams): Promise<{
	companies: CompanySummary[];
	nextCursor: string | null;
}> {
	await delay();
	const q = params.q?.trim().toLowerCase();
	let filtered = companiesStore;
	if (q) filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
	if (params.sort) {
		filtered = sortCompanies(filtered, params.sort as CompanySortFieldKey, (params.dir ?? "asc") as "asc" | "desc");
	}
	const result = paginate({
		items: filtered,
		cursor: params.cursor,
		limit: params.limit,
		getId: (c) => c.id,
	});
	return { companies: result.items.map(toSummary), nextCursor: result.nextCursor };
}

export async function fetchCompanyMock(id: string): Promise<Company> {
	await delay();
	return cloneCompany(requireCompany(id));
}

// --- Mock API: company mutations ---

export interface UpdateCompanyData {
	name?: string;
	industry?: string;
	website?: string;
	description?: string;
	preferredPayment?: string;
	preferredDelivery?: string;
	additionalComments?: string;
}

export async function updateCompanyMock(id: string, data: UpdateCompanyData): Promise<Company> {
	await delay();
	const idx = findCompanyIndex(id);
	if (idx === -1) throw new Error(`Company ${id} not found`);
	companiesStore[idx] = { ...companiesStore[idx], ...data };
	return cloneCompany(companiesStore[idx]);
}

export async function deleteCompanyMock(id: string): Promise<void> {
	await delay();
	companiesStore = companiesStore.filter((c) => c.id !== id);
}

export interface CreateAddressData {
	name: string;
	type: Address["type"];
	postalCode: string;
	address: string;
	contactPerson: string;
	phone: string;
	isMain?: boolean;
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

export async function createCompanyMock(data: CreateCompanyPayload): Promise<Company> {
	await delay();
	const newCompany: Company = {
		id: nextId("company"),
		name: data.name,
		industry: data.industry ?? "",
		website: data.website ?? "",
		description: data.description ?? "",
		preferredPayment: data.preferredPayment ?? "",
		preferredDelivery: data.preferredDelivery ?? "",
		additionalComments: data.additionalComments ?? "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses: [
			{
				id: nextId("addr"),
				name: data.address.name,
				type: data.address.type,
				postalCode: data.address.postalCode,
				address: data.address.address,
				contactPerson: data.address.contactPerson,
				phone: data.address.phone,
				isMain: data.address.isMain ?? true,
			},
		],
		employees: [],
	};
	companiesStore.push(newCompany);
	return cloneCompany(newCompany);
}

// --- Mock API: addresses ---

export interface UpdateAddressData {
	name?: string;
	type?: Address["type"];
	postalCode?: string;
	address?: string;
	contactPerson?: string;
	phone?: string;
	isMain?: boolean;
}

export async function createAddressMock(companyId: string, data: CreateAddressData): Promise<Address> {
	await delay();
	const company = requireCompany(companyId);
	const newAddress: Address = {
		id: nextId("addr"),
		name: data.name,
		type: data.type,
		postalCode: data.postalCode,
		address: data.address,
		contactPerson: data.contactPerson,
		phone: data.phone,
		isMain: data.isMain ?? false,
	};
	company.addresses.push(newAddress);
	return { ...newAddress };
}

export async function updateAddressMock(
	companyId: string,
	addressId: string,
	data: UpdateAddressData,
): Promise<Address> {
	await delay();
	const company = requireCompany(companyId);
	const idx = company.addresses.findIndex((a) => a.id === addressId);
	if (idx === -1) throw new Error(`Address ${addressId} not found in company ${companyId}`);
	company.addresses[idx] = { ...company.addresses[idx], ...data };
	return { ...company.addresses[idx] };
}

export async function deleteAddressMock(companyId: string, addressId: string): Promise<void> {
	await delay();
	const company = requireCompany(companyId);
	company.addresses = company.addresses.filter((a) => a.id !== addressId);
}

// --- Mock API: employees ---

export interface CreateEmployeeData {
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: Employee["role"];
	phone: string;
	email: string;
	isResponsible: boolean;
}

export interface UpdateEmployeeData {
	firstName?: string;
	lastName?: string;
	patronymic?: string;
	position?: string;
	role?: Employee["role"];
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

let employeeIdCounter = 1000;
function nextEmployeeId(): number {
	employeeIdCounter += 1;
	return employeeIdCounter;
}

export async function createEmployeeMock(
	companyId: string,
	data: CreateEmployeeData,
): Promise<Employee & { permissions: EmployeePermissions }> {
	await delay();
	const company = requireCompany(companyId);
	const id = nextEmployeeId();
	const employee: Employee & { permissions: EmployeePermissions } = {
		id,
		firstName: data.firstName,
		lastName: data.lastName,
		patronymic: data.patronymic,
		position: data.position,
		role: data.role,
		phone: data.phone,
		email: data.email,
		isResponsible: data.isResponsible,
		permissions: {
			id: nextId("perm"),
			employeeId: id,
			analytics: "none",
			procurement: "none",
			companies: "none",
			tasks: "none",
		},
	};
	company.employees.push(employee);
	return { ...employee, permissions: { ...employee.permissions } };
}

export async function updateEmployeeMock(
	companyId: string,
	employeeId: number,
	data: UpdateEmployeeData,
): Promise<Employee & { permissions: EmployeePermissions }> {
	await delay();
	const company = requireCompany(companyId);
	const idx = company.employees.findIndex((e) => e.id === employeeId);
	if (idx === -1) throw new Error(`Employee ${employeeId} not found in company ${companyId}`);
	company.employees[idx] = { ...company.employees[idx], ...data };
	const e = company.employees[idx];
	return { ...e, permissions: { ...e.permissions } };
}

export async function deleteEmployeeMock(companyId: string, employeeId: number): Promise<void> {
	await delay();
	const company = requireCompany(companyId);
	company.employees = company.employees.filter((e) => e.id !== employeeId);
}

export async function updateEmployeePermissionsMock(
	companyId: string,
	employeeId: number,
	data: UpdatePermissionsData,
): Promise<EmployeePermissions> {
	await delay();
	const company = requireCompany(companyId);
	const idx = company.employees.findIndex((e) => e.id === employeeId);
	if (idx === -1) throw new Error(`Employee ${employeeId} not found in company ${companyId}`);
	const updated = { ...company.employees[idx].permissions, ...data };
	company.employees[idx] = { ...company.employees[idx], permissions: updated };
	return { ...updated };
}
