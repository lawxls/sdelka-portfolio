import type {
	CreateSupplierInput,
	Supplier,
	SupplierChatMessage,
	SupplierQuote,
	SuppliersPage,
} from "../domains/suppliers";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import { filesToAttachments } from "../supplier-types";
import type { SuppliersClient } from "./suppliers-client";

function buildQuery(params: object): string {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		if (Array.isArray(value)) {
			for (const v of value) sp.append(key, String(v));
		} else {
			sp.set(key, String(value));
		}
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}

const enc = encodeURIComponent;

export function createHttpSuppliersClient(http: HttpClient = defaultHttpClient): SuppliersClient {
	return {
		list: (itemId, params) =>
			http.get<SuppliersPage>(`/procurement/items/${enc(itemId)}/suppliers/${buildQuery(params ?? {})}`),

		// No dedicated "all" route exists on the backend — page through the
		// canonical cursor-paginated item-suppliers endpoint, including archived
		// rows, so callers get the full set (counts filter archived client-side).
		// Guard against a non-advancing/repeated cursor so a degenerate backend
		// response can never spin this into an infinite request loop.
		listForItem: async (itemId) => {
			const suppliers: Supplier[] = [];
			const seenCursors = new Set<string>();
			let cursor: string | undefined;
			do {
				const page = await http.get<SuppliersPage>(
					`/procurement/items/${enc(itemId)}/suppliers/${buildQuery({ showArchived: true, cursor })}`,
				);
				suppliers.push(...page.suppliers);
				const next = page.nextCursor ?? undefined;
				if (next !== undefined && seenCursors.has(next)) break;
				if (next !== undefined) seenCursors.add(next);
				cursor = next;
			} while (cursor);
			return { suppliers };
		},

		// Phase 1: backed by `GET /api/v1/suppliers/` (`SupplierViewSet`).
		// Returns one row per InquiryOffer in the workspace, both archived and
		// active — the FE toggles between them client-side.
		listAll: () => http.get<Supplier[]>(`/suppliers/`),

		get: (itemId, supplierId) => http.get<Supplier | null>(`/items/${enc(itemId)}/suppliers/${enc(supplierId)}`),

		getById: (supplierId) => http.get<Supplier | null>(`/suppliers/${enc(supplierId)}/`),

		quotesByInn: (inn, contextItemId) =>
			http.get<SupplierQuote[]>(`/suppliers/quotes${buildQuery({ inn, contextItemId })}`),

		// Phase 1: backed by the `@action create_supplier` on
		// `ProcurementInquiryViewSet`. Sub-resource path is router-derived,
		// so the prefix must match the rest of the procurement surface
		// (`/procurement/inquiries/…`, not `/procurement-inquiries/…`).
		create: (input: CreateSupplierInput) =>
			http.post<Supplier>(`/procurement/inquiries/${enc(input.procurementInquiryId)}/suppliers/`, {
				body: { inn: input.inn, companyName: input.companyName, website: input.website, email: input.email },
			}),

		archive: (itemId, supplierIds) =>
			http.post<void>(`/items/${enc(itemId)}/suppliers/archive`, { body: { supplierIds } }),

		unarchive: (itemId, supplierIds) =>
			http.post<void>(`/items/${enc(itemId)}/suppliers/unarchive`, { body: { supplierIds } }),

		archiveInquiry: (procurementInquiryId, supplierIds) =>
			http.post<void>(`/procurement/inquiries/${enc(procurementInquiryId)}/suppliers/archive`, {
				body: { supplierIds },
			}),

		unarchiveInquiry: (procurementInquiryId, supplierIds) =>
			http.post<void>(`/procurement/inquiries/${enc(procurementInquiryId)}/suppliers/unarchive`, {
				body: { supplierIds },
			}),

		delete: (itemId, supplierIds) =>
			http.post<void>(`/items/${enc(itemId)}/suppliers/delete`, { body: { supplierIds } }),

		sendRequest: (itemId, supplierIds) =>
			http.post<string[]>(`/items/${enc(itemId)}/suppliers/send-request`, { body: { supplierIds } }),

		sendMessage: (itemId, supplierId, body, files) => {
			const attachments = files && files.length > 0 ? filesToAttachments(files) : undefined;
			return http.post<SupplierChatMessage>(`/items/${enc(itemId)}/suppliers/${enc(supplierId)}/messages`, {
				body: { body, attachments },
			});
		},
	};
}
