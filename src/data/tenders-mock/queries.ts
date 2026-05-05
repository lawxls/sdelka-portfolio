import { _getAllItems } from "../items-mock-data";
import { delay, paginate } from "../mock-utils";
import { type Supplier, supplierIdentity } from "../supplier-types";
import { ALL_ITEM_IDS, getSuppliersForItem } from "../suppliers-mock/store";
import { getTenderStatus } from "../tenders/get-tender-status";
import type { ProcurementInquiry, ProcurementItem, TenderStatus } from "../types";
import { readTenders } from "./store";

export interface TenderSummary {
	id: string;
	name: string;
	companyId: string;
	folderId: string | null;
	budget: number;
	createdAt: string;
	deadline: string;
	status: TenderStatus;
	positionsCount: number;
	kpCount: number;
	suppliersCount: number;
}

/** "Все" (default — exclude archived) | "просрочены" | "ближайшие 7 дней". */
export type DeadlineFilter = "all" | "overdue" | "soon";

export type TenderSortField = "budget" | "suppliersCount" | "kpCount" | "createdAt" | "deadline";
export type TenderSortDirection = "asc" | "desc";

export interface ListTendersParams {
	q?: string;
	company?: string;
	/** Folder id (`folder-*`), `"none"` for tenders without a folder, or
	 * `"archive"` for the archive view. The non-archive view always excludes
	 * archived tenders. */
	folder?: string;
	status?: TenderStatus;
	deadline?: DeadlineFilter;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by tender deadline ≥ this date. */
	deadlineFrom?: string;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by tender deadline ≤ this date. */
	deadlineTo?: string;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by tender creation date ≥ this date. */
	createdAtFrom?: string;
	/** Inclusive ISO date (YYYY-MM-DD). Filters by tender creation date ≤ this date. */
	createdAtTo?: string;
	sort?: TenderSortField;
	dir?: TenderSortDirection;
	cursor?: string;
	limit?: number;
}

function itemsForTender(tenderId: string, allItems: readonly ProcurementItem[]): ProcurementItem[] {
	return allItems.filter((i) => i.tenderId === tenderId);
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

function summarize(tender: ProcurementInquiry, allItems: readonly ProcurementItem[]): TenderSummary {
	const items = itemsForTender(tender.id, allItems);
	return {
		id: tender.id,
		name: tender.name,
		companyId: tender.companyId,
		folderId: tender.folderId,
		budget: tender.budget,
		createdAt: tender.createdAt,
		deadline: tender.deadline,
		status: getTenderStatus(items),
		positionsCount: items.length,
		kpCount: countDistinctSuppliers(items, (s) => s.status === "получено_кп"),
		suppliersCount: countDistinctSuppliers(items, (s) => !s.archived),
	};
}

function matchesFolder(tender: ProcurementInquiry, folder: string | undefined): boolean {
	if (folder === "archive") return tender.isArchived === true;
	if (tender.isArchived === true) return false;
	if (folder === undefined || folder === "all") return true;
	if (folder === "none") return tender.folderId === null;
	return tender.folderId === folder;
}

function matchesDeadline(tender: ProcurementInquiry, filter: DeadlineFilter | undefined, now: Date): boolean {
	if (!filter || filter === "all") return true;
	const deadline = new Date(tender.deadline);
	if (Number.isNaN(deadline.getTime())) return false;
	if (filter === "overdue") return deadline.getTime() < now.getTime();
	const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
	const diff = deadline.getTime() - now.getTime();
	return diff >= 0 && diff <= sevenDaysMs;
}

function matchesDeadlineRange(tender: ProcurementInquiry, from?: string, to?: string): boolean {
	if (!from && !to) return true;
	const deadline = tender.deadline?.slice(0, 10) ?? "";
	if (from && deadline < from) return false;
	if (to && deadline > to) return false;
	return true;
}

function matchesCreatedAtRange(tender: ProcurementInquiry, from?: string, to?: string): boolean {
	if (!from && !to) return true;
	const createdAt = tender.createdAt?.slice(0, 10) ?? "";
	if (from && createdAt < from) return false;
	if (to && createdAt > to) return false;
	return true;
}

function applyFilters(
	tenders: ProcurementInquiry[],
	params: ListTendersParams,
	allItems: readonly ProcurementItem[],
	now: Date,
): ProcurementInquiry[] {
	const q = params.q?.trim().toLowerCase();
	return tenders.filter((t) => {
		if (!matchesFolder(t, params.folder)) return false;
		if (params.company && t.companyId !== params.company) return false;
		if (q && !t.name.toLowerCase().includes(q)) return false;
		if (!matchesDeadline(t, params.deadline, now)) return false;
		if (!matchesDeadlineRange(t, params.deadlineFrom, params.deadlineTo)) return false;
		if (!matchesCreatedAtRange(t, params.createdAtFrom, params.createdAtTo)) return false;
		if (params.status) {
			const status = getTenderStatus(itemsForTender(t.id, allItems));
			if (status !== params.status) return false;
		}
		return true;
	});
}

function sortByCreatedAtDesc(tenders: ProcurementInquiry[]): ProcurementInquiry[] {
	return [...tenders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

function compareSummaries(a: TenderSummary, b: TenderSummary, field: TenderSortField): number {
	switch (field) {
		case "budget":
			return a.budget - b.budget;
		case "suppliersCount":
			return a.suppliersCount - b.suppliersCount;
		case "kpCount":
			return a.kpCount - b.kpCount;
		case "createdAt":
			return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
		case "deadline":
			return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0;
	}
}

function sortSummaries(
	summaries: TenderSummary[],
	field: TenderSortField,
	direction: TenderSortDirection,
): TenderSummary[] {
	const mul = direction === "asc" ? 1 : -1;
	return [...summaries].sort((a, b) => compareSummaries(a, b, field) * mul);
}

export async function fetchTendersListMock(params: ListTendersParams): Promise<{
	items: TenderSummary[];
	nextCursor: string | null;
}> {
	await delay();
	const allItems = _getAllItems();
	const filtered = sortByCreatedAtDesc(applyFilters(readTenders(), params, allItems, new Date()));
	const page = paginate({ items: filtered, cursor: params.cursor, limit: params.limit, getId: (t) => t.id });
	let summaries = page.items.map((t) => summarize(t, allItems));
	if (params.sort && params.dir) {
		summaries = sortSummaries(summaries, params.sort, params.dir);
	}
	return {
		items: summaries,
		nextCursor: page.nextCursor,
	};
}

export async function fetchTenderMock(id: string): Promise<ProcurementInquiry | null> {
	await delay();
	const tender = readTenders().find((t) => t.id === id);
	return tender ? { ...tender } : null;
}
