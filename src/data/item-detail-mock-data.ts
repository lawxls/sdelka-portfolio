import type { CurrentSupplier, ProcurementItem } from "./types";

// --- Default mock item data ---

const MOCK_ITEMS: Record<string, ProcurementItem> = {
	"item-1": {
		id: "item-1",
		name: "Арматура А500С",
		status: "searching",
		annualQuantity: 1200,
		currentPrice: 4500,
		bestPrice: 3800,
		averagePrice: 4100,
		folderId: null,
		companyId: "company-1",
		unit: "т",
		frequencyCount: 2,
		frequencyPeriod: "quarter",
		paymentType: "deferred",
		paymentDeferralDays: 30,
		paymentMethod: "bank_transfer",
		deliveryType: "warehouse",
		deliveryAddresses: ["г. Москва, ул. Складская, д. 15"],
		unloading: "supplier",
		analoguesAllowed: true,
		additionalInfo: "Требуется сертификат соответствия ГОСТ",
		priceMonitoringPeriod: "quarter",
		currentSupplier: {
			companyName: "МеталлТрейд",
			deliveryCost: 0,
			deferralDays: 30,
			pricePerUnit: 4500,
			tco: 5400000,
		},
	},
	"item-2": {
		id: "item-2",
		name: "Труба профильная 40×20",
		status: "negotiating",
		annualQuantity: 500,
		currentPrice: 8200,
		bestPrice: 7500,
		averagePrice: 7900,
		folderId: "folder-1",
		companyId: "company-1",
		unit: "м",
		frequencyCount: 1,
		frequencyPeriod: "month",
		paymentType: "prepayment",
		paymentMethod: "bank_transfer",
		deliveryType: "pickup",
		analoguesAllowed: false,
		priceMonitoringPeriod: "half_year",
		taskCount: 3,
		currentSupplier: {
			companyName: "ТрубоСталь",
			deliveryCost: 1500,
			deferralDays: 14,
			pricePerUnit: 8200,
			tco: 4100000,
		},
	},
};

const DEFAULT_CURRENT_SUPPLIER: CurrentSupplier = {
	companyName: "МеталлТрейд",
	deliveryCost: 0,
	deferralDays: 30,
	pricePerUnit: 4500,
	tco: 5400000,
};

// --- Mutable store (lazily populated per item) ---

let store: Map<string, ProcurementItem> = new Map(Object.entries(MOCK_ITEMS));

/** Seed the store with an item fetched from the API so detail/edit works. */
export function seedItemDetail(item: ProcurementItem) {
	if (!store.has(item.id))
		store.set(item.id, {
			...item,
			currentSupplier: item.currentSupplier ?? DEFAULT_CURRENT_SUPPLIER,
		});
}

export function _resetItemDetailStore() {
	store = new Map(Object.entries(MOCK_ITEMS));
}

// --- Configurable delay ---

let delayConfig = { min: 300, max: 500 };

export function _setItemDetailMockDelay(min: number, max: number) {
	delayConfig = { min, max };
}

function simulateDelay(): Promise<void> {
	const ms = delayConfig.min + Math.floor(Math.random() * (delayConfig.max - delayConfig.min + 1));
	if (ms <= 0) return Promise.resolve();
	return new Promise((r) => setTimeout(r, ms));
}

// --- Mock API functions ---

export async function getItemDetail(id: string): Promise<ProcurementItem | null> {
	await simulateDelay();
	return store.get(id) ?? null;
}

/** Directly update item's currentSupplier in the mock store (no delay). */
export function setItemCurrentSupplier(itemId: string, currentSupplier: CurrentSupplier): void {
	const item = store.get(itemId);
	if (!item) return;
	store.set(itemId, { ...item, currentSupplier });
}

export async function updateItemDetail(
	id: string,
	data: Partial<Omit<ProcurementItem, "id" | "status" | "bestPrice" | "averagePrice" | "companyId">>,
): Promise<ProcurementItem> {
	await simulateDelay();
	const existing = store.get(id);
	if (!existing) throw new Error(`Item ${id} not found`);
	const updated = { ...existing, ...data };
	store.set(id, updated);
	return updated;
}
