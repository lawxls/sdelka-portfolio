import type {
	Address,
	Company,
	CompanySortField,
	CompanySummary,
	CreateAddressData,
	CreateCompanyPayload,
	CursorPage,
	ListCompaniesParams,
	UpdateAddressData,
	UpdateCompanyData,
} from "../domains/companies";
import { NotFoundError } from "../errors";
import { delay, nextId, paginate } from "../mock-utils";
import type { CompaniesClient } from "./companies-client";

function cloneCompany(c: Company): Company {
	return { ...c, addresses: c.addresses.map((a) => ({ ...a })) };
}

function toSummary(c: Company): CompanySummary {
	return {
		id: c.id,
		name: c.name,
		isMain: c.isMain,
		addressesCount: c.addressesCount,
		employeeCount: c.employeeCount,
		procurementItemCount: c.procurementItemCount,
		createdAt: c.createdAt,
		updatedAt: c.updatedAt,
	};
}

function sortCompanies(items: Company[], field: CompanySortField, dir: "asc" | "desc"): Company[] {
	const mul = dir === "asc" ? 1 : -1;
	return [...items].sort((a, b) => {
		if (field === "name") return mul * a.name.localeCompare(b.name, "ru");
		if (field === "employeeCount") return mul * (a.employeeCount - b.employeeCount);
		if (field === "createdAt") return mul * a.createdAt.localeCompare(b.createdAt);
		return mul * (a.procurementItemCount - b.procurementItemCount);
	});
}

/**
 * Build a fresh in-memory companies adapter with isolated state. Production
 * unconditionally wires the HTTP adapter; this factory survives as a
 * closure-isolated test fake (default seed: empty) so component tests don't
 * need to stub `fetch`.
 */
export function createInMemoryCompaniesClient(seed: Company[] = []): CompaniesClient {
	let store: Company[] = seed.map(cloneCompany);

	function findIndex(id: string): number {
		return store.findIndex((c) => c.id === id);
	}

	function requireCompany(id: string): Company {
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
			return cloneCompany(requireCompany(id));
		},

		async create(data: CreateCompanyPayload): Promise<Company> {
			await delay();
			const now = new Date().toISOString();
			const company: Company = {
				id: nextId("company"),
				name: data.name,
				website: data.website ?? "",
				description: data.description ?? "",
				additionalComments: data.additionalComments ?? "",
				isMain: false,
				cardFile: null,
				cardFileName: "",
				employeeCount: 0,
				procurementItemCount: 0,
				addressesCount: 1,
				createdAt: now,
				updatedAt: now,
				addresses: [
					{
						id: nextId("addr"),
						name: data.address.name,
						address: data.address.address,
						phone: data.address.phone,
						isMain: data.address.isMain ?? true,
					},
				],
			};
			store.push(company);
			return cloneCompany(company);
		},

		async update(id: string, data: UpdateCompanyData): Promise<Company> {
			await delay();
			const idx = findIndex(id);
			if (idx === -1) throw new NotFoundError({ id });
			store[idx] = { ...store[idx], ...data, updatedAt: new Date().toISOString() };
			return cloneCompany(store[idx]);
		},

		async delete(id: string): Promise<void> {
			await delay();
			store = store.filter((c) => c.id !== id);
		},

		async createAddress(companyId: string, data: CreateAddressData): Promise<Address> {
			await delay();
			const company = requireCompany(companyId);
			const address: Address = {
				id: nextId("addr"),
				name: data.name,
				address: data.address,
				phone: data.phone,
				isMain: data.isMain ?? false,
			};
			company.addresses.push(address);
			company.addressesCount = company.addresses.length;
			return { ...address };
		},

		async updateAddress(companyId: string, addressId: string, data: UpdateAddressData): Promise<Address> {
			await delay();
			const company = requireCompany(companyId);
			const idx = company.addresses.findIndex((a) => a.id === addressId);
			if (idx === -1) throw new NotFoundError({ companyId, addressId });
			company.addresses[idx] = { ...company.addresses[idx], ...data };
			return { ...company.addresses[idx] };
		},

		async deleteAddress(companyId: string, addressId: string): Promise<void> {
			await delay();
			const company = requireCompany(companyId);
			company.addresses = company.addresses.filter((a) => a.id !== addressId);
			company.addressesCount = company.addresses.length;
		},

		async uploadCard(companyId: string, file: File): Promise<Company> {
			await delay();
			const company = requireCompany(companyId);
			company.cardFile = `mock://companies/cards/${encodeURIComponent(file.name)}`;
			company.cardFileName = file.name;
			company.updatedAt = new Date().toISOString();
			return cloneCompany(company);
		},

		async deleteCard(companyId: string): Promise<Company> {
			await delay();
			const company = requireCompany(companyId);
			company.cardFile = null;
			company.cardFileName = "";
			company.updatedAt = new Date().toISOString();
			return cloneCompany(company);
		},
	};
}
