import type { UpdateItemData } from "../domains/items";
import type { CurrentSupplier, NewItemInput, ProcurementItem, ProcurementStatus, Unit } from "../types";

/** Wire ↔ SPA-shape mapper for items. Decimal strings (`annualQuantity`,
 * `quantityPerDelivery`) get parsed to numbers; nested `currentSupplier` is
 * shaped per the SPA domain type. */

/** Wire-side `currentSupplier`. Legacy pricing fields (`pricePerUnit` etc.)
 * are accepted so older in-memory fixtures keep round-tripping; the backend
 * itself will move them to the Offer resource over time. */
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
	inquiryId?: string | null;
	folderId?: string | null;
	description?: string | null;
	unit?: Unit | null;
	quantityPerDelivery?: number | string | null;
	currentSupplier?: CurrentSupplierWire | null;
}

export function parseDecimal<F extends number | null>(
	value: number | string | null | undefined,
	fallback: F,
): number | F {
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
	if (wire.inquiryId) item.procurementInquiryId = wire.inquiryId;
	if (wire.folderId !== undefined) item.folderId = wire.folderId;
	if (wire.description) item.description = wire.description;
	if (wire.unit) item.unit = wire.unit;
	if (wire.quantityPerDelivery != null) {
		item.quantityPerDelivery = parseDecimal(wire.quantityPerDelivery, 0);
	}
	const supplier = mapCurrentSupplier(wire.currentSupplier);
	if (supplier) item.currentSupplier = supplier;
	return item;
}

/** Decimal fields are serialised as strings so the DRF deserialiser accepts
 * them without precision loss. */
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
	if (input.procurementInquiryId !== undefined) out.inquiryId = input.procurementInquiryId;
	if (input.folderId !== undefined) out.folderId = input.folderId;
	return out;
}
