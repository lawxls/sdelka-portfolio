import type {
	CreateProcurementInquiryInput,
	CursorPage,
	ListProcurementInquiriesParams,
	ProcurementInquiry,
	ProcurementInquirySummary,
} from "../domains/procurement-inquiries";

/**
 * Public seam for the inquiries domain. Implementations are in-memory (mock
 * store) or HTTP. Hooks pull this through context, so swapping adapters is a
 * one-line change in the composition root.
 *
 * `list` returns enriched `ProcurementInquirySummary` rows (status rolled up, position +
 * КП counts joined). `get` returns the full `ProcurementInquiry` record. The
 * later slices add `archive`/`delete` and the cross-entity create-with-items
 * operation lives in `procurement-operations`.
 */
export interface ProcurementInquiriesClient {
	list(params: ListProcurementInquiriesParams): Promise<CursorPage<ProcurementInquirySummary>>;
	get(id: string): Promise<ProcurementInquiry>;
	create(input: CreateProcurementInquiryInput): Promise<ProcurementInquiry>;
	update(id: string, patch: Partial<ProcurementInquiry>): Promise<ProcurementInquiry>;
	archive(id: string, isArchived: boolean): Promise<ProcurementInquiry>;
	delete(id: string): Promise<void>;
}
