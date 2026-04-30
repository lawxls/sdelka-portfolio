import type {
	CreateTenderInput,
	CursorPage,
	ListTendersParams,
	ProcurementInquiry,
	TenderSummary,
} from "../domains/tenders";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { TendersClient } from "./tenders-client";

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

export function createHttpTendersClient(http: HttpClient = defaultHttpClient): TendersClient {
	return {
		list: (params: ListTendersParams) => http.get<CursorPage<TenderSummary>>(`/api/tenders${buildQuery(params)}`),
		get: (id) => http.get<ProcurementInquiry>(`/api/tenders/${enc(id)}`),
		create: (input: CreateTenderInput) => http.post<ProcurementInquiry>(`/api/tenders`, { body: input }),
		update: (id, patch) => http.patch<ProcurementInquiry>(`/api/tenders/${enc(id)}`, { body: patch }),
		delete: (id) => http.delete<void>(`/api/tenders/${enc(id)}`),
	};
}
