import { ITEM as ITEM_2, SUPPLIERS as SUPPLIERS_2 } from "../items/item-2";
import { ITEM as ITEM_3, SUPPLIERS as SUPPLIERS_3 } from "../items/item-3";
import { ITEM as ITEM_4, SUPPLIERS as SUPPLIERS_4 } from "../items/item-4";
import { ITEM as ITEM_5, SUPPLIERS as SUPPLIERS_5 } from "../items/item-5";
import { ITEM as ITEM_6, SUPPLIERS as SUPPLIERS_6 } from "../items/item-6";
import { ITEM as ITEM_7, SUPPLIERS as SUPPLIERS_7 } from "../items/item-7";
import { ITEM as ITEM_8, SUPPLIERS as SUPPLIERS_8 } from "../items/item-8";
import { SUPPLIERS as SUPPLIERS_9 } from "../items/item-9";
import { ITEM as ITEM_10, SUPPLIERS as SUPPLIERS_10 } from "../items/item-10";
import { ITEM as ITEM_11, SUPPLIERS as SUPPLIERS_11 } from "../items/item-11";
import { ITEM as ITEM_12, SUPPLIERS as SUPPLIERS_12 } from "../items/item-12";
import { _getItem } from "../items-mock-data";
import { ORMATEK_SUPPLIERS } from "../seeds/suppliers-ormatek";
import type { Supplier, SupplierSeed } from "../supplier-types";
import {
	enrichSeed,
	generateCandidates,
	hash,
	inferCompanyType,
	makeIdentityProfile,
	makeQuoteReceivedAt,
	targetSupplierCount,
} from "./enrichment";

const SUPPLIERS_BY_ITEM: Record<string, readonly SupplierSeed[]> = {
	"item-1": ORMATEK_SUPPLIERS,
	[ITEM_2.id]: SUPPLIERS_2,
	[ITEM_3.id]: SUPPLIERS_3,
	[ITEM_4.id]: SUPPLIERS_4,
	[ITEM_5.id]: SUPPLIERS_5,
	[ITEM_6.id]: SUPPLIERS_6,
	[ITEM_7.id]: SUPPLIERS_7,
	[ITEM_8.id]: SUPPLIERS_8,
	"item-9": SUPPLIERS_9,
	[ITEM_10.id]: SUPPLIERS_10,
	[ITEM_11.id]: SUPPLIERS_11,
	[ITEM_12.id]: SUPPLIERS_12,
};

export const ALL_ITEM_IDS: readonly string[] = Object.keys(SUPPLIERS_BY_ITEM);

// --- Mutable store (lazily populated per item) ---

let store: Map<string, Supplier[]> = new Map();
/** Suppliers attached to an inquiry without a specific item — added through
 * «Добавить поставщика» from the consolidated suppliers tab. */
let inquiryStore: Map<string, Supplier[]> = new Map();
let sendShouldFail = false;

function cloneSupplier(s: Supplier): Supplier {
	// chatHistory gets .push()'d in sendSupplierMessage; individual messages are immutable.
	return { ...s, chatHistory: [...s.chatHistory] };
}

function computeCandidateCount(itemId: string, seedCount: number): number {
	const target = targetSupplierCount(itemId);
	return Math.max(0, target - seedCount);
}

export function getSuppliersForItem(itemId: string): Supplier[] {
	let suppliers = store.get(itemId);
	if (!suppliers) {
		const seed = SUPPLIERS_BY_ITEM[itemId];
		if (!seed) {
			store.set(itemId, []);
			return [];
		}
		const enriched = seed.map(enrichSeed).map(cloneSupplier);
		const candidates = generateCandidates(itemId, computeCandidateCount(itemId, enriched.length));
		const yours = makeYourSupplier(itemId);
		suppliers = yours ? [yours, ...enriched, ...candidates] : [...enriched, ...candidates];
		store.set(itemId, suppliers);
	}
	return suppliers;
}

/** Direct write-side accessor for mutations. Replaces the per-item supplier list
 * in the live store. Mutations are responsible for cloning if they need to. */
export function writeSuppliersForItem(itemId: string, suppliers: Supplier[]): void {
	store.set(itemId, suppliers);
}

/** Read inquiry-scoped suppliers (added via «Добавить поставщика» without an item). */
export function getSuppliersForInquiry(procurementInquiryId: string): Supplier[] {
	return inquiryStore.get(procurementInquiryId) ?? [];
}

export function writeSuppliersForInquiry(procurementInquiryId: string, suppliers: Supplier[]): void {
	inquiryStore.set(procurementInquiryId, suppliers);
}

export function listKnownInquiryIds(): string[] {
	return [...inquiryStore.keys()];
}

/** Append a new inquiry-scoped supplier. Returns the freshly-created row. */
export function appendInquirySupplier(procurementInquiryId: string, supplier: Supplier): Supplier {
	const existing = getSuppliersForInquiry(procurementInquiryId);
	writeSuppliersForInquiry(procurementInquiryId, [...existing, supplier]);
	return supplier;
}

/** Returns the union of seeded item IDs and any items the store has lazily
 * populated (used by `fetchAllSuppliersMock` to enumerate every known item). */
export function listKnownItemIds(): string[] {
	const itemIds = new Set<string>([...Object.keys(SUPPLIERS_BY_ITEM), ...store.keys()]);
	return [...itemIds];
}

/** Build a quote_received Supplier row that mirrors the item's `currentSupplier`
 * (the «Ваш поставщик»). INN/companyName come from currentSupplier verbatim; profile
 * fields (region/revenue/etc.) are deterministically derived from the INN so the row
 * looks like a real legal entity. Returns null when the item has no currentSupplier,
 * no INN, or no usable price. */
function makeYourSupplier(itemId: string): Supplier | null {
	const item = _getItem(itemId);
	if (!item) return null;
	const cs = item.currentSupplier;
	if (!cs?.inn) return null;
	// Prefer the item's own buyer reference price so «Ваш поставщик» reflects per-position spread.
	// Items with currentPrice null/0 fall back to the supplier-attached price.
	const perItemPrice = item.currentPrice != null && item.currentPrice > 0 ? item.currentPrice : cs.pricePerUnit;
	if (perItemPrice == null || perItemPrice <= 0) return null;
	const identityHash = hash(cs.inn);
	const profile = makeIdentityProfile(identityHash);
	const perRowHash = hash(`${itemId}:current`);
	const slug = `current-${itemId}`;
	const domain = `${slug}.ru`;
	return {
		id: yourSupplierId(itemId),
		itemId,
		procurementInquiryId: item.procurementInquiryId ?? "",
		companyName: cs.companyName,
		status: "quote_received",
		archived: false,
		...profile,
		// Override the hash-derived INN with the one the user actually entered.
		inn: cs.inn,
		companyType: inferCompanyType(cs.companyName),
		email: cs.email && cs.email.trim() !== "" ? cs.email : `info@${domain}`,
		website: cs.website && cs.website.trim() !== "" ? cs.website : `https://${domain}`,
		address: cs.address && cs.address.trim() !== "" ? cs.address : profile.address,
		pricePerUnit: perItemPrice,
		tco: perItemPrice + (cs.deliveryCost ?? 0),
		deliveryCost: cs.deliveryCost ?? null,
		paymentType: cs.paymentType ?? "prepayment",
		deferralDays: cs.deferralDays,
		prepaymentPercent: cs.prepaymentPercent,
		leadTimeDays: cs.leadTimeDays ?? null,
		agentComment: "",
		documents: [],
		chatHistory: [],
		quoteReceivedAt: makeQuoteReceivedAt(perRowHash),
	};
}

function yourSupplierId(itemId: string): string {
	// Format keeps the `supplier-<itemId>-<x>` shape that SUPPLIER_ID_RE expects so deep-link lookups
	// via getSupplierById work without special-casing.
	return `supplier-${itemId}-current`;
}

/** Add, replace, or remove the item's «Ваш поставщик» row to match the current
 * `item.currentSupplier`. Called when items are created or when `currentSupplier`
 * is updated. Idempotent. */
export function _addYourSupplier(itemId: string): void {
	const yours = makeYourSupplier(itemId);
	const existing = store.get(itemId);
	const yoursId = yourSupplierId(itemId);
	if (!yours) {
		if (!existing) return;
		const filtered = existing.filter((s) => s.id !== yoursId);
		if (filtered.length !== existing.length) store.set(itemId, filtered);
		return;
	}
	const base = existing ?? [];
	const filtered = base.filter((s) => s.id !== yoursId);
	store.set(itemId, [yours, ...filtered]);
}

export function _resetSupplierStore() {
	store = new Map();
	inquiryStore = new Map();
	sendShouldFail = false;
}

export function _setSuppliersForItem(itemId: string, seeds: readonly SupplierSeed[]) {
	const enriched = seeds.map(enrichSeed).map(cloneSupplier);
	const candidates = generateCandidates(itemId, computeCandidateCount(itemId, enriched.length));
	const yours = makeYourSupplier(itemId);
	store.set(itemId, yours ? [yours, ...enriched, ...candidates] : [...enriched, ...candidates]);
}

export function _setSendShouldFail(fail: boolean) {
	sendShouldFail = fail;
}

export function getSendShouldFail(): boolean {
	return sendShouldFail;
}

// --- Configurable delay for tests ---

let delayConfig = { min: 300, max: 500 };

export function _setSupplierMockDelay(min: number, max: number) {
	delayConfig = { min, max };
}

export function simulateDelay(): Promise<void> {
	const ms = delayConfig.min + Math.floor(Math.random() * (delayConfig.max - delayConfig.min + 1));
	if (ms <= 0) return Promise.resolve();
	return new Promise((r) => setTimeout(r, ms));
}
