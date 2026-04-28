import type {
	Address,
	AddressSummary,
	Company,
	CompanySortField,
	CompanySummary,
	CreateAddressData,
	CreateCompanyPayload,
	CreateEmployeeData,
	CursorPage,
	EmployeePermissions,
	EmployeeWithPermissions,
	ListCompaniesParams,
	UpdateAddressData,
	UpdateCompanyData,
	UpdateEmployeeData,
	UpdatePermissionsData,
} from "../domains/companies";
import { NotFoundError } from "../errors";
import { delay, nextId, paginate } from "../mock-utils";
import { SEED_COMPANIES } from "../seeds/companies";
import type { CompaniesClient } from "./companies-client";

function cloneCompany(c: Company): Company {
	return {
		...c,
		addresses: c.addresses.map((a) => ({ ...a })),
		employees: c.employees.map((e) => ({ ...e, permissions: { ...e.permissions } })),
	};
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

function sortCompanies(items: Company[], field: CompanySortField, dir: "asc" | "desc"): Company[] {
	const mul = dir === "asc" ? 1 : -1;
	return [...items].sort((a, b) => {
		if (field === "name") return mul * a.name.localeCompare(b.name, "ru");
		if (field === "employeeCount")
			return mul * ((a.employees.length || a.employeeCount) - (b.employees.length || b.employeeCount));
		return mul * (a.procurementItemCount - b.procurementItemCount);
	});
}

/**
 * Build a fresh in-memory companies adapter with isolated state.
 * Production composition root passes the default seed; tests pass their own.
 */
export function createInMemoryCompaniesClient(seed: Company[] = SEED_COMPANIES): CompaniesClient {
	let store: Company[] = seed.map(cloneCompany);
	let employeeIdCounter = 1000;

	function findIndex(id: string): number {
		return store.findIndex((c) => c.id === id);
	}

	function require(id: string): Company {
		const idx = findIndex(id);
		if (idx === -1) throw new NotFoundError({ id });
		return store[idx];
	}

	return {
		async list(params: ListCompaniesParams): Promise<CursorPage<CompanySummary>> {
			await delay();
			let filtered = store;
			const q = params.q?.trim().toLowerCase();
			if (q) filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
			if (params.sort) filtered = sortCompanies(filtered, params.sort, params.dir ?? "asc");
			const result = paginate({
				items: filtered,
				cursor: params.cursor,
				limit: params.limit,
				getId: (c) => c.id,
			});
			return { items: result.items.map(toSummary), nextCursor: result.nextCursor };
		},

		async listAll(): Promise<CompanySummary[]> {
			await delay();
			return store.map(toSummary);
		},

		async get(id: string): Promise<Company> {
			await delay();
			return cloneCompany(require(id));
		},

		async create(data: CreateCompanyPayload): Promise<Company> {
			await delay();
			const company: Company = {
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
			store.push(company);
			return cloneCompany(company);
		},

		async update(id: string, data: UpdateCompanyData): Promise<Company> {
			await delay();
			const idx = findIndex(id);
			if (idx === -1) throw new NotFoundError({ id });
			store[idx] = { ...store[idx], ...data };
			return cloneCompany(store[idx]);
		},

		async delete(id: string): Promise<void> {
			await delay();
			store = store.filter((c) => c.id !== id);
		},

		async createAddress(companyId: string, data: CreateAddressData): Promise<Address> {
			await delay();
			const company = require(companyId);
			const address: Address = {
				id: nextId("addr"),
				name: data.name,
				address: data.address,
				phone: data.phone,
				isMain: data.isMain ?? false,
			};
			company.addresses.push(address);
			return { ...address };
		},

		async updateAddress(companyId: string, addressId: string, data: UpdateAddressData): Promise<Address> {
			await delay();
			const company = require(companyId);
			const idx = company.addresses.findIndex((a) => a.id === addressId);
			if (idx === -1) throw new NotFoundError({ companyId, addressId });
			company.addresses[idx] = { ...company.addresses[idx], ...data };
			return { ...company.addresses[idx] };
		},

		async deleteAddress(companyId: string, addressId: string): Promise<void> {
			await delay();
			const company = require(companyId);
			company.addresses = company.addresses.filter((a) => a.id !== addressId);
		},

		async createEmployee(companyId: string, data: CreateEmployeeData): Promise<EmployeeWithPermissions> {
			await delay();
			const company = require(companyId);
			employeeIdCounter += 1;
			const id = employeeIdCounter;
			const employee: EmployeeWithPermissions = {
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
		},

		async updateEmployee(
			companyId: string,
			employeeId: number,
			data: UpdateEmployeeData,
		): Promise<EmployeeWithPermissions> {
			await delay();
			const company = require(companyId);
			const idx = company.employees.findIndex((e) => e.id === employeeId);
			if (idx === -1) throw new NotFoundError({ companyId, employeeId });
			company.employees[idx] = { ...company.employees[idx], ...data };
			const e = company.employees[idx];
			return { ...e, permissions: { ...e.permissions } };
		},

		async deleteEmployee(companyId: string, employeeId: number): Promise<void> {
			await delay();
			const company = require(companyId);
			company.employees = company.employees.filter((e) => e.id !== employeeId);
		},

		async updateEmployeePermissions(
			companyId: string,
			employeeId: number,
			data: UpdatePermissionsData,
		): Promise<EmployeePermissions> {
			await delay();
			const company = require(companyId);
			const idx = company.employees.findIndex((e) => e.id === employeeId);
			if (idx === -1) throw new NotFoundError({ companyId, employeeId });
			const updated = { ...company.employees[idx].permissions, ...data };
			company.employees[idx] = { ...company.employees[idx], permissions: updated };
			return { ...updated };
		},
	};
}
