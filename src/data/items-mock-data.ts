import { ITEM as ITEM_2 } from "./items/item-2";
import { ITEM as ITEM_3 } from "./items/item-3";
import { ITEM as ITEM_4 } from "./items/item-4";
import { ITEM as ITEM_5 } from "./items/item-5";
import { ITEM as ITEM_6 } from "./items/item-6";
import { ITEM as ITEM_7 } from "./items/item-7";
import { ITEM as ITEM_8 } from "./items/item-8";
import { delay, nextId, paginate } from "./mock-utils";
import type { NewItemInput, ProcurementItem, ProcurementStatus, SortDirection, SortField, Totals } from "./types";
import { getAnnualCost, getDeviation, getOverpayment } from "./types";

// --- Seed data ---

const SEED_ITEMS: ProcurementItem[] = [
	{
		id: "item-1",
		name: "Полотно ПВД 2600 мм",
		status: "completed",
		annualQuantity: 180_000,
		currentPrice: 1776,
		// Computed from ORMATEK_SUPPLIERS получено_кп TCOs (50 offers): min 1485, mean 2256.
		bestPrice: 1485,
		averagePrice: 2256,
		folderId: "folder-packaging",
		companyId: "company-1",
		unit: "м",
		taskCount: 16,
		quantityPerDelivery: 15_000,
		paymentType: "prepayment",
		paymentMethod: "bank_transfer",
		deliveryCostType: "paid",
		deliveryAddresses: ["Ростовская обл., Аксайский р-н, Южная промзона"],
		unloading: "supplier",
		analoguesAllowed: true,
		additionalInfo: "Полотно ПВД первичка (без вторсырья), ширина 2600 мм, прозрачное.",
	},
	ITEM_2,
	ITEM_3,
	ITEM_4,
	ITEM_5,
	ITEM_6,
	ITEM_7,
	ITEM_8,
];

const SEED_ARCHIVED: ProcurementItem[] = [];

// --- Mutable store ---

let itemsStore: ProcurementItem[] = [];
let archivedIds: Set<string> = new Set();

function seedStore() {
	itemsStore = SEED_ITEMS.map((item) => ({ ...item }));
	archivedIds = new Set(SEED_ARCHIVED.map((item) => item.id));
	for (const item of SEED_ARCHIVED) itemsStore.push({ ...item });
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
	sort?: string;
	dir?: string;
	cursor?: string;
	limit?: number;
}

function matchesFolder(item: ProcurementItem, folder: string | undefined, archived: boolean): boolean {
	if (folder === "archive") return archived;
	if (archived) return false;
	if (folder === undefined || folder === "all") return true;
	if (folder === "none") return item.folderId === null;
	return item.folderId === folder;
}

function matchesDeviation(item: ProcurementItem, deviation: string | undefined): boolean {
	if (!deviation || deviation === "all") return true;
	if (item.bestPrice == null) return false;
	if (deviation === "overpaying") return item.currentPrice > item.bestPrice;
	if (deviation === "saving") return item.currentPrice < item.bestPrice;
	return true;
}

function applyFilters(items: ProcurementItem[], params: FilterParams): ProcurementItem[] {
	const q = params.q?.trim().toLowerCase();
	return items.filter((item) => {
		if (!matchesFolder(item, params.folder, archivedIds.has(item.id))) return false;
		if (params.company && item.companyId !== params.company) return false;
		if (params.status && params.status !== "all" && item.status !== params.status) return false;
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
		if (item.bestPrice == null) continue;
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
	data: { name?: string; folderId?: string | null; isArchived?: boolean },
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
			status: "searching" as ProcurementStatus,
			annualQuantity: input.annualQuantity ?? 0,
			currentPrice: input.currentPrice ?? input.currentSupplier?.pricePerUnit ?? 0,
			bestPrice: null,
			averagePrice: null,
			folderId: input.folderId ?? null,
			companyId: "company-1",
			unit: input.unit,
			description: input.description,
			quantityPerDelivery: input.quantityPerDelivery,
			paymentType: input.paymentType,
			paymentMethod: input.paymentMethod,
			deliveryCostType: input.deliveryCostType,
			deliveryCost: input.deliveryCost,
			deliveryAddresses: input.deliveryAddresses,
			unloading: input.unloading,
			analoguesAllowed: input.analoguesAllowed,
			sampleRequired: input.sampleRequired,
			additionalInfo: input.additionalInfo,
			currentSupplier: input.currentSupplier,
			generatedAnswers: input.generatedAnswers,
		};
		return item;
	});
	itemsStore = [...created, ...itemsStore];
	return { items: created, isAsync: false };
}

export async function exportItemsMock(
	params: Omit<FilterParams, "cursor" | "limit"> = {},
): Promise<{ blob: Blob; filename: string }> {
	await delay();
	const filtered = applyFilters(itemsStore, params);
	const header = "id\tname\tstatus\tcompanyId\tfolderId\tcurrentPrice\tbestPrice\tannualQuantity\n";
	const rows = filtered
		.map(
			(i) =>
				`${i.id}\t${i.name}\t${i.status}\t${i.companyId ?? ""}\t${i.folderId ?? ""}\t${i.currentPrice}\t${i.bestPrice ?? ""}\t${i.annualQuantity}`,
		)
		.join("\n");
	const blob = new Blob([header + rows], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	return { blob, filename: "items.xlsx" };
}

// --- Filter helper for folder stats (used by folders-mock-data) ---

export function _statsByFolder(company?: string): Map<string | null, number> {
	const counts = new Map<string | null, number>();
	for (const item of itemsStore) {
		if (archivedIds.has(item.id)) continue;
		if (company && item.companyId !== company) continue;
		counts.set(item.folderId, (counts.get(item.folderId) ?? 0) + 1);
	}
	return counts;
}

export function _archivedCount(company?: string): number {
	if (!company) return archivedIds.size;
	let count = 0;
	for (const id of archivedIds) {
		const item = itemsStore.find((i) => i.id === id);
		if (item && item.companyId === company) count += 1;
	}
	return count;
}

/** Used by folders-mock-data when a folder is deleted — reassign items to uncategorized. */
export function _unassignItemsFromFolder(folderId: string): void {
	for (let i = 0; i < itemsStore.length; i++) {
		if (itemsStore[i].folderId === folderId) {
			itemsStore[i] = { ...itemsStore[i], folderId: null };
		}
	}
}
