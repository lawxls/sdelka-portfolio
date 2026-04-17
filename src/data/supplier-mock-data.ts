import { ITEM as ITEM_2, SUPPLIERS as SUPPLIERS_2 } from "./items/item-2";
import { ITEM as ITEM_3, SUPPLIERS as SUPPLIERS_3 } from "./items/item-3";
import { ITEM as ITEM_4, SUPPLIERS as SUPPLIERS_4 } from "./items/item-4";
import { ITEM as ITEM_5, SUPPLIERS as SUPPLIERS_5 } from "./items/item-5";
import { ITEM as ITEM_6, SUPPLIERS as SUPPLIERS_6 } from "./items/item-6";
import { ITEM as ITEM_7, SUPPLIERS as SUPPLIERS_7 } from "./items/item-7";
import { ITEM as ITEM_8, SUPPLIERS as SUPPLIERS_8 } from "./items/item-8";
import { _patchItem } from "./items-mock-data";
import type { Supplier, SupplierChatMessage, SupplierFilterParams, SupplierSortField } from "./supplier-types";
import { filesToAttachments } from "./supplier-types";
import { ORMATEK_SUPPLIERS } from "./suppliers-ormatek";

const SUPPLIERS_BY_ITEM: Record<string, readonly Supplier[]> = {
	"item-1": ORMATEK_SUPPLIERS,
	[ITEM_2.id]: SUPPLIERS_2,
	[ITEM_3.id]: SUPPLIERS_3,
	[ITEM_4.id]: SUPPLIERS_4,
	[ITEM_5.id]: SUPPLIERS_5,
	[ITEM_6.id]: SUPPLIERS_6,
	[ITEM_7.id]: SUPPLIERS_7,
	[ITEM_8.id]: SUPPLIERS_8,
};

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
		const seed = SUPPLIERS_BY_ITEM[itemId] ?? [];
		suppliers = seed.map(cloneSupplier);
		store.set(itemId, suppliers);
	}
	return suppliers;
}

export function _resetSupplierStore() {
	store = new Map();
	sendShouldFail = false;
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
		result = result.filter((s) => s.companyName.toLowerCase().includes(q));
	}

	if (params?.statuses && params.statuses.length > 0) {
		const set = new Set(params.statuses);
		result = result.filter((s) => set.has(s.status));
	}

	result = params?.sort ? sortSuppliers(result, params.sort, params.dir ?? "asc") : defaultSortSuppliers(result);

	return result;
}

/** Default sort: "получено_кп" first, then TCO asc, then price/unit asc */
function defaultSortSuppliers(suppliers: Supplier[]): Supplier[] {
	const sorted = [...suppliers];
	sorted.sort((a, b) => {
		const aKP = a.status === "получено_кп" ? 0 : 1;
		const bKP = b.status === "получено_кп" ? 0 : 1;
		if (aKP !== bKP) return aKP - bKP;

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

	sorted.sort((a, b) => {
		if (field === "companyName") {
			return mul * a.companyName.localeCompare(b.companyName, "ru");
		}
		const va = a[field];
		const vb = b[field];
		// nulls always last regardless of direction
		if (va == null && vb == null) return 0;
		if (va == null) return 1;
		if (vb == null) return -1;
		return mul * (va - vb);
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

const DEFAULT_PAGE_SIZE = 30;

export async function getSuppliers(
	itemId: string,
	params?: SupplierFilterParams,
): Promise<{ suppliers: Supplier[]; nextCursor: string | null }> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const filtered = applySupplierFilters(suppliers, params);

	const limit = params?.limit ?? DEFAULT_PAGE_SIZE;
	const cursorIdx = params?.cursor ? filtered.findIndex((s) => s.id === params.cursor) : 0;
	const start = cursorIdx === -1 ? 0 : cursorIdx;
	const page = filtered.slice(start, start + limit);
	const nextCursor = start + limit < filtered.length ? filtered[start + limit].id : null;

	return { suppliers: page, nextCursor };
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

export async function selectSupplier(itemId: string, supplierId: string): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const supplier = suppliers.find((s) => s.id === supplierId);
	if (!supplier) throw new Error("Supplier not found");
	_patchItem(itemId, {
		currentSupplier: {
			companyName: supplier.companyName,
			paymentType: supplier.deferralDays > 0 ? "deferred" : "prepayment",
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
