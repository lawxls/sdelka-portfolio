import type {
	CreateProcurementInquiryInput,
	CursorPage,
	ListProcurementInquiriesParams,
	ProcurementInquiry,
	UpdateProcurementInquiryInput,
} from "../domains/procurement-inquiries";

/**
 * Public seam for the inquiries domain. Implementations are in-memory (test
 * fake) or HTTP. Hooks pull this through context, so swapping adapters is a
 * one-line change in the composition root.
 *
 * Mirrors the Django `ProcurementInquiryViewSet`: list/retrieve return the same
 * full `ProcurementInquiry` shape (annotated counts always present); archive
 * and unarchive are distinct endpoints, not a single toggle.
 */
export interface ProcurementInquiriesClient {
	list(params: ListProcurementInquiriesParams): Promise<CursorPage<ProcurementInquiry>>;
	get(id: string): Promise<ProcurementInquiry>;
	create(input: CreateProcurementInquiryInput): Promise<ProcurementInquiry>;
	update(id: string, patch: UpdateProcurementInquiryInput): Promise<ProcurementInquiry>;
	archive(id: string): Promise<ProcurementInquiry>;
	unarchive(id: string): Promise<ProcurementInquiry>;
	delete(id: string): Promise<void>;
}
