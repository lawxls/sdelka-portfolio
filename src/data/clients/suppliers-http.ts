import type { Supplier, SupplierChatMessage, SupplierQuote, SuppliersList, SuppliersPage } from "../domains/suppliers";
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
		list: (itemId, params) => http.get<SuppliersPage>(`/api/items/${enc(itemId)}/suppliers${buildQuery(params ?? {})}`),

		listForItem: (itemId) => http.get<SuppliersList>(`/api/items/${enc(itemId)}/suppliers/all`),

		listAll: () => http.get<Supplier[]>(`/api/suppliers`),

		get: (itemId, supplierId) => http.get<Supplier | null>(`/api/items/${enc(itemId)}/suppliers/${enc(supplierId)}`),

		getById: (supplierId) => http.get<Supplier | null>(`/api/suppliers/${enc(supplierId)}`),

		quotesByInn: (inn, contextItemId) =>
			http.get<SupplierQuote[]>(`/api/suppliers/quotes${buildQuery({ inn, contextItemId })}`),

		archive: (itemId, supplierIds) =>
			http.post<void>(`/api/items/${enc(itemId)}/suppliers/archive`, { body: { supplierIds } }),

		unarchive: (itemId, supplierIds) =>
			http.post<void>(`/api/items/${enc(itemId)}/suppliers/unarchive`, { body: { supplierIds } }),

		delete: (itemId, supplierIds) =>
			http.post<void>(`/api/items/${enc(itemId)}/suppliers/delete`, { body: { supplierIds } }),

		sendRequest: (itemId, supplierIds) =>
			http.post<string[]>(`/api/items/${enc(itemId)}/suppliers/send-request`, { body: { supplierIds } }),

		selectSupplier: (itemId, supplierId) =>
			http.post<void>(`/api/items/${enc(itemId)}/suppliers/${enc(supplierId)}/select`),

		selectSupplierByInn: (itemId, inn) =>
			http.post<void>(`/api/items/${enc(itemId)}/suppliers/select-by-inn`, { body: { inn } }),

		sendMessage: (itemId, supplierId, body, files) => {
			const attachments = files && files.length > 0 ? filesToAttachments(files) : undefined;
			return http.post<SupplierChatMessage>(`/api/items/${enc(itemId)}/suppliers/${enc(supplierId)}/messages`, {
				body: { body, attachments },
			});
		},
	};
}
