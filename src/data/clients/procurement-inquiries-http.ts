import type {
	CreateProcurementInquiryInput,
	CursorPage,
	ListProcurementInquiriesParams,
	ProcurementInquiry,
	ProcurementInquirySummary,
} from "../domains/procurement-inquiries";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { ProcurementInquiriesClient } from "./procurement-inquiries-client";

function buildQuery(params: object): string {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		sp.set(key, String(value));
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}

const enc = encodeURIComponent;

export function createHttpProcurementInquiriesClient(http: HttpClient = defaultHttpClient): ProcurementInquiriesClient {
	return {
		list: (params: ListProcurementInquiriesParams) =>
			http.get<CursorPage<ProcurementInquirySummary>>(`/procurement-inquiries${buildQuery(params)}`),
		get: (id) => http.get<ProcurementInquiry>(`/procurement-inquiries/${enc(id)}`),
		create: (input: CreateProcurementInquiryInput) =>
			http.post<ProcurementInquiry>(`/procurement-inquiries`, { body: input }),
		update: (id, patch) => http.patch<ProcurementInquiry>(`/procurement-inquiries/${enc(id)}`, { body: patch }),
		archive: (id, isArchived) =>
			http.post<ProcurementInquiry>(`/procurement-inquiries/${enc(id)}/archive`, { body: { isArchived } }),
		delete: (id) => http.delete<void>(`/procurement-inquiries/${enc(id)}`),
	};
}
