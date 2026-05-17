/**
 * ProcurementInquiries domain types — the single import surface for components and clients.
 * Mirrors the Django `ProcurementInquirySerializer` 1:1 (camelCase wire format).
 */

import type { ProcurementInquiryStatus, UnloadingType } from "../types";

export type { ProcurementInquiry, ProcurementInquiryStatus } from "../types";
export type { CursorPage } from "./shared";

/** Magic folder values used by the inquiries list URL state. Real folder
 * UUIDs are passed through; these sentinels select the archive view or the
 * "no folder" bucket. */
export const FOLDER_FILTER_ARCHIVE = "archive";
export const FOLDER_FILTER_NONE = "none";
export const FOLDER_FILTER_ALL = "all";

/** "Все" (default — exclude archived) | "просрочены" | "ближайшие 7 дней". */
export type DeadlineFilter = "all" | "overdue" | "soon";

/** FE-side sort fields. The HTTP adapter translates `{sort, dir}` into DRF
 * `ordering=<sign><field>`. URL state continues to use `sort` + `dir` so
 * bookmarked filter links keep working. */
export type ProcurementInquirySortField =
	| "suppliersCount"
	| "kpCount"
	| "tasksCount"
	| "createdAt"
	| "updatedAt"
	| "deadline";
export type ProcurementInquirySortDirection = "asc" | "desc";

export interface ListProcurementInquiriesParams {
	q?: string;
	company?: string;
	/** Folder id (UUID), `"none"` for inquiries without a folder, or `"archive"`
	 * for the archive view. The non-archive view always excludes archived
	 * inquiries (HTTP adapter translates to `isArchived=true` / `folder__isnull=true`). */
	folder?: string;
	status?: ProcurementInquiryStatus;
	deadline?: DeadlineFilter;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by inquiry deadline ≥ this date. */
	deadlineFrom?: string;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by inquiry deadline ≤ this date. */
	deadlineTo?: string;
	/** Inclusive ISO datetime. Filters by inquiry creation ≥ this date. */
	createdAtFrom?: string;
	/** Inclusive ISO datetime. Filters by inquiry creation ≤ this date. */
	createdAtTo?: string;
	sort?: ProcurementInquirySortField;
	dir?: ProcurementInquirySortDirection;
	cursor?: string;
	limit?: number;
}

/** Create payload — mirrors the backend serializer write surface (camelCase). */
export interface CreateProcurementInquiryInput {
	name: string;
	companyId: string;
	folderId?: string | null;
	copySuppliersFromInquiryId?: string | null;
	status?: ProcurementInquiryStatus;
	deadline?: string | null;
	additionalInfo?: string;
	deliveryAddressId?: string | null;
	unloading?: UnloadingType | "";
	analoguesNotAllowed?: boolean;
	cashAllowed?: boolean;
	emailSubject?: string;
	emailBody?: string;
	sendRequestsAutomatically?: boolean;
}
