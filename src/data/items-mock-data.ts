import { delay, nextId, paginate } from "./mock-utils";
import { SEED_ARCHIVED, SEED_ITEMS } from "./seeds/items";
import { _addYourSupplier } from "./supplier-mock-data";
import type { NewItemInput, ProcurementItem, ProcurementStatus, SortDirection, SortField, Totals } from "./types";
import { getAnnualCost, getDeviation, getDisplayStatus, getOverpayment } from "./types";

// --- Mutable store ---

let itemsStore: ProcurementItem[] = [];
let archivedIds: Set<string> = new Set();

function seedStore() {
	itemsStore = SEED_ITEMS.map((item) => ({ ...item }));
	archivedIds = new Set(SEED_ARCHIVED);
}

seedStore();

export function _resetItemsStore(): void {
	seedStore();
}

/** Test helper: replace store with a specific set of items. */
export function _setItems(items: ProcurementItem[], archived: string[] = []): void {
	itemsStore = items.map((item) => ({ ...item }));
	archivedIds = new Set(archived);
}

export function _getAllItems(): ProcurementItem[] {
	return itemsStore.map((item) => ({ ...item }));
}

export function _getItem(id: string): ProcurementItem | null {
	const item = itemsStore.find((i) => i.id === id);
	return item ? { ...item } : null;
}

export function _patchItem(id: string, data: Partial<ProcurementItem>): ProcurementItem | null {
	const idx = itemsStore.findIndex((i) => i.id === id);
	if (idx === -1) return null;
	const updated = { ...itemsStore[idx], ...data };
	itemsStore[idx] = updated;
	return { ...updated };
}

export function _isArchived(id: string): boolean {
	return archivedIds.has(id);
}

// --- Filtering / sorting ---

export interface FilterParams {
	q?: string;
	status?: string;
	deviation?: string;
	folder?: string;
	company?: string;
	procurementInquiry?: string;
	sort?: string;
	dir?: string;
	cursor?: string;
	limit?: number;
}

/** Inquiry-side state lookup. The legacy mock store is gone; tests that need
 * cross-entity behavior register a resolver via `_setInquiryStateResolver`.
 * Production never hits this path — items still run via the in-memory adapter
 * in dev/test until the items HTTP integration lands.
 *
 * A static default mapping (`DEFAULT_INQUIRY_STATES`) preserves the legacy
 * SEED_ITEMS ↔ folder/company linkage so /positions in dev (and the suite of
 * page/folder tests that rely on it) keep working without an HTTP backend. */
interface InquiryState {
	folderId: string | null;
	companyId: string;
	isArchived: boolean;
}
type InquiryStateResolver = (inquiryId: string) => InquiryState | null;

const DEFAULT_INQUIRY_STATES: Readonly<Record<string, InquiryState>> = {
	"T-001": { folderId: "folder-packaging", companyId: "company-1", isArchived: false },
	"T-002": { folderId: "folder-fillings", companyId: "company-1", isArchived: false },
	"T-003": { folderId: "folder-fabrics", companyId: "company-1", isArchived: false },
	"T-004": { folderId: "folder-panels", companyId: "company-1", isArchived: false },
	"T-005": { folderId: "folder-springs", companyId: "company-1", isArchived: false },
	"T-006": { folderId: "folder-chemistry", companyId: "company-1", isArchived: false },
};

let inquiryStateResolver: InquiryStateResolver | null = null;

export function _setInquiryStateResolver(resolver: InquiryStateResolver | null): void {
	inquiryStateResolver = resolver;
}

export function _inquiryState(inquiryId: string | undefined | null): InquiryState | null {
	if (!inquiryId) return null;
	if (inquiryStateResolver) return inquiryStateResolver(inquiryId);
	return DEFAULT_INQUIRY_STATES[inquiryId] ?? null;
}

function procurementInquiryFolderId(item: ProcurementItem): string | null {
	return _inquiryState(item.procurementInquiryId)?.folderId ?? null;
}

function procurementInquiryCompanyId(item: ProcurementItem): string | null {
	return _inquiryState(item.procurementInquiryId)?.companyId ?? null;
}

function isEffectivelyArchived(item: ProcurementItem): boolean {
	if (archivedIds.has(item.id)) return true;
	return _inquiryState(item.procurementInquiryId)?.isArchived ?? false;
}

function matchesFolder(item: ProcurementItem, folder: string | undefined, archived: boolean): boolean {
	if (folder === "archive") return archived;
	if (archived) return false;
	if (folder === undefined || folder === "all") return true;
	const folderId = procurementInquiryFolderId(item);
	if (folder === "none") return folderId === null;
	return folderId === folder;
}

function matchesDeviation(item: ProcurementItem, deviation: string | undefined): boolean {
	if (!deviation || deviation === "all") return true;
	if (item.bestPrice == null || item.currentPrice == null) return false;
	if (deviation === "overpaying") return item.currentPrice > item.bestPrice;
	if (deviation === "saving") return item.currentPrice < item.bestPrice;
	return true;
}

function matchesStatus(item: ProcurementItem, status: string | undefined): boolean {
	if (!status || status === "all") return true;
	return getDisplayStatus(item) === status;
}

function applyFilters(items: ProcurementItem[], params: FilterParams): ProcurementItem[] {
	const q = params.q?.trim().toLowerCase();
	return items.filter((item) => {
		if (!matchesFolder(item, params.folder, isEffectivelyArchived(item))) return false;
		if (params.company && procurementInquiryCompanyId(item) !== params.company) return false;
		if (params.procurementInquiry && item.procurementInquiryId !== params.procurementInquiry) return false;
		if (!matchesStatus(item, params.status)) return false;
		if (!matchesDeviation(item, params.deviation)) return false;
		if (q && !item.name.toLowerCase().includes(q)) return false;
		return true;
	});
}

function getSortValue(item: ProcurementItem, field: SortField): number | null {
	switch (field) {
		case "annualCost":
			return getAnnualCost(item);
		case "currentPrice":
			return item.currentPrice;
		case "bestPrice":
			return item.bestPrice;
		case "averagePrice":
			return item.averagePrice;
		case "deviation":
			return getDeviation(item);
		case "overpayment":
			return getOverpayment(item);
	}
}

function sortItems(items: ProcurementItem[], field: SortField, dir: SortDirection): ProcurementItem[] {
	const mul = dir === "asc" ? 1 : -1;
	return [...items].sort((a, b) => {
		const va = getSortValue(a, field);
		const vb = getSortValue(b, field);
		if (va == null && vb == null) return 0;
		if (va == null) return 1;
		if (vb == null) return -1;
		return mul * (va - vb);
	});
}

// --- Mock API functions ---

export async function fetchItemsMock(params: FilterParams): Promise<{
	items: ProcurementItem[];
	nextCursor: string | null;
}> {
	await delay();
	let filtered = applyFilters(itemsStore, params);
	if (params.sort) {
		filtered = sortItems(filtered, params.sort as SortField, (params.dir ?? "asc") as SortDirection);
	}
	const result = paginate({
		items: filtered,
		cursor: params.cursor,
		limit: params.limit,
		getId: (i) => i.id,
	});
	return { items: result.items, nextCursor: result.nextCursor };
}

export async function fetchTotalsMock(
	params: Omit<FilterParams, "cursor" | "limit" | "sort" | "dir">,
): Promise<Totals> {
	await delay();
	const filtered = applyFilters(itemsStore, params);
	let totalOverpayment = 0;
	let totalSavings = 0;
	let weightedCurrent = 0;
	let weightedBest = 0;
	for (const item of filtered) {
		if (item.bestPrice == null || item.currentPrice == null) continue;
		const diff = (item.currentPrice - item.bestPrice) * item.annualQuantity;
		if (diff > 0) totalOverpayment += diff;
		else totalSavings += -diff;
		weightedCurrent += item.currentPrice * item.annualQuantity;
		weightedBest += item.bestPrice * item.annualQuantity;
	}
	const totalDeviation = weightedBest > 0 ? ((weightedCurrent - weightedBest) / weightedBest) * 100 : 0;
	return {
		itemCount: filtered.length,
		totalOverpayment: Math.round(totalOverpayment * 100) / 100,
		totalSavings: Math.round(totalSavings * 100) / 100,
		totalDeviation: Math.round(totalDeviation * 100) / 100,
	};
}

export async function updateItemMock(
	id: string,
	data: { name?: string; isArchived?: boolean },
): Promise<ProcurementItem> {
	await delay();
	const { isArchived, ...rest } = data;
	const updated = _patchItem(id, rest);
	if (!updated) throw new Error(`Item ${id} not found`);
	if (isArchived === true) archivedIds.add(id);
	else if (isArchived === false) archivedIds.delete(id);
	return updated;
}

export async function deleteItemMock(id: string): Promise<void> {
	await delay();
	itemsStore = itemsStore.filter((item) => item.id !== id);
	archivedIds.delete(id);
}

export async function createItemsBatchMock(inputs: NewItemInput[]): Promise<{
	items?: ProcurementItem[];
	isAsync: boolean;
	taskId?: string;
}> {
	await delay();
	const created: ProcurementItem[] = inputs.map((input) => {
		const item: ProcurementItem = {
			id: nextId("item"),
			name: input.name,
			status: input.status ?? ("searching" as ProcurementStatus),
			annualQuantity: input.annualQuantity ?? 0,
			currentPrice: input.currentPrice ?? 0,
			bestPrice: null,
			averagePrice: null,
			unit: input.unit,
			description: input.description,
			quantityPerDelivery: input.quantityPerDelivery,
			paymentType: input.paymentType,
			deliveryCostType: input.deliveryCostType,
			deliveryCost: input.deliveryCost,
			currentSupplier: input.currentSupplier,
			generatedAnswers: input.generatedAnswers,
		};
		return item;
	});
	itemsStore = [...created, ...itemsStore];
	// Seed the «Ваш поставщик» Supplier row for each newly-created item so it surfaces in
	// the Поставщики/Предложения tabs immediately. No-op when the parent inquiry has no
	// currentSupplier or no INN.
	for (const item of created) _addYourSupplier(item.id);
	return { items: created, isAsync: false };
}

export async function exportItemsMock(
	params: Omit<FilterParams, "cursor" | "limit"> = {},
): Promise<{ blob: Blob; filename: string }> {
	await delay();
	const filtered = applyFilters(itemsStore, params);
	const header = "id\tname\tstatus\tprocurementInquiryId\tcurrentPrice\tbestPrice\tannualQuantity\n";
	const rows = filtered
		.map(
			(i) =>
				`${i.id}\t${i.name}\t${i.status}\t${i.procurementInquiryId ?? ""}\t${i.currentPrice}\t${i.bestPrice ?? ""}\t${i.annualQuantity}`,
		)
		.join("\n");
	const blob = new Blob([header + rows], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	return { blob, filename: "items.xlsx" };
}

// --- Filter helpers for folder stats (used by folders-mock-data) ---

/** Group active items by their parent inquiry's folder. Items whose parent
 * inquiry is archived (or item itself archived) are excluded. Items with no
 * inquiry — or whose inquiry has no folder — fall into the `null` bucket. */
export function _statsByFolder(company?: string): Map<string | null, number> {
	const counts = new Map<string | null, number>();
	for (const item of itemsStore) {
		if (isEffectivelyArchived(item)) continue;
		const state = _inquiryState(item.procurementInquiryId);
		if (company && state?.companyId !== company) continue;
		const folderId = state?.folderId ?? null;
		counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
	}
	return counts;
}

export function _archivedCount(company?: string): number {
	let count = 0;
	for (const item of itemsStore) {
		if (!isEffectivelyArchived(item)) continue;
		if (company) {
			const state = _inquiryState(item.procurementInquiryId);
			if (state?.companyId !== company) continue;
		}
		count += 1;
	}
	return count;
}
