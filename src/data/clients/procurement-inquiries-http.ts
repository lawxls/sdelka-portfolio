import {
	type CreateProcurementInquiryInput,
	FOLDER_FILTER_ALL,
	FOLDER_FILTER_ARCHIVE,
	FOLDER_FILTER_NONE,
	type ListProcurementInquiriesParams,
	type ProcurementInquiry,
	type ProcurementInquirySortField,
	type UpdateProcurementInquiryInput,
} from "../domains/procurement-inquiries";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import { type DrfCursorPage, toCursorPage } from "./drf";
import { itemFromApi, type ProcurementItemWire } from "./items-wire";
import type { ProcurementInquiriesClient } from "./procurement-inquiries-client";

/** Detail responses include nested positions + clarifying questions; list
 * endpoints omit both. `generatedQuestions` defaults to `[]` on list-derived
 * rows so the domain field stays non-optional. */
type ProcurementInquiryWire = Omit<ProcurementInquiry, "items" | "generatedQuestions"> & {
	items?: ProcurementItemWire[];
	generatedQuestions?: ProcurementInquiry["generatedQuestions"];
};

function inquiryFromApi(wire: ProcurementInquiryWire): ProcurementInquiry {
	const { items, generatedQuestions, ...rest } = wire;
	const out: ProcurementInquiry = { ...rest, generatedQuestions: generatedQuestions ?? [] };
	if (items) out.items = items.map(itemFromApi);
	return out;
}

/** FE sort-field names → backend `ordering_fields` (snake_case). DRF rejects
 * camelCase ordering values, so the translator must rename rather than pass
 * through. Keep in sync with `ProcurementInquiryViewSet.ordering_fields` in
 * sdelka-django (`procurement/api_views.py`). */
const SORT_FIELD_TO_BACKEND: Record<ProcurementInquirySortField, string> = {
	suppliersCount: "suppliers_count",
	kpCount: "kp_count",
	tasksCount: "tasks_count",
	createdAt: "created_at",
	updatedAt: "updated_at",
	deadline: "deadline",
};

function buildOrdering(
	sort: ProcurementInquirySortField | undefined,
	dir: "asc" | "desc" | undefined,
): string | undefined {
	if (!sort) return undefined;
	const field = SORT_FIELD_TO_BACKEND[sort];
	return dir === "desc" ? `-${field}` : field;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Resolve the «Просрочены» / «Ближайшие 7 дней» FE presets to concrete
 * `deadlineFrom`/`deadlineTo` bounds the backend understands. Explicit
 * `deadlineFrom`/`deadlineTo` from the date-range picker always win — the
 * preset is a convenience layered on top of the range. */
function applyDeadlinePreset(out: BackendListParams, preset: ListProcurementInquiriesParams["deadline"]): void {
	if (!preset || preset === "all") return;
	const now = new Date();
	if (preset === "overdue") {
		if (out.deadlineTo === undefined) out.deadlineTo = isoDate(new Date(now.getTime() - ONE_DAY_MS));
		return;
	}
	if (preset === "soon") {
		if (out.deadlineFrom === undefined) out.deadlineFrom = isoDate(now);
		if (out.deadlineTo === undefined) out.deadlineTo = isoDate(new Date(now.getTime() + 7 * ONE_DAY_MS));
	}
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
 *   - `"all"` (or `undefined`) → no folder filter
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
		} else if (params.folder !== undefined && params.folder !== FOLDER_FILTER_ALL) {
			out.folder = params.folder;
		}
	}
	if (params.status) out.status = params.status;
	if (params.createdAtFrom) out.createdAtFrom = params.createdAtFrom;
	if (params.createdAtTo) out.createdAtTo = params.createdAtTo;
	if (params.deadlineFrom) out.deadlineFrom = params.deadlineFrom;
	if (params.deadlineTo) out.deadlineTo = params.deadlineTo;
	applyDeadlinePreset(out, params.deadline);
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
			const page = await http.get<DrfCursorPage<ProcurementInquiryWire>>(`/procurement/inquiries/${query}`);
			return toCursorPage({ ...page, results: page.results.map(inquiryFromApi) });
		},
		get: async (id) => inquiryFromApi(await http.get<ProcurementInquiryWire>(`/procurement/inquiries/${enc(id)}/`)),
		create: async (input: CreateProcurementInquiryInput) =>
			inquiryFromApi(await http.post<ProcurementInquiryWire>(`/procurement/inquiries/`, { body: input })),
		update: async (id, patch: UpdateProcurementInquiryInput) =>
			inquiryFromApi(await http.patch<ProcurementInquiryWire>(`/procurement/inquiries/${enc(id)}/`, { body: patch })),
		archive: async (id) =>
			inquiryFromApi(await http.post<ProcurementInquiryWire>(`/procurement/inquiries/${enc(id)}/archive/`)),
		unarchive: async (id) =>
			inquiryFromApi(await http.post<ProcurementInquiryWire>(`/procurement/inquiries/${enc(id)}/unarchive/`)),
		delete: (id) => http.delete<void>(`/procurement/inquiries/${enc(id)}/`),
	};
}
