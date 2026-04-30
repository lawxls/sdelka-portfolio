import type { ItemsClient } from "../clients/items-client";
import type { SuppliersClient } from "../clients/suppliers-client";
import type { TendersClient } from "../clients/tenders-client";
import { NotFoundError } from "../errors";
import type { ProcurementInquiry } from "../types";

/**
 * Single public seam for cross-entity domain rules in the procurement
 * subsystem. Lower-level domain clients (suppliers, items, tenders) know
 * about their own entity only; anything that mutates state across two of
 * them lives here.
 *
 * Inhabitants today: `selectSupplierForItem` and `setCurrentSupplierFromQuote`.
 * Both write the parent tender's `currentSupplier` (the «Ваш поставщик»
 * context migrated from item to tender in slice #6 of PRD #255). Out-of-scope
 * cross-entity rules still living in mocks are documented in CONTEXT.md
 * ("Procurement operation"); each migrates here when its hook does.
 *
 * When the real backend ships, this module is the one place that decides
 * "one server call or two." For now operations issue separate read + write
 * calls; the write target is the tender (and, for the quote flow, the item's
 * `currentPrice` so «ТЕКУЩЕЕ ТСО» refreshes).
 */
export interface ProcurementOperationsContext {
	items: ItemsClient;
	suppliers: SuppliersClient;
	tenders: TendersClient;
}

/**
 * Promote the supplier (looked up by id within the item's per-item list) to
 * the parent tender's current supplier. Writes companyName, paymentType,
 * deferralDays, and pricePerUnit. INN is intentionally omitted — this
 * codepath is used when the user picks a candidate from the per-item
 * suppliers table where the INN may not yet be confirmed.
 *
 * Throws NotFoundError when the item has no parent tender or the supplier
 * id doesn't match a row in the per-item list.
 */
export async function selectSupplierForItem(
	itemId: string,
	supplierId: string,
	{ items, suppliers, tenders }: ProcurementOperationsContext,
): Promise<void> {
	const item = await items.get(itemId);
	if (!item.tenderId) throw new NotFoundError({ itemId, reason: "no parent tender" });
	const supplier = await suppliers.get(itemId, supplierId);
	if (!supplier) throw new NotFoundError({ itemId, supplierId });
	await tenders.update(item.tenderId, {
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
 * parent tender's current supplier and snap the item's `currentPrice` to its
 * TCO so «ТЕКУЩЕЕ ТСО» refreshes on the item row. Used by the supplier
 * drawer's «Предложения» tab when the user picks a quote — the quote carries
 * an INN, so id-by-id lookup isn't usable. Archived rows are skipped.
 */
export async function setCurrentSupplierFromQuote(
	itemId: string,
	inn: string,
	{ items, suppliers, tenders }: ProcurementOperationsContext,
): Promise<void> {
	const item = await items.get(itemId);
	if (!item.tenderId) throw new NotFoundError({ itemId, reason: "no parent tender" });
	const { suppliers: list } = await suppliers.listForItem(itemId);
	const supplier = list.find((s) => s.inn === inn && !s.archived);
	if (!supplier) throw new NotFoundError({ itemId, inn });
	const tco = supplier.tco ?? supplier.pricePerUnit;
	await tenders.update(item.tenderId, {
		currentSupplier: {
			companyName: supplier.companyName,
			inn: supplier.inn,
			paymentType: supplier.paymentType,
			deferralDays: supplier.deferralDays,
			prepaymentPercent: supplier.prepaymentPercent,
			pricePerUnit: supplier.pricePerUnit,
		},
	});
	if (tco != null && tco !== item.currentPrice) {
		await items.update(itemId, { currentPrice: tco });
	}
}

/**
 * Tender-level archive that cascades into items. Flips the tender's
 * `isArchived` flag; the in-memory items adapter then hides the tender's
 * items from /positions non-archive views by joining through
 * `_isTenderArchived`. Restoring (`isArchived=false`) reverses both — items
 * reappear on /positions, the tender shows up in non-archive views again.
 *
 * No per-item write happens here; the cascade is read-time, so state can
 * never drift between the tender flag and the items' visibility.
 */
export async function archiveTenderCascade(
	id: string,
	isArchived: boolean,
	{ tenders }: Pick<ProcurementOperationsContext, "tenders">,
): Promise<ProcurementInquiry> {
	return tenders.archive(id, isArchived);
}
