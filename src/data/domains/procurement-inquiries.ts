/**
 * ProcurementInquiries domain types — the single import surface for components and clients.
 * Behavior, fixtures, and helpers live elsewhere; this module is types-only.
 */

export type { CreateProcurementInquiryInput } from "../procurement-inquiries-mock/mutations";
export type {
	ListProcurementInquiriesParams,
	ProcurementInquirySortDirection,
	ProcurementInquirySortField,
	ProcurementInquirySummary,
} from "../procurement-inquiries-mock/queries";
export type { ProcurementInquiry } from "../types";
export type { CursorPage } from "./shared";
