import { ITEM as ITEM_2, SUPPLIERS as SUPPLIERS_2 } from "./items/item-2";
import { ITEM as ITEM_3, SUPPLIERS as SUPPLIERS_3 } from "./items/item-3";
import { ITEM as ITEM_4, SUPPLIERS as SUPPLIERS_4 } from "./items/item-4";
import { ITEM as ITEM_5, SUPPLIERS as SUPPLIERS_5 } from "./items/item-5";
import { ITEM as ITEM_6, SUPPLIERS as SUPPLIERS_6 } from "./items/item-6";
import { ITEM as ITEM_7, SUPPLIERS as SUPPLIERS_7 } from "./items/item-7";
import { ITEM as ITEM_8, SUPPLIERS as SUPPLIERS_8 } from "./items/item-8";
import { _patchItem } from "./items-mock-data";
import type {
	Supplier,
	SupplierChatMessage,
	SupplierCompanyType,
	SupplierFilterParams,
	SupplierSeed,
	SupplierSortField,
	SupplierStatus,
} from "./supplier-types";
import { filesToAttachments } from "./supplier-types";
import { ORMATEK_SUPPLIERS } from "./suppliers-ormatek";

const SUPPLIERS_BY_ITEM: Record<string, readonly SupplierSeed[]> = {
	"item-1": ORMATEK_SUPPLIERS,
	[ITEM_2.id]: SUPPLIERS_2,
	[ITEM_3.id]: SUPPLIERS_3,
	[ITEM_4.id]: SUPPLIERS_4,
	[ITEM_5.id]: SUPPLIERS_5,
	[ITEM_6.id]: SUPPLIERS_6,
	[ITEM_7.id]: SUPPLIERS_7,
	[ITEM_8.id]: SUPPLIERS_8,
};

// --- Deterministic profile enrichment (inn / region / companyType / foundedYear / revenue) ---

const REGIONS = [
	"Москва",
	"Санкт-Петербург",
	"Свердловская область",
	"Челябинская область",
	"Новосибирская область",
	"Республика Татарстан",
	"Нижегородская область",
	"Ростовская область",
	"Самарская область",
	"Краснодарский край",
	"Воронежская область",
	"Пермский край",
	"Красноярский край",
	"Тульская область",
	"Ленинградская область",
];

const REVENUE_TIERS = [10_000_000, 45_000_000, 120_000_000, 350_000_000, 900_000_000, 1_800_000_000, 5_000_000_000];

function hash(s: string): number {
	let h = 0;
	for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
	return Math.abs(h);
}

function makeInn(seed: number): string {
	const base = ((seed + 1) * 2_654_435_761) % 10_000_000_000;
	return base.toString().padStart(10, "0");
}

function inferCompanyType(companyName: string): SupplierCompanyType {
	const lower = companyName.toLowerCase();
	if (lower.includes("тд") || lower.includes("торг") || lower.includes("трейд") || lower.includes("снаб")) {
		return "дистрибьютор";
	}
	return hash(companyName) % 3 === 0 ? "дистрибьютор" : "производитель";
}

function enrichSeed(seed: SupplierSeed): Supplier {
	const h = hash(`${seed.itemId}:${seed.id}`);
	return {
		...seed,
		inn: makeInn(h),
		companyType: inferCompanyType(seed.companyName),
		region: REGIONS[h % REGIONS.length],
		foundedYear: 1992 + (h % 30),
		revenue: REVENUE_TIERS[h % REVENUE_TIERS.length],
	};
}

// --- Candidate ("new"-status) generation ---

const CANDIDATE_POOL: { name: string; type: SupplierCompanyType; domain: string }[] = [
	{ name: "ООО «СтальПром»", type: "производитель", domain: "stalprom.ru" },
	{ name: "ЗАО «МеталлИнвест»", type: "производитель", domain: "metallinvest.ru" },
	{ name: "ООО «Восток-Металл»", type: "производитель", domain: "vostok-metall.ru" },
	{ name: "ООО «УралСтальКомплект»", type: "производитель", domain: "uralstal.ru" },
	{ name: "ЗАО «Северсталь-Трейд»", type: "дистрибьютор", domain: "severstal-trade.ru" },
	{ name: "ООО «ПромСнаб-Поволжье»", type: "дистрибьютор", domain: "promsnab-povolzhe.ru" },
	{ name: "ООО «ТоргСнабМеталл»", type: "дистрибьютор", domain: "torgsnab-metall.ru" },
	{ name: "ООО «ГлавМетКом»", type: "дистрибьютор", domain: "glavmetkom.ru" },
	{ name: "ООО «Металл-Экспресс»", type: "производитель", domain: "metall-express.ru" },
	{ name: "ИП Соловьёв М.А.", type: "производитель", domain: "solovev-metal.ru" },
	{ name: "ООО «ПрофильТорг»", type: "производитель", domain: "profiltorg.ru" },
	{ name: "ООО «СибМетКомплект»", type: "производитель", domain: "sibmetcomplekt.ru" },
	{ name: "ООО «АрматураЦентр»", type: "производитель", domain: "armaturacentr.ru" },
	{ name: "ООО «МеталлСтандарт»", type: "производитель", domain: "metallstandart.ru" },
	{ name: "ООО «СтройМетКомплект»", type: "дистрибьютор", domain: "stroymetcomplekt.ru" },
	{ name: "ЗАО «ПромСталь»", type: "производитель", domain: "promstal.ru" },
];

const CANDIDATES_PER_ITEM = 15;

function generateCandidates(itemId: string): Supplier[] {
	const seed = hash(itemId);
	return Array.from({ length: CANDIDATES_PER_ITEM }, (_, i) => {
		const pool = CANDIDATE_POOL[(seed + i * 7) % CANDIDATE_POOL.length];
		const h = hash(`${itemId}:candidate:${i}`);
		// One pre-archived (i=7) and one "ошибка"-status (i=11) for demo coverage.
		const status: SupplierStatus = i === 11 ? "ошибка" : "new";
		return {
			id: `candidate-supplier-${itemId}-${i + 1}`,
			itemId,
			companyName: pool.name,
			status,
			archived: i === 7,
			inn: makeInn(h),
			companyType: pool.type,
			region: REGIONS[h % REGIONS.length],
			foundedYear: 1992 + (h % 30),
			revenue: REVENUE_TIERS[h % REVENUE_TIERS.length],
			email: `info@${pool.domain}`,
			website: `https://${pool.domain}`,
			address: "",
			pricePerUnit: null,
			tco: null,
			rating: null,
			deliveryCost: null,
			paymentType: "prepayment" as const,
			deferralDays: 0,
			leadTimeDays: null,
			aiDescription: "",
			aiRecommendations: "",
			documents: [],
			chatHistory: [],
			positionOffers: [],
		};
	});
}

// --- Mutable store (lazily populated per item) ---

let store: Map<string, Supplier[]> = new Map();
let sendShouldFail = false;

function cloneSupplier(s: Supplier): Supplier {
	// chatHistory gets .push()'d in sendSupplierMessage; individual messages are immutable.
	return { ...s, chatHistory: [...s.chatHistory] };
}

function getSuppliersForItem(itemId: string): Supplier[] {
	let suppliers = store.get(itemId);
	if (!suppliers) {
		const seed = SUPPLIERS_BY_ITEM[itemId];
		if (!seed) {
			store.set(itemId, []);
			return [];
		}
		const enriched = seed.map(enrichSeed).map(cloneSupplier);
		const candidates = generateCandidates(itemId);
		suppliers = [...enriched, ...candidates];
		store.set(itemId, suppliers);
	}
	return suppliers;
}

export function _resetSupplierStore() {
	store = new Map();
	sendShouldFail = false;
}

export function _setSuppliersForItem(itemId: string, seeds: readonly SupplierSeed[]) {
	const enriched = seeds.map(enrichSeed).map(cloneSupplier);
	const candidates = generateCandidates(itemId);
	store.set(itemId, [...enriched, ...candidates]);
}

export function _setSendShouldFail(fail: boolean) {
	sendShouldFail = fail;
}

// --- Configurable delay for tests ---

let delayConfig = { min: 300, max: 500 };

export function _setSupplierMockDelay(min: number, max: number) {
	delayConfig = { min, max };
}

function simulateDelay(): Promise<void> {
	const ms = delayConfig.min + Math.floor(Math.random() * (delayConfig.max - delayConfig.min + 1));
	if (ms <= 0) return Promise.resolve();
	return new Promise((r) => setTimeout(r, ms));
}

// --- Filtering & sorting ---

function applySupplierFilters(suppliers: Supplier[], params?: SupplierFilterParams): Supplier[] {
	let result = suppliers;

	if (!params?.showArchived) {
		result = result.filter((s) => !s.archived);
	}

	if (params?.search) {
		const q = params.search.toLowerCase();
		const innQ = params.search;
		result = result.filter((s) => s.companyName.toLowerCase().includes(q) || s.inn.includes(innQ));
	}

	if (params?.statuses && params.statuses.length > 0) {
		const set = new Set(params.statuses);
		result = result.filter((s) => set.has(s.status));
	}

	if (params?.companyTypes && params.companyTypes.length > 0) {
		const set = new Set(params.companyTypes);
		result = result.filter((s) => set.has(s.companyType));
	}

	result = params?.sort ? sortSuppliers(result, params.sort, params.dir ?? "asc") : defaultSortSuppliers(result);

	return result;
}

/** Default sort: "получено_кп" first, then TCO asc, then price/unit asc */
// Rank by status so received КП surfaces first in the Предложения tab, and
// candidates (new) surface first in the Поставщики pipeline tab (получено_кп is filtered out there).
const STATUS_RANK: Record<SupplierStatus, number> = {
	получено_кп: 0,
	new: 1,
	кп_запрошено: 2,
	переговоры: 3,
	отказ: 4,
	ошибка: 5,
};

function defaultSortSuppliers(suppliers: Supplier[]): Supplier[] {
	const sorted = [...suppliers];
	sorted.sort((a, b) => {
		const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
		if (rank !== 0) return rank;

		// nulls last
		if (a.tco != null && b.tco != null) {
			if (a.tco !== b.tco) return a.tco - b.tco;
		} else if (a.tco != null) return -1;
		else if (b.tco != null) return 1;

		if (a.pricePerUnit != null && b.pricePerUnit != null) {
			return a.pricePerUnit - b.pricePerUnit;
		}
		if (a.pricePerUnit != null) return -1;
		if (b.pricePerUnit != null) return 1;
		return 0;
	});
	return sorted;
}

function sortSuppliers(suppliers: Supplier[], field: SupplierSortField, dir: "asc" | "desc"): Supplier[] {
	const sorted = [...suppliers];
	const mul = dir === "asc" ? 1 : -1;

	// `batchCost` and `savings` are ranked by `pricePerUnit` since `quantityPerDelivery`
	// (and the current-supplier price for savings) are constants for a single item.
	// Lower price → larger savings, so savings flips the direction.
	const dataField: keyof Supplier =
		field === "batchCost" || field === "savings"
			? "pricePerUnit"
			: field === "leadTimeDays"
				? "leadTimeDays"
				: field === "tco"
					? "tco"
					: field === "foundedYear"
						? "foundedYear"
						: field === "revenue"
							? "revenue"
							: "companyName";
	const effectiveMul = field === "savings" ? -mul : mul;

	sorted.sort((a, b) => {
		if (dataField === "companyName") {
			return effectiveMul * a.companyName.localeCompare(b.companyName, "ru");
		}
		const va = a[dataField] as number | null;
		const vb = b[dataField] as number | null;
		if (va == null && vb == null) return 0;
		if (va == null) return 1;
		if (vb == null) return -1;
		return effectiveMul * (va - vb);
	});

	return sorted;
}

// --- Mock API functions ---

export async function getSupplier(itemId: string, supplierId: string): Promise<Supplier | null> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	return suppliers.find((s) => s.id === supplierId) ?? null;
}

export async function getAllSuppliers(itemId: string): Promise<{ suppliers: Supplier[] }> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	return { suppliers };
}

export async function fetchAllSuppliersMock(): Promise<Supplier[]> {
	await simulateDelay();
	const itemIds = new Set<string>([...Object.keys(SUPPLIERS_BY_ITEM), ...store.keys()]);
	return [...itemIds].flatMap((itemId) => getSuppliersForItem(itemId).filter((s) => !s.archived));
}

const DEFAULT_PAGE_SIZE = 30;

export async function getSuppliers(
	itemId: string,
	params?: SupplierFilterParams,
): Promise<{ suppliers: Supplier[]; nextCursor: string | null; total: number }> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const filtered = applySupplierFilters(suppliers, params);

	const limit = params?.limit ?? DEFAULT_PAGE_SIZE;
	const cursorIdx = params?.cursor ? filtered.findIndex((s) => s.id === params.cursor) : 0;
	const start = cursorIdx === -1 ? 0 : cursorIdx;
	const page = filtered.slice(start, start + limit);
	const nextCursor = start + limit < filtered.length ? filtered[start + limit].id : null;

	return { suppliers: page, nextCursor, total: filtered.length };
}

export async function deleteSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const idsToDelete = new Set(supplierIds);
	const remaining = suppliers.filter((s) => !idsToDelete.has(s.id));
	store.set(itemId, remaining);
}

export async function archiveSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const idsToArchive = new Set(supplierIds);
	store.set(
		itemId,
		suppliers.map((s) => (idsToArchive.has(s.id) ? { ...s, archived: true } : s)),
	);
}

export async function unarchiveSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const ids = new Set(supplierIds);
	store.set(
		itemId,
		suppliers.map((s) => (ids.has(s.id) ? { ...s, archived: false } : s)),
	);
}

/** Transitions eligible (status="new") suppliers to "кп_запрошено".
 * Returns ids actually transitioned (already-requested ones are skipped). */
export async function sendSupplierRequest(itemId: string, supplierIds: string[]): Promise<string[]> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const ids = new Set(supplierIds);
	const transitioned: string[] = [];
	const next = suppliers.map((s) => {
		if (!ids.has(s.id) || s.status !== "new") return s;
		transitioned.push(s.id);
		return { ...s, status: "кп_запрошено" as const };
	});
	store.set(itemId, next);
	return transitioned;
}

export async function selectSupplier(itemId: string, supplierId: string): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const supplier = suppliers.find((s) => s.id === supplierId);
	if (!supplier) throw new Error("Supplier not found");
	_patchItem(itemId, {
		currentSupplier: {
			companyName: supplier.companyName,
			paymentType: supplier.paymentType,
			deferralDays: supplier.deferralDays,
			pricePerUnit: supplier.pricePerUnit,
		},
	});
}

export async function sendSupplierMessage(
	itemId: string,
	supplierId: string,
	body: string,
	files?: File[],
): Promise<SupplierChatMessage> {
	await simulateDelay();
	if (sendShouldFail) throw new Error("Не удалось отправить сообщение");
	const suppliers = getSuppliersForItem(itemId);
	const supplier = suppliers.find((s) => s.id === supplierId);
	if (!supplier) throw new Error("Supplier not found");

	const attachments = files && files.length > 0 ? filesToAttachments(files) : undefined;

	const message: SupplierChatMessage = {
		sender: "Агент",
		timestamp: new Date().toISOString(),
		body,
		isOurs: true,
		attachments,
	};
	supplier.chatHistory.push(message);
	return message;
}
