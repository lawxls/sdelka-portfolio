import type { ItemsClient } from "../clients/items-client";
import type { ProcurementInquiriesClient } from "../clients/procurement-inquiries-client";
import type { SuppliersClient } from "../clients/suppliers-client";
import type {
	CreateProcurementInquiryInput,
	CreateProcurementInquiryItemInput,
} from "../domains/procurement-inquiries";
import { NotFoundError, ValidationError } from "../errors";
import type { NewItemInput, ProcurementInquiry, ProcurementItem } from "../types";

/**
 * Single public seam for cross-entity domain rules in the procurement
 * subsystem. Lower-level domain clients (suppliers, items, inquiries) know
 * about their own entity only; anything that mutates state across two of
 * them lives here.
 *
 * Inhabitants today: `selectSupplierForItem` and `setCurrentSupplierFromQuote`.
 * Both write the item's `currentSupplier` (the «Ваш поставщик» context now
 * lives per-position). Out-of-scope cross-entity rules still living in mocks
 * are documented in CONTEXT.md ("Procurement operation"); each migrates here
 * when its hook does.
 */
export interface ProcurementOperationsContext {
	items: ItemsClient;
	suppliers: SuppliersClient;
	procurementInquiries: ProcurementInquiriesClient;
}

/**
 * Promote the supplier (looked up by id within the item's per-item list) to
 * the item's current supplier. Writes companyName, paymentType, deferralDays,
 * and pricePerUnit. INN is intentionally omitted — this codepath is used when
 * the user picks a candidate from the per-item suppliers table where the INN
 * may not yet be confirmed.
 *
 * Throws NotFoundError when the supplier id doesn't match a row in the
 * per-item list.
 */
export async function selectSupplierForItem(
	itemId: string,
	supplierId: string,
	{ items, suppliers }: ProcurementOperationsContext,
): Promise<void> {
	const supplier = await suppliers.get(itemId, supplierId);
	if (!supplier) throw new NotFoundError({ itemId, supplierId });
	await items.update(itemId, {
		currentSupplier: {
			companyName: supplier.companyName,
			paymentType: supplier.paymentType,
			deferralDays: supplier.deferralDays,
			pricePerUnit: supplier.pricePerUnit,
		},
	});
}

/**
 * Promote the matching-INN supplier (within the item's per-item list) to the
 * item's current supplier and snap the item's `currentPrice` to its TCO so
 * «ТЕКУЩЕЕ ТСО» refreshes on the item row. Used by the supplier drawer's
 * «Предложения» tab when the user picks a quote — the quote carries an INN,
 * so id-by-id lookup isn't usable. Archived rows are skipped.
 */
export async function setCurrentSupplierFromQuote(
	itemId: string,
	inn: string,
	{ items, suppliers }: ProcurementOperationsContext,
): Promise<void> {
	const item = await items.get(itemId);
	const { suppliers: list } = await suppliers.listForItem(itemId);
	const supplier = list.find((s) => s.inn === inn && !s.archived);
	if (!supplier) throw new NotFoundError({ itemId, inn });
	const tco = supplier.tco ?? supplier.pricePerUnit;
	const patch: Partial<ProcurementItem> = {
		currentSupplier: {
			companyName: supplier.companyName,
			inn: supplier.inn,
			paymentType: supplier.paymentType,
			deferralDays: supplier.deferralDays,
			prepaymentPercent: supplier.prepaymentPercent,
			pricePerUnit: supplier.pricePerUnit,
		},
	};
	if (tco != null && tco !== item.currentPrice) patch.currentPrice = tco;
	await items.update(itemId, patch);
}

export interface CreateProcurementInquiryWithItemsInput {
	procurementInquiry: Omit<CreateProcurementInquiryInput, "items">;
	items: NewItemInput[];
}

export interface CreateProcurementInquiryWithItemsResult {
	procurementInquiry: ProcurementInquiry;
	items: ProcurementItem[];
}

function toInquiryItemInput(item: NewItemInput): CreateProcurementInquiryItemInput {
	const payload: CreateProcurementInquiryItemInput = { name: item.name };
	if (item.description !== undefined) payload.description = item.description;
	if (item.status !== undefined) payload.status = item.status;
	if (item.annualQuantity !== undefined) payload.annualQuantity = item.annualQuantity;
	if (item.unit !== undefined) payload.unit = item.unit;
	if (item.quantityPerDelivery !== undefined) payload.quantityPerDelivery = item.quantityPerDelivery;
	return payload;
}

/**
 * Atomic inquiry + items create. The backend `POST /procurement/inquiries/`
 * accepts items in the same request and creates both in one transaction —
 * an inquiry can never land in the "empty positions" state. Items inherit
 * the inquiry's `companyId`, so callers don't repeat it per item.
 *
 * The `items` array must be non-empty; an empty submission is a UI bug
 * (the create drawer requires at least one named position).
 */
export async function createProcurementInquiryWithItems(
	input: CreateProcurementInquiryWithItemsInput,
	{ procurementInquiries }: Pick<ProcurementOperationsContext, "procurementInquiries">,
): Promise<CreateProcurementInquiryWithItemsResult> {
	if (input.items.length === 0) {
		throw new ValidationError({ items: ["Запрос должен содержать хотя бы одну позицию."] });
	}
	const procurementInquiry = await procurementInquiries.create({
		...input.procurementInquiry,
		items: input.items.map(toInquiryItemInput),
	});
	return { procurementInquiry, items: [] };
}

/**
 * ProcurementInquiry-level archive routed to the right backend endpoint:
 * `POST /procurement/inquiries/{id}/archive/` or `/unarchive/`. The cascade
 * hook keeps its `{id, isArchived}` argument shape so call sites don't change.
 */
export async function archiveProcurementInquiryCascade(
	id: string,
	isArchived: boolean,
	{ procurementInquiries }: Pick<ProcurementOperationsContext, "procurementInquiries">,
): Promise<ProcurementInquiry> {
	return isArchived ? procurementInquiries.archive(id) : procurementInquiries.unarchive(id);
}
