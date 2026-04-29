import type {
	CreateItemsResult,
	CursorPage,
	ExportItemsParams,
	ListItemsParams,
	NewItemInput,
	ProcurementItem,
	Totals,
	TotalsParams,
	UpdateItemData,
} from "../domains/items";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { ItemsClient } from "./items-client";

function buildListQuery(params: object): string {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		sp.set(key, String(value));
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}

const enc = encodeURIComponent;

export function createHttpItemsClient(http: HttpClient = defaultHttpClient): ItemsClient {
	return {
		list: (params: ListItemsParams) => http.get<CursorPage<ProcurementItem>>(`/api/items${buildListQuery(params)}`),

		listAll: () => http.get<ProcurementItem[]>(`/api/items/all`),

		totals: (params: TotalsParams) => http.get<Totals>(`/api/items/totals${buildListQuery(params)}`),

		get: (id) => http.get<ProcurementItem>(`/api/items/${enc(id)}`),

		create: (inputs: NewItemInput[]) => http.post<CreateItemsResult>(`/api/items`, { body: { items: inputs } }),

		update: (id, data: UpdateItemData) => http.patch<ProcurementItem>(`/api/items/${enc(id)}`, { body: data }),

		delete: (id) => http.delete<void>(`/api/items/${enc(id)}`),

		archive: (id, isArchived) =>
			http.post<ProcurementItem>(`/api/items/${enc(id)}/${isArchived ? "archive" : "unarchive"}`),

		export: (params: ExportItemsParams) =>
			http.getBinary(`/api/items/export${buildListQuery(params)}`, { fallbackFilename: "items.xlsx" }),
	};
}
