/**
 * ProcurementInquiries mock data — barrel re-exporting the public surface needed by the
 * in-memory adapter. The actual store, queries, and mutations live in
 * `procurement-inquiries-mock/`. The seed roster lives at `seeds/procurement-inquiries.ts`. Mirrors the
 * layout introduced for tasks in #252 and suppliers in #253.
 */

export {
	createProcurementInquiryMock,
	deleteProcurementInquiryMock,
	updateProcurementInquiryMock,
} from "./procurement-inquiries-mock/mutations";
export { fetchProcurementInquiriesListMock, fetchProcurementInquiryMock } from "./procurement-inquiries-mock/queries";
export { _setProcurementInquiries } from "./procurement-inquiries-mock/store";
