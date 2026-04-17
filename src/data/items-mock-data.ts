import { delay, nextId, paginate } from "./mock-utils";
import type { NewItemInput, ProcurementItem, ProcurementStatus, SortDirection, SortField, Totals } from "./types";
import { getAnnualCost, getDeviation, getOverpayment } from "./types";

// --- Seed data ---

const SEED_ITEMS: ProcurementItem[] = [
	{
		id: "item-1",
		name: "Арматура А500С ∅12",
		status: "searching",
		annualQuantity: 1200,
		currentPrice: 4500,
		bestPrice: 3800,
		averagePrice: 4100,
		folderId: "folder-metal",
		companyId: "company-1",
		unit: "т",
		taskCount: 2,
		quantityPerDelivery: 100,
		paymentType: "deferred",
		paymentMethod: "bank_transfer",
		deliveryCostType: "free",
		deliveryAddresses: ["г. Москва, ул. Складская, д. 15"],
		unloading: "supplier",
		analoguesAllowed: true,
		additionalInfo: "Требуется сертификат соответствия ГОСТ",
		currentSupplier: {
			companyName: "МеталлТрейд",
			inn: "7701234567",
			paymentType: "deferred",
			deferralDays: 30,
			pricePerUnit: 4500,
		},
		generatedAnswers: [
			{ questionId: "material-grade", selectedOption: "По ГОСТ" },
			{ questionId: "certificates", selectedOption: "Сертификат соответствия", freeText: "Плюс паспорт качества" },
		],
		attachedFiles: [{ name: "specification.pdf", size: 204800 }],
	},
	{
		id: "item-2",
		name: "Труба профильная 40×20",
		status: "negotiating",
		annualQuantity: 500,
		currentPrice: 8200,
		bestPrice: 7500,
		averagePrice: 7900,
		folderId: "folder-metal",
		companyId: "company-1",
		unit: "м",
		taskCount: 3,
		paymentType: "prepayment_30_70",
		paymentMethod: "bank_transfer",
		deliveryCostType: "pickup",
		analoguesAllowed: false,
		currentSupplier: {
			companyName: "ТрубоСталь",
			inn: "7812345678",
			paymentType: "prepayment_30_70",
			deferralDays: 0,
			pricePerUnit: 8200,
		},
	},
	{
		id: "item-3",
		name: "Швеллер 10П",
		status: "completed",
		annualQuantity: 320,
		currentPrice: 62000,
		bestPrice: 58000,
		averagePrice: 60000,
		folderId: "folder-metal",
		companyId: "company-1",
		unit: "т",
		taskCount: 0,
		paymentType: "deferred",
		paymentMethod: "bank_transfer",
		deliveryCostType: "free",
		deliveryAddresses: ["г. Москва, ул. Складская, д. 15"],
		unloading: "supplier",
	},
	{
		id: "item-4",
		name: "Сетка кладочная 50×50",
		status: "searching",
		annualQuantity: 4000,
		currentPrice: 180,
		bestPrice: 165,
		averagePrice: 172,
		folderId: "folder-build",
		companyId: "company-1",
		unit: "м²",
		taskCount: 1,
		paymentType: "prepayment",
		paymentMethod: "bank_transfer",
		deliveryCostType: "free",
		deliveryAddresses: ["г. Москва, ул. Складская, д. 15"],
	},
	{
		id: "item-5",
		name: "Цемент М500 Д0",
		status: "negotiating",
		annualQuantity: 850,
		currentPrice: 9800,
		bestPrice: 8600,
		averagePrice: 9100,
		folderId: "folder-build",
		companyId: "company-1",
		unit: "т",
		taskCount: 5,
		paymentType: "deferred",
		paymentMethod: "bank_transfer",
		deliveryCostType: "free",
		deliveryAddresses: ["г. Москва, ул. Складская, д. 15"],
		analoguesAllowed: true,
	},
	{
		id: "item-6",
		name: "Кирпич М150 рядовой",
		status: "awaiting_analytics",
		annualQuantity: 120000,
		currentPrice: 18,
		bestPrice: null,
		averagePrice: null,
		folderId: "folder-build",
		companyId: "company-1",
		unit: "шт",
		taskCount: 0,
	},
	{
		id: "item-7",
		name: "Песок карьерный",
		status: "searching",
		annualQuantity: 2500,
		currentPrice: 780,
		bestPrice: 820,
		averagePrice: 800,
		folderId: "folder-build",
		companyId: "company-1",
		unit: "т",
		taskCount: 2,
	},
	{
		id: "item-8",
		name: "Болт М12×80 оцинкованный",
		status: "completed",
		annualQuantity: 15000,
		currentPrice: 22,
		bestPrice: 19,
		averagePrice: 20,
		folderId: "folder-fasteners",
		companyId: "company-1",
		unit: "шт",
		taskCount: 0,
	},
	{
		id: "item-9",
		name: "Саморез по металлу 4.2×25",
		status: "searching",
		annualQuantity: 80000,
		currentPrice: 3.5,
		bestPrice: 3.2,
		averagePrice: 3.4,
		folderId: "folder-fasteners",
		companyId: "company-1",
		unit: "шт",
		taskCount: 1,
	},
	{
		id: "item-10",
		name: "Дюбель распорный 10×60",
		status: "negotiating",
		annualQuantity: 50000,
		currentPrice: 4.2,
		bestPrice: 3.9,
		averagePrice: 4.0,
		folderId: "folder-fasteners",
		companyId: "company-1",
		unit: "шт",
		taskCount: 4,
	},
	{
		id: "item-11",
		name: "Труба ПНД 32мм",
		status: "searching",
		annualQuantity: 1800,
		currentPrice: 95,
		bestPrice: 88,
		averagePrice: 91,
		folderId: "folder-plumbing",
		companyId: "company-1",
		unit: "м",
		taskCount: 2,
	},
	{
		id: "item-12",
		name: "Радиатор биметаллический 500",
		status: "awaiting_analytics",
		annualQuantity: 180,
		currentPrice: 3800,
		bestPrice: null,
		averagePrice: null,
		folderId: "folder-plumbing",
		companyId: "company-1",
		unit: "шт",
		taskCount: 0,
	},
	{
		id: "item-13",
		name: "Фитинг латунный ½″",
		status: "completed",
		annualQuantity: 900,
		currentPrice: 145,
		bestPrice: 128,
		averagePrice: 138,
		folderId: "folder-plumbing",
		companyId: "company-1",
		unit: "шт",
		taskCount: 1,
	},
	{
		id: "item-14",
		name: "Проволока вязальная 1.2мм",
		status: "searching",
		annualQuantity: 3200,
		currentPrice: 105,
		bestPrice: 98,
		averagePrice: 102,
		folderId: null,
		companyId: "company-1",
		unit: "кг",
		taskCount: 0,
	},
	{
		id: "item-15",
		name: "Уголок стальной 50×50×5",
		status: "negotiating",
		annualQuantity: 420,
		currentPrice: 58000,
		bestPrice: 54000,
		averagePrice: 56000,
		folderId: null,
		companyId: "company-1",
		unit: "т",
		taskCount: 2,
	},
];

const SEED_ARCHIVED: ProcurementItem[] = [
	{
		id: "item-archived-1",
		name: "Гвозди строительные 100",
		status: "completed",
		annualQuantity: 500,
		currentPrice: 120,
		bestPrice: 110,
		averagePrice: 115,
		folderId: null,
		companyId: "company-1",
		unit: "кг",
	},
	{
		id: "item-archived-2",
		name: "Сетка сварная 100×100",
		status: "completed",
		annualQuantity: 200,
		currentPrice: 320,
		bestPrice: 310,
		averagePrice: 315,
		folderId: "folder-build",
		companyId: "company-1",
		unit: "м²",
	},
];

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
			status: "awaiting_analytics" as ProcurementStatus,
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
			attachedFiles: input.attachedFiles,
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
