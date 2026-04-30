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

export interface ListTendersParams {
	q?: string;
	company?: string;
	folder?: string;
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

function applyFilters(tenders: ProcurementInquiry[], params: ListTendersParams): ProcurementInquiry[] {
	const q = params.q?.trim().toLowerCase();
	return tenders.filter((t) => {
		if (params.company && t.companyId !== params.company) return false;
		if (params.folder && t.folderId !== params.folder) return false;
		if (q && !t.name.toLowerCase().includes(q)) return false;
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
	const filtered = sortByCreatedAtDesc(applyFilters(readTenders(), params));
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
