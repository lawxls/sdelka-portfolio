import type {
	Address,
	Company,
	CompanySummary,
	CreateAddressData,
	CreateCompanyPayload,
	CursorPage,
	ListCompaniesParams,
} from "../domains/companies";
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
			const body: Record<string, unknown> = { name: data.name };
			if (data.inn !== undefined) body.inn = data.inn;
			if (data.website !== undefined) body.website = data.website;
			if (data.description !== undefined) body.description = data.description;
			if (data.additionalComments !== undefined) body.additionalComments = data.additionalComments;
			const created = await http.post<Company>(`/companies/`, { body });
			const address = await http.post<DrfAddress>(`/companies/addresses/`, {
				body: {
					companyId: created.id,
					name: data.address.name,
					address: data.address.address,
					phone: data.address.phone,
					isMain: data.address.isMain ?? true,
				},
			});
			// Partial-failure mode (address POST fails after the company persists)
			// bubbles the address error as-is; the company sticks server-side and
			// the user retries from the Addresses tab.
			return { ...created, addresses: [toAddress(address)], addressesCount: 1 };
		},

		update: (id, data) => http.patch<Company>(`/companies/${enc(id)}/`, { body: data }),
		archive: (id) => http.post<void>(`/companies/${enc(id)}/archive/`),
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

		uploadCard(companyId: string, file: File): Promise<Company> {
			const form = new FormData();
			form.append("cardFile", file);
			return http.postMultipart<Company>(`/companies/${enc(companyId)}/card/`, { body: form });
		},

		deleteCard: (companyId) => http.delete<Company>(`/companies/${enc(companyId)}/card/`),
	};
}
