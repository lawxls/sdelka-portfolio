import type { ItemsClient } from "../clients/items-client";
import type { ProcurementInquiriesClient } from "../clients/procurement-inquiries-client";
import type { SuppliersClient } from "../clients/suppliers-client";
import type { CreateProcurementInquiryInput } from "../domains/procurement-inquiries";
import { NotFoundError } from "../errors";
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
	procurementInquiry: CreateProcurementInquiryInput;
	items: NewItemInput[];
}

export interface CreateProcurementInquiryWithItemsResult {
	procurementInquiry: ProcurementInquiry;
	items: ProcurementItem[];
}

/**
 * Atomic inquiry + items create. ProcurementInquiry is created first (HTTP)
 * so items can inherit its id via `procurementInquiryId`. If items.create
 * fails, procurementInquiries.delete rolls back — best-effort: if rollback
 * itself fails, the original items error surfaces and the orphan inquiry
 * remains until the real transactional backend ships.
 *
 * In-the-meantime cross-domain limitation: inquiry persists to the backend
 * but items still go through the in-memory items adapter until items HTTP
 * lands. On reload, the inquiry survives but its items don't — accepted per
 * the migration plan.
 */
export async function createProcurementInquiryWithItems(
	input: CreateProcurementInquiryWithItemsInput,
	{ items, procurementInquiries }: Pick<ProcurementOperationsContext, "items" | "procurementInquiries">,
): Promise<CreateProcurementInquiryWithItemsResult> {
	const procurementInquiry = await procurementInquiries.create(input.procurementInquiry);
	try {
		const result = await items.create(
			input.items.map((item) => ({ ...item, procurementInquiryId: procurementInquiry.id })),
		);
		return { procurementInquiry, items: result.items ?? [] };
	} catch (err) {
		try {
			await procurementInquiries.delete(procurementInquiry.id);
		} catch {}
		throw err;
	}
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
