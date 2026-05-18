import type { UpdateItemData } from "../domains/items";
import type { CurrentSupplier, NewItemInput, ProcurementItem, ProcurementStatus, Unit } from "../types";

/**
 * Wire mapper for the items domain. The Django `ProcurementItemSerializer`
 * serialises `annualQuantity` / `quantityPerDelivery` as decimal strings, and
 * denormalises the current supplier as a nested object. This module is the
 * single seam where wire ↔ SPA shape conversion happens; the HTTP adapter
 * holds the only call site.
 *
 * Tests are co-located in `items-wire.test.ts` and cover decimal-string
 * parsing, nested supplier read, and round-trip behavior.
 */

/** DRF wire shape for `currentSupplier`. The backend returns supplier identity
 * fields only — pricing / payment / delivery moved to the `Offer` resource. */
interface CurrentSupplierWire {
	companyName: string;
	inn?: string | null;
	website?: string | null;
	address?: string | null;
	email?: string | null;
	/** Legacy compat — older fixtures still ship pricing fields inline. */
	paymentType?: string | null;
	deferralDays?: number | null;
	prepaymentPercent?: number | null;
	pricePerUnit?: number | string | null;
	deliveryCost?: number | string | null;
	leadTimeDays?: number | null;
}

export interface ProcurementItemWire {
	id: string;
	name: string;
	status: ProcurementStatus;
	annualQuantity: number | string | null;
	currentPrice: number | string | null;
	bestPrice: number | string | null;
	averagePrice: number | string | null;
	procurementInquiryId?: string | null;
	description?: string | null;
	unit?: Unit | null;
	quantityPerDelivery?: number | string | null;
	currentSupplier?: CurrentSupplierWire | null;
}

/** Parse a DRF decimal — backend serialises as string, the SPA holds numbers. */
function parseDecimal(value: number | string | null | undefined, fallback: number): number;
function parseDecimal(value: number | string | null | undefined, fallback: number | null): number | null;
function parseDecimal(value: number | string | null | undefined, fallback: number | null): number | null {
	if (value === null || value === undefined || value === "") return fallback;
	if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function mapCurrentSupplier(wire: CurrentSupplierWire | null | undefined): CurrentSupplier | undefined {
	if (!wire) return undefined;
	const supplier: CurrentSupplier = {
		companyName: wire.companyName,
		deferralDays: wire.deferralDays ?? 0,
		pricePerUnit: parseDecimal(wire.pricePerUnit, null),
	};
	if (wire.inn) supplier.inn = wire.inn;
	if (wire.website) supplier.website = wire.website;
	if (wire.address) supplier.address = wire.address;
	if (wire.email) supplier.email = wire.email;
	if (wire.paymentType === "prepayment" || wire.paymentType === "deferred") supplier.paymentType = wire.paymentType;
	if (wire.prepaymentPercent != null) supplier.prepaymentPercent = wire.prepaymentPercent;
	if (wire.deliveryCost !== undefined) supplier.deliveryCost = parseDecimal(wire.deliveryCost, null);
	if (wire.leadTimeDays != null) supplier.leadTimeDays = wire.leadTimeDays;
	return supplier;
}

/** Translate a wire `ProcurementItem` into the SPA-canonical shape. */
export function itemFromApi(wire: ProcurementItemWire): ProcurementItem {
	const item: ProcurementItem = {
		id: wire.id,
		name: wire.name,
		status: wire.status,
		annualQuantity: parseDecimal(wire.annualQuantity, 0),
		currentPrice: parseDecimal(wire.currentPrice, null),
		bestPrice: parseDecimal(wire.bestPrice, null),
		averagePrice: parseDecimal(wire.averagePrice, null),
	};
	if (wire.procurementInquiryId) item.procurementInquiryId = wire.procurementInquiryId;
	if (wire.description) item.description = wire.description;
	if (wire.unit) item.unit = wire.unit;
	if (wire.quantityPerDelivery != null) {
		item.quantityPerDelivery = parseDecimal(wire.quantityPerDelivery, 0);
	}
	const supplier = mapCurrentSupplier(wire.currentSupplier);
	if (supplier) item.currentSupplier = supplier;
	return item;
}

/** Translate a SPA-side patch payload into the wire shape expected by PATCH
 * `/procurement/items/{id}/`. Decimal fields are serialised as strings so the
 * DRF deserialiser accepts them without precision loss. */
export function itemToApiPatch(data: UpdateItemData): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (value === undefined) continue;
		if (key === "annualQuantity" || key === "quantityPerDelivery") {
			out[key] = value === null ? null : String(value);
			continue;
		}
		out[key] = value;
	}
	return out;
}

/** Translate a `NewItemInput` into the wire shape for `POST /procurement/items/`.
 * The batch endpoint accepts `{ items: [<wire>...] }`. */
export function newItemToApi(input: NewItemInput): Record<string, unknown> {
	const out: Record<string, unknown> = { name: input.name };
	if (input.companyId !== undefined) out.companyId = input.companyId;
	if (input.description !== undefined) out.description = input.description;
	if (input.unit !== undefined) out.unit = input.unit;
	if (input.annualQuantity !== undefined) out.annualQuantity = String(input.annualQuantity);
	if (input.quantityPerDelivery !== undefined) out.quantityPerDelivery = String(input.quantityPerDelivery);
	if (input.currentPrice !== undefined) out.currentPrice = input.currentPrice;
	if (input.currentSupplier !== undefined) out.currentSupplier = input.currentSupplier;
	if (input.status !== undefined) out.status = input.status;
	if (input.procurementInquiryId !== undefined) out.procurementInquiryId = input.procurementInquiryId;
	return out;
}
