import type {
	Address,
	Company,
	CompanyLookup,
	CompanySummary,
	CreateAddressData,
	CreateCompanyPayload,
	CursorPage,
	ListCompaniesParams,
} from "../domains/companies";
import { NotFoundError } from "../errors";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { CompaniesClient } from "./companies-client";
import { type DrfCursorPage, toCursorPage } from "./drf";

const enc = encodeURIComponent;

/** Backend `?ordering=` accepts snake_case fields with `-` prefix for desc.
 * FE sort state is camelCase. Keep the translation here so call sites stay
 * backend-agnostic. */
const ORDERING_BY_SORT: Record<NonNullable<ListCompaniesParams["sort"]>, string> = {
	name: "name",
	employeeCount: "employee_count",
	procurementItemCount: "procurement_item_count",
	createdAt: "created_at",
};

interface DrfAddress {
	id: string;
	companyId: string;
	name: string;
	address: string;
	phone: string;
	isMain: boolean;
	createdAt: string;
	updatedAt: string;
}

function toAddress(a: DrfAddress): Address {
	return { id: a.id, name: a.name, address: a.address, phone: a.phone, isMain: a.isMain };
}

function buildListQuery(params: ListCompaniesParams): string {
	const sp = new URLSearchParams();
	if (params.q) sp.set("q", params.q);
	if (params.sort) {
		const field = ORDERING_BY_SORT[params.sort];
		sp.set("ordering", params.dir === "desc" ? `-${field}` : field);
	}
	// camelCase to match the API's camelCase wire convention (mirrors AddressFilter.isMain).
	if (params.isArchived !== undefined) sp.set("isArchived", String(params.isArchived));
	if (params.cursor) sp.set("cursor", params.cursor);
	if (params.limit !== undefined) sp.set("pageSize", String(params.limit));
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}

const LIST_ALL_PAGE_SIZE = 200;
const LIST_ALL_HARD_CAP = 5_000;

/**
 * HTTP adapter for the companies + addresses domain. Targets Django REST at
 * `/companies/` (companies CRUD) and `/companies/addresses/` (addresses CRUD
 * as a flat top-level resource, scoped by `?company=<uuid>` or by the
 * `companyId` body field on writes).
 *
 * Cross-cutting translations live here so call sites stay backend-agnostic:
 *  - cursor-page `{ next, previous, results }` → FE `{ items, nextCursor }`,
 *  - FE `{ sort, dir }` → DRF `ordering=±field` (camelCase → snake_case),
 *  - `create()` orchestrates two-step: company POST then per-address POST.
 *    Partial failure (company persisted, address failed) rethrows after the
 *    company is already on the server; the hook surfaces the toast and the
 *    user retries from the Addresses tab.
 *  - `listAll()` auto-paginates internally (cursor-walk) so callers don't
 *    have to know the pagination shape.
 */
export function createHttpCompaniesClient(http: HttpClient = defaultHttpClient): CompaniesClient {
	async function listPage(params: ListCompaniesParams): Promise<CursorPage<CompanySummary>> {
		const page = await http.get<DrfCursorPage<CompanySummary>>(`/companies/${buildListQuery(params)}`);
		return toCursorPage(page);
	}

	return {
		list: (params) => listPage(params),

		async listAll(): Promise<CompanySummary[]> {
			const all: CompanySummary[] = [];
			let cursor: string | undefined;
			while (true) {
				const page = await listPage({ cursor, limit: LIST_ALL_PAGE_SIZE });
				all.push(...page.items);
				if (all.length >= LIST_ALL_HARD_CAP) return all.slice(0, LIST_ALL_HARD_CAP);
				if (!page.nextCursor) return all;
				cursor = page.nextCursor;
			}
		},

		get: (id) => http.get<Company>(`/companies/${enc(id)}/`),

		async create(data: CreateCompanyPayload): Promise<Company> {
			// Single POST for the company; addresses are then created one by one
			// against the flat `/companies/addresses/` resource. Partial failure
			// (company persisted, address failed) bubbles the address error as-is.
			const created = await http.post<Company>(`/companies/`, {
				body: {
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
				},
			});
			const addresses: Address[] = [];
			for (let i = 0; i < data.addresses.length; i += 1) {
				const a = data.addresses[i];
				const written = await http.post<DrfAddress>(`/companies/addresses/`, {
					body: {
						companyId: created.id,
						name: a.name,
						address: a.address,
						phone: a.phone,
						isMain: a.isMain ?? i === 0,
					},
				});
				addresses.push(toAddress(written));
			}
			return { ...created, addresses, addressesCount: addresses.length };
		},

		update: (id, data) => http.patch<Company>(`/companies/${enc(id)}/`, { body: data }),
		archive: (id) => http.post<void>(`/companies/${enc(id)}/archive/`),

		unarchive: (id) => http.post<void>(`/companies/${enc(id)}/unarchive/`),
		delete: (id) => http.delete<void>(`/companies/${enc(id)}/`),

		async createAddress(companyId: string, data: CreateAddressData): Promise<Address> {
			const address = await http.post<DrfAddress>(`/companies/addresses/`, {
				body: {
					companyId,
					name: data.name,
					address: data.address,
					phone: data.phone,
					isMain: data.isMain ?? false,
				},
			});
			return toAddress(address);
		},

		async updateAddress(_companyId, addressId, data): Promise<Address> {
			const address = await http.patch<DrfAddress>(`/companies/addresses/${enc(addressId)}/`, { body: data });
			return toAddress(address);
		},

		deleteAddress: (_companyId, addressId) => http.delete<void>(`/companies/addresses/${enc(addressId)}/`),

		async lookupByInn(inn: string): Promise<CompanyLookup | null> {
			try {
				return await http.get<CompanyLookup>(`/companies/lookup-by-inn/?inn=${enc(inn)}`);
			} catch (err) {
				// 404 ⇒ miss: the lookup card switches to the "не найдено" state.
				// 502/network/etc bubble up so the UI can render the upstream-down banner.
				if (err instanceof NotFoundError) return null;
				throw err;
			}
		},
	};
}
