import type {
	CreateItemsResult,
	CursorPage,
	ExportItemsParams,
	ListItemsParams,
	NewItemInput,
	ProcurementItem,
	SortDirection,
	SortField,
	Totals,
	TotalsParams,
	UpdateItemData,
} from "../domains/items";
import { NotFoundError } from "../errors";
import { _getAllItems, _getItem, _inquiryState, _isArchived, _patchItem, _setItems } from "../items-mock-data";
import { delay, nextId, paginate } from "../mock-utils";
import { _addYourSupplier } from "../supplier-mock-data";
import { getAnnualCost, getDeviation, getDisplayStatus, getOverpayment, type ProcurementStatus } from "../types";
import type { ItemsClient } from "./items-client";

function effectiveFolderId(item: ProcurementItem): string | null {
	return item.folderId ?? _inquiryState(item.procurementInquiryId)?.folderId ?? null;
}

function effectiveCompanyId(item: ProcurementItem): string | null {
	return item.companyId ?? _inquiryState(item.procurementInquiryId)?.companyId ?? null;
}

function isEffectivelyArchived(item: ProcurementItem, itemArchived: boolean): boolean {
	if (itemArchived) return true;
	return _inquiryState(item.procurementInquiryId)?.isArchived ?? false;
}

function matchesFolder(item: ProcurementItem, folder: string | undefined, archived: boolean): boolean {
	if (folder === "archive") return archived;
	if (archived) return false;
	if (folder === undefined || folder === "all") return true;
	// Mirrors the backend Coalesce semantics in `ProcurementItemFilter.filter_folder`.
	const folderId = effectiveFolderId(item);
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

function applyFilters(items: ProcurementItem[], params: ListItemsParams): ProcurementItem[] {
	const q = params.q?.trim().toLowerCase();
	return items.filter((item) => {
		const archived = isEffectivelyArchived(item, _isArchived(item.id));
		if (!matchesFolder(item, params.folder, archived)) return false;
		if (params.company && effectiveCompanyId(item) !== params.company) return false;
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

export interface InMemoryItemsOptions {
	/** Replace the module-level mock store with these items at construction time.
	 * Used by tests to seed without reaching into `_setItems` directly. */
	seed?: ProcurementItem[];
	/** Archived ids paired with `seed`. Defaults to []. */
	archived?: string[];
}

/**
 * Build an in-memory items adapter wrapping the module-level mock store
 * (`items-mock-data`). All clients share that singleton, so cross-entity
 * callers (supplier-mock-data, folders-mock-data) see the same state the hook
 * sees. Passing `seed` resets the singleton so a test can land in a
 * deterministic state without touching `_setItems` directly.
 */
export function createInMemoryItemsClient(options?: InMemoryItemsOptions): ItemsClient {
	if (options?.seed !== undefined) {
		_setItems(options.seed, options.archived ?? []);
	}

	return {
		async list(params: ListItemsParams): Promise<CursorPage<ProcurementItem>> {
			await delay();
			let filtered = applyFilters(_getAllItems(), params);
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
		},

		async listAll(): Promise<ProcurementItem[]> {
			await delay();
			return _getAllItems().filter((i) => !isEffectivelyArchived(i, _isArchived(i.id)));
		},

		async totals(params: TotalsParams): Promise<Totals> {
			await delay();
			const filtered = applyFilters(_getAllItems(), params as ListItemsParams);
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
		},

		async get(id: string): Promise<ProcurementItem> {
			await delay();
			const item = _getItem(id);
			if (!item) throw new NotFoundError({ id });
			return item;
		},

		async create(inputs: NewItemInput[]): Promise<CreateItemsResult> {
			await delay();
			const created: ProcurementItem[] = inputs.map((input) => ({
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
				procurementInquiryId: input.procurementInquiryId,
				companyId: input.procurementInquiryId ? undefined : input.companyId,
				folderId: input.folderId ?? undefined,
			}));
			const current = _getAllItems();
			const archivedNow = current.filter((c) => _isArchived(c.id)).map((c) => c.id);
			_setItems([...created, ...current], archivedNow);
			for (const item of created) _addYourSupplier(item.id);
			return { items: created, isAsync: false };
		},

		async update(id: string, data: UpdateItemData): Promise<ProcurementItem> {
			await delay();
			const updated = _patchItem(id, data);
			if (!updated) throw new NotFoundError({ id });
			if ("currentSupplier" in data) _addYourSupplier(id);
			return updated;
		},

		async delete(id: string): Promise<void> {
			await delay();
			const remaining = _getAllItems().filter((i) => i.id !== id);
			const archivedRemaining = remaining.filter((c) => _isArchived(c.id)).map((c) => c.id);
			_setItems(remaining, archivedRemaining);
		},

		async archive(id: string, isArchived: boolean): Promise<ProcurementItem> {
			await delay();
			const wasArchived = _isArchived(id);
			if (wasArchived !== isArchived) {
				const current = _getAllItems();
				const archivedSet = new Set(current.filter((c) => _isArchived(c.id)).map((c) => c.id));
				if (isArchived) archivedSet.add(id);
				else archivedSet.delete(id);
				_setItems(current, Array.from(archivedSet));
			}
			const item = _getItem(id);
			if (!item) throw new NotFoundError({ id });
			return item;
		},

		async export(params: ExportItemsParams): Promise<{ blob: Blob; filename: string }> {
			await delay();
			const filtered = applyFilters(_getAllItems(), params as ListItemsParams);
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
		},
	};
}
