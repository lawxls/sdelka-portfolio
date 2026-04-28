import type { ItemsClient } from "../clients/items-client";
import type { SuppliersClient } from "../clients/suppliers-client";
import { NotFoundError } from "../errors";

/**
 * Single public seam for cross-entity domain rules in the procurement
 * subsystem. Lower-level domain clients (suppliers, items) know about their
 * own entity only; anything that mutates both supplier and item state lives
 * here.
 *
 * Inhabitants today: `selectSupplierForItem` and `setCurrentSupplierFromQuote`.
 * Out-of-scope cross-entity rules still living in mocks are documented in
 * CONTEXT.md ("Procurement operation"); each migrates here when its hook does.
 *
 * When the real backend ships, this module is the one place that decides
 * "one server call or two." For now both operations issue two calls (read
 * supplier, then write item).
 */
export interface ProcurementOperationsContext {
	items: ItemsClient;
	suppliers: SuppliersClient;
}

/**
 * Promote the supplier (looked up by id within the item's per-item list) to
 * the procurement item's current supplier. Writes companyName, paymentType,
 * deferralDays, and pricePerUnit. INN is intentionally omitted — this codepath
 * is used when the user picks a candidate from the per-item suppliers table
 * where the INN may not yet be confirmed.
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
 * procurement item's current supplier and snap `currentPrice` to its TCO so
 * «ТЕКУЩЕЕ ТСО» refreshes on the item card. Used by the supplier drawer's
 * «Предложения» tab when the user picks a quote — the quote carries an INN,
 * so id-by-id lookup isn't usable. Archived rows are skipped.
 */
export async function setCurrentSupplierFromQuote(
	itemId: string,
	inn: string,
	{ items, suppliers }: ProcurementOperationsContext,
): Promise<void> {
	const { suppliers: list } = await suppliers.listForItem(itemId);
	const supplier = list.find((s) => s.inn === inn && !s.archived);
	if (!supplier) throw new NotFoundError({ itemId, inn });
	const tco = supplier.tco ?? supplier.pricePerUnit;
	await items.update(itemId, {
		currentSupplier: {
			companyName: supplier.companyName,
			inn: supplier.inn,
			paymentType: supplier.paymentType,
			deferralDays: supplier.deferralDays,
			prepaymentPercent: supplier.prepaymentPercent,
			pricePerUnit: supplier.pricePerUnit,
		},
		...(tco != null ? { currentPrice: tco } : {}),
	});
}
