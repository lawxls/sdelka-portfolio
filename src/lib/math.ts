import type { Supplier } from "@/data/supplier-types";
import type { ProcurementItem } from "@/data/types";

/** Batch cost in ₽ = pricePerUnit × quantityPerDelivery. Null when either input is missing. */
export function batchCost(
	supplier: Pick<Supplier, "pricePerUnit">,
	item: Pick<ProcurementItem, "quantityPerDelivery">,
): number | null {
	if (supplier.pricePerUnit == null) return null;
	if (item.quantityPerDelivery == null) return null;
	return supplier.pricePerUnit * item.quantityPerDelivery;
}

interface CurrentSupplierPrice {
	pricePerUnit: number | null;
	companyName?: string;
}

/**
 * Savings % vs. the current supplier's batch cost.
 * Positive = supplier is cheaper than incumbent, negative = overrun.
 * Null when:
 * - supplier is the current supplier (self-comparison)
 * - either batch cost is missing
 * - current batch cost is zero or negative
 */
export function savingsPercent(
	supplier: Pick<Supplier, "pricePerUnit" | "companyName">,
	currentSupplier: CurrentSupplierPrice | null | undefined,
	item: Pick<ProcurementItem, "quantityPerDelivery">,
): number | null {
	if (!currentSupplier) return null;
	if (currentSupplier.companyName && supplier.companyName === currentSupplier.companyName) return null;

	const currentCost = batchCost({ pricePerUnit: currentSupplier.pricePerUnit }, item);
	const supplierCost = batchCost(supplier, item);
	if (currentCost == null || supplierCost == null) return null;
	if (currentCost <= 0) return null;

	return ((currentCost - supplierCost) / currentCost) * 100;
}
