import type {
	Address,
	Company,
	CompanyLookup,
	CompanySortField,
	CompanySummary,
	CreateAddressData,
	CreateCompanyPayload,
	CursorPage,
	ListCompaniesParams,
	UpdateAddressData,
	UpdateCompanyData,
} from "../domains/companies";
import { NotFoundError, ValidationError } from "../errors";
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
 *
 * The `lookupByInn` adapter is synthesised: any 10/12-digit INN resolves to a
 * deterministic synthetic record (so the test flow doesn't dead-end on a
 * miss). Two reserved INNs drive miss/error branches:
 *   - `0000000000` → returns `null` (miss / 404)
 *   - `9999999999` → throws (mimics 502)
 */
export function createInMemoryCompaniesClient(seed: Company[] = []): CompaniesClient {
	let store: Company[] = seed.map(cloneCompany);
	// Soft-archive marker — mirrors the backend's `is_archived` column. Archived
	// companies stay in the store (retrievable, restorable), just filtered out of
	// the active list. Seed entries flagged `isArchived` start archived.
	const archivedIds = new Set<string>(seed.filter((c) => c.isArchived).map((c) => c.id));

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
			// Default (no param) shows active companies — only `isArchived=true`
			// surfaces the archive view, mirroring the backend's default-active list.
			const wantArchived = params.isArchived === true;
			let filtered = store.filter((c) => archivedIds.has(c.id) === wantArchived);
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
			// Active companies only — pickers/dropdowns must not surface archived rows.
			return store.filter((c) => !archivedIds.has(c.id)).map(toSummary);
		},

		async get(id: string): Promise<Company> {
			await delay();
			return cloneCompany(requireCompany(id));
		},

		async create(data: CreateCompanyPayload): Promise<Company> {
			await delay();
			// In-memory dupe check mirrors the backend's per-workspace unique
			// constraint on inn — surfaces as a ValidationError on the `inn` field
			// so the drawer can render its duplicate notice without hitting the wire.
			if (data.inn && store.some((c) => c.inn === data.inn)) {
				throw new ValidationError({
					inn: ["A company with this INN already exists in this workspace."],
				});
			}
			const now = new Date().toISOString();
			const company: Company = {
				id: nextId("company"),
				name: data.name,
				shortName: data.shortName,
				fullName: data.fullName,
				inn: data.inn,
				kpp: data.kpp,
				ogrn: data.ogrn,
				directorName: data.directorName,
				phoneNumber: data.phoneNumber ?? "",
				email: data.email ?? "",
				website: data.website ?? "",
				additionalComments: data.additionalComments ?? "",
				isMain: false,
				employeeCount: 0,
				procurementItemCount: 0,
				addressesCount: data.addresses.length,
				createdAt: now,
				updatedAt: now,
				addresses: data.addresses.map((a, i) => ({
					id: nextId("addr"),
					name: a.name,
					address: a.address,
					phone: a.phone,
					isMain: a.isMain ?? i === 0,
				})),
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

		async archive(id: string): Promise<void> {
			await delay();
			const company = requireCompany(id);
			if (archivedIds.has(id)) return;
			// Mirror the server-side guards: the main company stays active, and the
			// workspace must keep at least one active company.
			if (company.isMain) {
				throw new ValidationError({ detail: ["Нельзя архивировать основную компанию рабочего пространства."] });
			}
			const activeCount = store.filter((c) => !archivedIds.has(c.id)).length;
			if (activeCount <= 1) {
				throw new ValidationError({
					detail: ["Нельзя архивировать единственную активную компанию рабочего пространства."],
				});
			}
			archivedIds.add(id);
		},

		async unarchive(id: string): Promise<void> {
			await delay();
			requireCompany(id);
			archivedIds.delete(id);
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

		async lookupByInn(inn: string): Promise<CompanyLookup | null> {
			await delay();
			const trimmed = inn.trim();
			if (trimmed === "0000000000" || trimmed === "000000000000") return null;
			if (trimmed === "9999999999" || trimmed === "999999999999") {
				throw new Error("DaData upstream error");
			}
			const existing = store.find((c) => c.inn === trimmed) ?? null;
			return {
				inn: trimmed,
				shortName: `ООО «Тест-${trimmed.slice(-4)}»`,
				fullName: `ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «ТЕСТ-${trimmed.slice(-4)}»`,
				kpp: trimmed.length === 10 ? `${trimmed.slice(0, 4)}01001` : "",
				ogrn: `1${trimmed}${"0".repeat(15 - 1 - trimmed.length)}`.slice(0, 13),
				directorName: "Иванов Иван Иванович",
				phoneNumber: "+7 495 123-45-67",
				email: `info@test-${trimmed.slice(-4)}.ru`,
				address: "г Москва, ул Тестовая, д 1",
				status: "ACTIVE",
				existing: existing ? { id: existing.id, name: existing.name } : null,
			};
		},
	};
}
