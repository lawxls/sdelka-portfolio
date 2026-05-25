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
import { FOLDER_FILTER_ARCHIVE } from "../domains/procurement-inquiries";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import { buildQueryString, type DrfCursorPage, toCursorPage } from "./drf";
import type { ItemsClient } from "./items-client";
import { itemFromApi, itemToApiPatch, newItemToApi, type ProcurementItemWire } from "./items-wire";

/** Mirrors the folder→isArchived translation in `procurement-inquiries-http.ts`. */
function translateFolder(folder: string | undefined): { folder?: string; isArchived: boolean } {
	if (folder === FOLDER_FILTER_ARCHIVE) return { isArchived: true };
	return { folder, isArchived: false };
}

function listQuery(params: ListItemsParams): string {
	const { folder, isArchived } = translateFolder(params.folder);
	return buildQueryString({
		q: params.q,
		status: params.status,
		deviation: params.deviation,
		folder,
		isArchived,
		company: params.company,
		procurementInquiry: params.procurementInquiry,
		sort: params.sort,
		dir: params.dir,
		cursor: params.cursor,
		pageSize: params.limit,
	});
}

function totalsQuery(params: TotalsParams): string {
	const { folder, isArchived } = translateFolder(params.folder);
	return buildQueryString({
		q: params.q,
		status: params.status,
		deviation: params.deviation,
		folder,
		isArchived,
		company: params.company,
		procurementInquiry: params.procurementInquiry,
	});
}

function exportQuery(params: ExportItemsParams): string {
	const { folder, isArchived } = translateFolder(params.folder);
	return buildQueryString({
		q: params.q,
		status: params.status,
		deviation: params.deviation,
		folder,
		isArchived,
		company: params.company,
		procurementInquiry: params.procurementInquiry,
		sort: params.sort,
		dir: params.dir,
	});
}

const enc = encodeURIComponent;

interface CreateItemsResponse {
	items: ProcurementItemWire[];
}

export function createHttpItemsClient(http: HttpClient = defaultHttpClient): ItemsClient {
	return {
		list: async (params: ListItemsParams) => {
			const page = await http.get<DrfCursorPage<ProcurementItemWire>>(`/procurement/items/${listQuery(params)}`);
			const { items, nextCursor } = toCursorPage(page);
			return { items: items.map(itemFromApi), nextCursor } satisfies CursorPage<ProcurementItem>;
		},

		listAll: async () => {
			const items = await http.get<ProcurementItemWire[]>(`/procurement/items/all/`);
			return items.map(itemFromApi);
		},

		totals: (params: TotalsParams) => http.get<Totals>(`/procurement/items/totals/${totalsQuery(params)}`),

		get: async (id) => itemFromApi(await http.get<ProcurementItemWire>(`/procurement/items/${enc(id)}/`)),

		create: async (inputs: NewItemInput[]) => {
			const response = await http.post<CreateItemsResponse>(`/procurement/items/`, {
				body: { items: inputs.map(newItemToApi) },
			});
			return { items: response.items.map(itemFromApi), isAsync: false } satisfies CreateItemsResult;
		},

		update: async (id, data: UpdateItemData) =>
			itemFromApi(
				await http.patch<ProcurementItemWire>(`/procurement/items/${enc(id)}/`, { body: itemToApiPatch(data) }),
			),

		delete: (id) => http.delete<void>(`/procurement/items/${enc(id)}/`),

		archive: async (id, isArchived) =>
			itemFromApi(
				await http.post<ProcurementItemWire>(`/procurement/items/${enc(id)}/${isArchived ? "archive" : "unarchive"}/`),
			),

		export: (params: ExportItemsParams) =>
			http.getBinary(`/procurement/items/export/${exportQuery(params)}`, { fallbackFilename: "items.xlsx" }),
	};
}
