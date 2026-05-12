import { _getAllItems } from "../items-mock-data";
import { delay, paginate } from "../mock-utils";
import { getProcurementInquiryStatus } from "../procurement-inquiries/get-procurement-inquiry-status";
import { type Supplier, supplierIdentity } from "../supplier-types";
import { ALL_ITEM_IDS, getSuppliersForItem } from "../suppliers-mock/store";
import { ACTIVE_TASK_STATUSES, type Task } from "../task-types";
import { readTasks } from "../tasks-mock/store";
import type { ProcurementInquiry, ProcurementInquiryStatus, ProcurementItem } from "../types";
import { readProcurementInquiries } from "./store";

export interface ProcurementInquirySummary {
	id: string;
	name: string;
	companyId: string;
	folderId: string | null;
	budget: number;
	createdAt: string;
	deadline: string;
	status: ProcurementInquiryStatus;
	positionsCount: number;
	kpCount: number;
	suppliersCount: number;
	tasksCount: number;
}

/** "Все" (default — exclude archived) | "просрочены" | "ближайшие 7 дней". */
export type DeadlineFilter = "all" | "overdue" | "soon";

export type ProcurementInquirySortField =
	| "budget"
	| "suppliersCount"
	| "kpCount"
	| "tasksCount"
	| "createdAt"
	| "deadline";
export type ProcurementInquirySortDirection = "asc" | "desc";

export interface ListProcurementInquiriesParams {
	q?: string;
	company?: string;
	/** Folder id (`folder-*`), `"none"` for inquiries without a folder, or
	 * `"archive"` for the archive view. The non-archive view always excludes
	 * archived inquiries. */
	folder?: string;
	status?: ProcurementInquiryStatus;
	deadline?: DeadlineFilter;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by inquiry deadline ≥ this date. */
	deadlineFrom?: string;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by inquiry deadline ≤ this date. */
	deadlineTo?: string;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by inquiry creation date ≥ this date. */
	createdAtFrom?: string;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by inquiry creation date ≤ this date. */
	createdAtTo?: string;
	sort?: ProcurementInquirySortField;
	dir?: ProcurementInquirySortDirection;
	cursor?: string;
	limit?: number;
}

function itemsForProcurementInquiry(
	procurementInquiryId: string,
	allItems: readonly ProcurementItem[],
): ProcurementItem[] {
	return allItems.filter((i) => i.procurementInquiryId === procurementInquiryId);
}

function countDistinctSuppliers(items: readonly ProcurementItem[], predicate: (s: Supplier) => boolean): number {
	const seen = new Set<string>();
	for (const item of items) {
		// Skip items whose supplier list isn't lazy-seeded yet — keeps tests with
		// empty supplier seeds from materializing candidate pools just to count.
		if (!ALL_ITEM_IDS.includes(item.id)) continue;
		for (const s of getSuppliersForItem(item.id)) {
			if (!predicate(s)) continue;
			seen.add(supplierIdentity(s));
		}
	}
	return seen.size;
}

function countActiveTasks(procurementInquiryId: string, allTasks: readonly Task[]): number {
	let n = 0;
	for (const t of allTasks) {
		if (t.procurementInquiry.id !== procurementInquiryId) continue;
		if (ACTIVE_TASK_STATUSES.includes(t.status)) n += 1;
	}
	return n;
}

function summarize(
	procurementInquiry: ProcurementInquiry,
	allItems: readonly ProcurementItem[],
	allTasks: readonly Task[],
): ProcurementInquirySummary {
	const items = itemsForProcurementInquiry(procurementInquiry.id, allItems);
	return {
		id: procurementInquiry.id,
		name: procurementInquiry.name,
		companyId: procurementInquiry.companyId,
		folderId: procurementInquiry.folderId,
		budget: procurementInquiry.budget,
		createdAt: procurementInquiry.createdAt,
		deadline: procurementInquiry.deadline,
		status: getProcurementInquiryStatus(items),
		positionsCount: items.length,
		kpCount: countDistinctSuppliers(items, (s) => s.status === "quote_received"),
		suppliersCount: countDistinctSuppliers(items, (s) => !s.archived),
		tasksCount: countActiveTasks(procurementInquiry.id, allTasks),
	};
}

function matchesFolder(procurementInquiry: ProcurementInquiry, folder: string | undefined): boolean {
	if (folder === "archive") return procurementInquiry.isArchived === true;
	if (procurementInquiry.isArchived === true) return false;
	if (folder === undefined || folder === "all") return true;
	if (folder === "none") return procurementInquiry.folderId === null;
	return procurementInquiry.folderId === folder;
}

function matchesDeadline(
	procurementInquiry: ProcurementInquiry,
	filter: DeadlineFilter | undefined,
	now: Date,
): boolean {
	if (!filter || filter === "all") return true;
	const deadline = new Date(procurementInquiry.deadline);
	if (Number.isNaN(deadline.getTime())) return false;
	if (filter === "overdue") return deadline.getTime() < now.getTime();
	const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
	const diff = deadline.getTime() - now.getTime();
	return diff >= 0 && diff <= sevenDaysMs;
}

function matchesDeadlineRange(procurementInquiry: ProcurementInquiry, from?: string, to?: string): boolean {
	if (!from && !to) return true;
	const deadline = procurementInquiry.deadline?.slice(0, 10) ?? "";
	if (from && deadline < from) return false;
	if (to && deadline > to) return false;
	return true;
}

function matchesCreatedAtRange(procurementInquiry: ProcurementInquiry, from?: string, to?: string): boolean {
	if (!from && !to) return true;
	const createdAt = procurementInquiry.createdAt?.slice(0, 10) ?? "";
	if (from && createdAt < from) return false;
	if (to && createdAt > to) return false;
	return true;
}

function applyFilters(
	procurementInquiries: ProcurementInquiry[],
	params: ListProcurementInquiriesParams,
	allItems: readonly ProcurementItem[],
	now: Date,
): ProcurementInquiry[] {
	const q = params.q?.trim().toLowerCase();
	return procurementInquiries.filter((t) => {
		if (!matchesFolder(t, params.folder)) return false;
		if (params.company && t.companyId !== params.company) return false;
		if (q && !t.name.toLowerCase().includes(q)) return false;
		if (!matchesDeadline(t, params.deadline, now)) return false;
		if (!matchesDeadlineRange(t, params.deadlineFrom, params.deadlineTo)) return false;
		if (!matchesCreatedAtRange(t, params.createdAtFrom, params.createdAtTo)) return false;
		if (params.status) {
			const status = getProcurementInquiryStatus(itemsForProcurementInquiry(t.id, allItems));
			if (status !== params.status) return false;
		}
		return true;
	});
}

function sortByCreatedAtDesc(procurementInquiries: ProcurementInquiry[]): ProcurementInquiry[] {
	return [...procurementInquiries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

function compareSummaries(
	a: ProcurementInquirySummary,
	b: ProcurementInquirySummary,
	field: ProcurementInquirySortField,
): number {
	switch (field) {
		case "budget":
			return a.budget - b.budget;
		case "suppliersCount":
			return a.suppliersCount - b.suppliersCount;
		case "kpCount":
			return a.kpCount - b.kpCount;
		case "tasksCount":
			return a.tasksCount - b.tasksCount;
		case "createdAt":
			return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
		case "deadline":
			return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0;
	}
}

function sortSummaries(
	summaries: ProcurementInquirySummary[],
	field: ProcurementInquirySortField,
	direction: ProcurementInquirySortDirection,
): ProcurementInquirySummary[] {
	const mul = direction === "asc" ? 1 : -1;
	return [...summaries].sort((a, b) => compareSummaries(a, b, field) * mul);
}

export async function fetchProcurementInquiriesListMock(params: ListProcurementInquiriesParams): Promise<{
	items: ProcurementInquirySummary[];
	nextCursor: string | null;
}> {
	await delay();
	const allItems = _getAllItems();
	const allTasks = readTasks();
	const filtered = sortByCreatedAtDesc(applyFilters(readProcurementInquiries(), params, allItems, new Date()));
	const page = paginate({ items: filtered, cursor: params.cursor, limit: params.limit, getId: (t) => t.id });
	let summaries = page.items.map((t) => summarize(t, allItems, allTasks));
	if (params.sort && params.dir) {
		summaries = sortSummaries(summaries, params.sort, params.dir);
	}
	return {
		items: summaries,
		nextCursor: page.nextCursor,
	};
}

export async function fetchProcurementInquiryMock(id: string): Promise<ProcurementInquiry | null> {
	await delay();
	const procurementInquiry = readProcurementInquiries().find((t) => t.id === id);
	return procurementInquiry ? { ...procurementInquiry } : null;
}
