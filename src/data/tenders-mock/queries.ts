import { _getAllItems } from "../items-mock-data";
import { delay, paginate } from "../mock-utils";
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
}

/** "Все" (default — exclude archived) | "просрочены" | "ближайшие 7 дней". */
export type DeadlineFilter = "all" | "overdue" | "soon";

export interface ListTendersParams {
	q?: string;
	company?: string;
	/** Folder id (`folder-*`), `"none"` for tenders without a folder, or
	 * `"archive"` for the archive view. The non-archive view always excludes
	 * archived tenders. */
	folder?: string;
	status?: TenderStatus;
	deadline?: DeadlineFilter;
	cursor?: string;
	limit?: number;
}

function itemsForTender(tenderId: string, allItems: readonly ProcurementItem[]): ProcurementItem[] {
	return allItems.filter((i) => i.tenderId === tenderId);
}

function distinctKpCount(items: readonly ProcurementItem[]): number {
	const seen = new Set<string>();
	for (const item of items) {
		// Skip items whose supplier list isn't lazy-seeded yet to avoid materializing
		// candidate pools just to read КП counts in tests with empty supplier seeds.
		if (!ALL_ITEM_IDS.includes(item.id)) continue;
		const suppliers = getSuppliersForItem(item.id);
		for (const s of suppliers) {
			if (s.status !== "получено_кп") continue;
			seen.add(s.inn || s.companyName);
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
		kpCount: distinctKpCount(items),
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

export async function fetchTendersListMock(params: ListTendersParams): Promise<{
	items: TenderSummary[];
	nextCursor: string | null;
}> {
	await delay();
	const allItems = _getAllItems();
	const filtered = sortByCreatedAtDesc(applyFilters(readTenders(), params, allItems, new Date()));
	const page = paginate({ items: filtered, cursor: params.cursor, limit: params.limit, getId: (t) => t.id });
	return {
		items: page.items.map((t) => summarize(t, allItems)),
		nextCursor: page.nextCursor,
	};
}

export async function fetchTenderMock(id: string): Promise<ProcurementInquiry | null> {
	await delay();
	const tender = readTenders().find((t) => t.id === id);
	return tender ? { ...tender } : null;
}
