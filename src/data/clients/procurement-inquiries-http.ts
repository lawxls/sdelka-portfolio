import {
	type CreateProcurementInquiryInput,
	FOLDER_FILTER_ARCHIVE,
	FOLDER_FILTER_NONE,
	type ListProcurementInquiriesParams,
	type ProcurementInquiry,
} from "../domains/procurement-inquiries";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { ProcurementInquiriesClient } from "./procurement-inquiries-client";

interface DrfCursorPage<T> {
	next: string | null;
	previous: string | null;
	results: T[];
}

function extractCursor(nextUrl: string | null): string | null {
	if (!nextUrl) return null;
	try {
		return new URL(nextUrl, "http://placeholder").searchParams.get("cursor");
	} catch {
		return null;
	}
}

/** Translate the FE's `{sort, dir}` URL state into DRF's `ordering` param. */
function buildOrdering(sort: string | undefined, dir: "asc" | "desc" | undefined): string | undefined {
	if (!sort) return undefined;
	return dir === "desc" ? `-${sort}` : sort;
}

interface BackendListParams {
	q?: string;
	company?: string;
	folder?: string;
	folder__isnull?: boolean;
	isArchived?: boolean;
	status?: string;
	createdAtFrom?: string;
	createdAtTo?: string;
	deadlineFrom?: string;
	deadlineTo?: string;
	ordering?: string;
	cursor?: string;
	pageSize?: number;
}

/** Translate FE list params (which use magic folder values + `{sort, dir}`) into
 * the backend's filter/ordering surface. Folder magic values:
 *   - `"archive"` → `isArchived=true`
 *   - `"none"` → `folder__isnull=true`
 *   - any other value → `folder=<uuid>` (passed through)
 * The non-archive view also passes `isArchived=false` so archived inquiries
 * are excluded server-side. */
function translateListParams(params: ListProcurementInquiriesParams): BackendListParams {
	const out: BackendListParams = {};
	if (params.q) out.q = params.q;
	if (params.company) out.company = params.company;
	if (params.folder === FOLDER_FILTER_ARCHIVE) {
		out.isArchived = true;
	} else {
		out.isArchived = false;
		if (params.folder === FOLDER_FILTER_NONE) {
			out.folder__isnull = true;
		} else if (params.folder !== undefined) {
			out.folder = params.folder;
		}
	}
	if (params.status) out.status = params.status;
	if (params.createdAtFrom) out.createdAtFrom = params.createdAtFrom;
	if (params.createdAtTo) out.createdAtTo = params.createdAtTo;
	if (params.deadlineFrom) out.deadlineFrom = params.deadlineFrom;
	if (params.deadlineTo) out.deadlineTo = params.deadlineTo;
	const ordering = buildOrdering(params.sort, params.dir);
	if (ordering) out.ordering = ordering;
	if (params.cursor) out.cursor = params.cursor;
	if (params.limit !== undefined) out.pageSize = params.limit;
	return out;
}

function buildQuery(params: BackendListParams): string {
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
		list: async (params: ListProcurementInquiriesParams) => {
			const query = buildQuery(translateListParams(params));
			const page = await http.get<DrfCursorPage<ProcurementInquiry>>(`/procurement/inquiries/${query}`);
			return { items: page.results, nextCursor: extractCursor(page.next) };
		},
		get: (id) => http.get<ProcurementInquiry>(`/procurement/inquiries/${enc(id)}/`),
		create: (input: CreateProcurementInquiryInput) =>
			http.post<ProcurementInquiry>(`/procurement/inquiries/`, { body: input }),
		update: (id, patch) => http.patch<ProcurementInquiry>(`/procurement/inquiries/${enc(id)}/`, { body: patch }),
		archive: (id) => http.post<ProcurementInquiry>(`/procurement/inquiries/${enc(id)}/archive/`),
		unarchive: (id) => http.post<ProcurementInquiry>(`/procurement/inquiries/${enc(id)}/unarchive/`),
		delete: (id) => http.delete<void>(`/procurement/inquiries/${enc(id)}/`),
	};
}
