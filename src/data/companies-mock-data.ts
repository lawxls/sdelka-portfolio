import { delay, nextId, paginate } from "./mock-utils";
import { SEED_COMPANIES } from "./seeds/companies";
import type {
	Address,
	AddressSummary,
	Company,
	CompanySummary,
	Employee,
	EmployeePermissions,
	PermissionLevel,
} from "./types";

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
	return { id: a.id, name: a.name, address: a.address, isMain: a.isMain };
}

function toSummary(c: Company): CompanySummary {
	return {
		id: c.id,
		name: c.name,
		isMain: c.isMain,
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
	website?: string;
	description?: string;
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
	address: string;
	phone: string;
	isMain?: boolean;
}

export interface CreateCompanyPayload {
	name: string;
	website?: string;
	description?: string;
	additionalComments?: string;
	address: CreateAddressData;
}

export async function createCompanyMock(data: CreateCompanyPayload): Promise<Company> {
	await delay();
	const newCompany: Company = {
		id: nextId("company"),
		name: data.name,
		website: data.website ?? "",
		description: data.description ?? "",
		additionalComments: data.additionalComments ?? "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses: [
			{
				id: nextId("addr"),
				name: data.address.name,
				address: data.address.address,
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
	address?: string;
	phone?: string;
	isMain?: boolean;
}

export async function createAddressMock(companyId: string, data: CreateAddressData): Promise<Address> {
	await delay();
	const company = requireCompany(companyId);
	const newAddress: Address = {
		id: nextId("addr"),
		name: data.name,
		address: data.address,
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
}

export interface UpdateEmployeeData {
	firstName?: string;
	lastName?: string;
	patronymic?: string;
	position?: string;
	role?: Employee["role"];
	phone?: string;
}

export interface UpdatePermissionsData {
	procurement?: PermissionLevel;
	tasks?: PermissionLevel;
	companies?: PermissionLevel;
	employees?: PermissionLevel;
	emails?: PermissionLevel;
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
		permissions: {
			id: nextId("perm"),
			employeeId: id,
			procurement: "none",
			tasks: "none",
			companies: "none",
			employees: "none",
			emails: "none",
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
