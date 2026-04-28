import { batchCost } from "../../lib/math";
import { _getItem } from "../items-mock-data";
import type {
	Supplier,
	SupplierFilterParams,
	SupplierQuote,
	SupplierSortField,
	SupplierStatus,
} from "../supplier-types";
import { ALL_ITEM_IDS, getSuppliersForItem, listKnownItemIds, simulateDelay } from "./store";

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

// Supplier IDs embed their item: `supplier-item-<N>-<X>` for seeds,
// `candidate-supplier-item-<N>-<X>` for generated candidates. Parsing keeps
// `getSupplierById` from forcing candidate generation for every other item just
// to satisfy a deep link.
const SUPPLIER_ID_RE = /^(?:candidate-)?supplier-(item-\d+)-(?:\d+|current)$/;

export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
	await simulateDelay();
	const itemId = SUPPLIER_ID_RE.exec(supplierId)?.[1];
	if (!itemId) return null;
	return getSuppliersForItem(itemId).find((s) => s.id === supplierId) ?? null;
}

export async function getAllSuppliers(itemId: string): Promise<{ suppliers: Supplier[] }> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	return { suppliers };
}

export async function fetchAllSuppliersMock(): Promise<Supplier[]> {
	await simulateDelay();
	return listKnownItemIds().flatMap((itemId) => getSuppliersForItem(itemId).filter((s) => !s.archived));
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

/** Returns the supplier's `получено_кп` quotes across all items, keyed by item.
 * Used by the supplier drawer's «Предложения» tab. Suppliers are matched by INN
 * — the stable identity we enrich onto every seeded/generated supplier row.
 * Archived rows are excluded so the tab reflects active offers only.
 *
 * `contextItemId` (the item the drawer was opened from) sorts first so the
 * user sees the quote that matches their entry point at the top of the list. */
export async function getSupplierQuotesByInn(inn: string, contextItemId: string): Promise<SupplierQuote[]> {
	await simulateDelay();
	if (!inn) return [];
	const quotes: SupplierQuote[] = [];
	for (const itemId of ALL_ITEM_IDS) {
		const suppliers = getSuppliersForItem(itemId);
		const match = suppliers.find((s) => s.inn === inn && s.status === "получено_кп" && !s.archived);
		if (!match) continue;
		const item = _getItem(itemId);
		const isCurrentSupplier =
			item?.currentSupplier != null &&
			(item.currentSupplier.inn === inn ||
				(item.currentSupplier.inn == null && item.currentSupplier.companyName === match.companyName));

		const supplierBatch = item ? batchCost(match, item) : null;
		const currentBatch = item?.currentSupplier
			? batchCost({ pricePerUnit: item.currentSupplier.pricePerUnit }, item)
			: null;
		// Savings are only meaningful when comparing against a different incumbent.
		const canCompare = !isCurrentSupplier && supplierBatch != null && currentBatch != null;
		const savingsRub = canCompare ? (currentBatch as number) - (supplierBatch as number) : null;
		const savingsPct =
			canCompare && (currentBatch as number) > 0
				? (((currentBatch as number) - (supplierBatch as number)) / (currentBatch as number)) * 100
				: null;

		quotes.push({
			itemId,
			itemName: item?.name ?? itemId,
			pricePerUnit: match.pricePerUnit,
			tco: match.tco,
			deliveryCost: match.deliveryCost,
			deferralDays: match.deferralDays,
			paymentType: match.paymentType,
			prepaymentPercent: match.prepaymentPercent,
			leadTimeDays: match.leadTimeDays,
			quoteReceivedAt: match.quoteReceivedAt,
			documents: match.documents,
			isCurrentSupplier,
			batchCost: supplierBatch,
			savingsRub,
			savingsPct,
		});
	}
	quotes.sort((a, b) => {
		if (a.itemId === contextItemId) return -1;
		if (b.itemId === contextItemId) return 1;
		const ta = a.quoteReceivedAt ? Date.parse(a.quoteReceivedAt) : 0;
		const tb = b.quoteReceivedAt ? Date.parse(b.quoteReceivedAt) : 0;
		return tb - ta;
	});
	return quotes;
}
