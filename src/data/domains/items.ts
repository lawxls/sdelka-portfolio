/**
 * Items domain types — the single import surface for components and clients.
 * Behavior, fixtures, and helpers live elsewhere; this module is types-only.
 */
export type { NewItemInput, ProcurementItem, SortDirection, SortField, Totals } from "../types";

export type { CursorPage } from "./shared";

import type { ProcurementItem } from "../types";

export interface ListItemsParams {
	q?: string;
	status?: string;
	deviation?: string;
	folder?: string;
	company?: string;
	sort?: string;
	dir?: string;
	cursor?: string;
	limit?: number;
}

export type TotalsParams = Omit<ListItemsParams, "cursor" | "limit" | "sort" | "dir">;

export type ExportItemsParams = Omit<ListItemsParams, "cursor" | "limit">;

/**
 * Fields a caller may patch on an existing item via `update`. Excludes immutable
 * identity / server-derived fields (id, status, bestPrice, averagePrice, companyId).
 */
export type UpdateItemData = Partial<
	Omit<ProcurementItem, "id" | "status" | "bestPrice" | "averagePrice" | "companyId">
>;

export interface CreateItemsResult {
	items?: ProcurementItem[];
	isAsync: boolean;
	taskId?: string;
}
