import type {
	CreateTenderInput,
	CursorPage,
	ListTendersParams,
	ProcurementInquiry,
	TenderSummary,
} from "../domains/tenders";

/**
 * Public seam for the tenders domain. Implementations are in-memory (mock
 * store) or HTTP. Hooks pull this through context, so swapping adapters is a
 * one-line change in the composition root.
 *
 * `list` returns enriched `TenderSummary` rows (status rolled up, position +
 * КП counts joined). `get` returns the full `ProcurementInquiry` record. The
 * later slices add `archive`/`delete` and the cross-entity create-with-items
 * operation lives in `procurement-operations`.
 */
export interface TendersClient {
	list(params: ListTendersParams): Promise<CursorPage<TenderSummary>>;
	get(id: string): Promise<ProcurementInquiry>;
	create(input: CreateTenderInput): Promise<ProcurementInquiry>;
	update(id: string, patch: Partial<ProcurementInquiry>): Promise<ProcurementInquiry>;
	delete(id: string): Promise<void>;
}
