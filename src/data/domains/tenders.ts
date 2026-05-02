/**
 * Tenders domain types — the single import surface for components and clients.
 * Behavior, fixtures, and helpers live elsewhere; this module is types-only.
 */

export type { CreateTenderInput } from "../tenders-mock/mutations";
export type {
	ListTendersParams,
	TenderSortDirection,
	TenderSortField,
	TenderSummary,
} from "../tenders-mock/queries";
export type { ProcurementInquiry } from "../types";
export type { CursorPage } from "./shared";
