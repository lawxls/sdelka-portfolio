import { describe, expect, it } from "vitest";
import type { UpdateItemData } from "../domains/items";
import type { NewItemInput } from "../types";
import { itemFromApi, itemToApiPatch, newItemToApi, type ProcurementItemWire } from "./items-wire";

function wire(overrides: Partial<ProcurementItemWire> = {}): ProcurementItemWire {
	return {
		id: "i-1",
		name: "Кирпич",
		status: "searching",
		annualQuantity: "100",
		currentPrice: "50",
		bestPrice: "40",
		averagePrice: "45",
		...overrides,
	};
}

describe("itemFromApi", () => {
	it("parses decimal strings into numbers", () => {
		const item = itemFromApi(
			wire({ annualQuantity: "12.5", currentPrice: "199.99", bestPrice: "150.00", averagePrice: "175.50" }),
		);
		expect(item.annualQuantity).toBe(12.5);
		expect(item.currentPrice).toBe(199.99);
		expect(item.bestPrice).toBe(150);
		expect(item.averagePrice).toBe(175.5);
	});

	it("treats null decimal scalars as null (bestPrice/averagePrice/currentPrice)", () => {
		const item = itemFromApi(wire({ currentPrice: null, bestPrice: null, averagePrice: null }));
		expect(item.currentPrice).toBeNull();
		expect(item.bestPrice).toBeNull();
		expect(item.averagePrice).toBeNull();
	});

	it("treats null annualQuantity as 0 (non-nullable on the SPA shape)", () => {
		const item = itemFromApi(wire({ annualQuantity: null }));
		expect(item.annualQuantity).toBe(0);
	});

	it("parses '0' as 0 (not falsy-coerced to fallback)", () => {
		const item = itemFromApi(wire({ annualQuantity: "0" }));
		expect(item.annualQuantity).toBe(0);
	});

	it("passes optional scalar fields through when present", () => {
		const item = itemFromApi(
			wire({
				inquiryId: "T-001",
				description: "Облицовка",
				unit: "шт",
				quantityPerDelivery: "10",
			}),
		);
		expect(item.procurementInquiryId).toBe("T-001");
		expect(item.description).toBe("Облицовка");
		expect(item.unit).toBe("шт");
		expect(item.quantityPerDelivery).toBe(10);
	});

	it("omits optional fields when missing on the wire", () => {
		const item = itemFromApi(wire());
		expect(item.procurementInquiryId).toBeUndefined();
		expect(item.description).toBeUndefined();
		expect(item.unit).toBeUndefined();
		expect(item.quantityPerDelivery).toBeUndefined();
		expect(item.currentSupplier).toBeUndefined();
	});

	it("reads nested currentSupplier identity fields", () => {
		const item = itemFromApi(
			wire({
				currentSupplier: {
					companyName: "ООО Поставщик",
					inn: "1234567890",
					email: "info@supp.ru",
					pricePerUnit: "199.99",
				},
			}),
		);
		expect(item.currentSupplier?.companyName).toBe("ООО Поставщик");
		expect(item.currentSupplier?.inn).toBe("1234567890");
		expect(item.currentSupplier?.email).toBe("info@supp.ru");
		expect(item.currentSupplier?.pricePerUnit).toBe(199.99);
	});
});

describe("itemToApiPatch", () => {
	it("serialises decimal fields as strings", () => {
		const patch: UpdateItemData = { annualQuantity: 12.5, quantityPerDelivery: 4 };
		expect(itemToApiPatch(patch)).toEqual({ annualQuantity: "12.5", quantityPerDelivery: "4" });
	});

	it("preserves null decimal fields as null", () => {
		const patch = { annualQuantity: null } as unknown as UpdateItemData;
		expect(itemToApiPatch(patch)).toEqual({ annualQuantity: null });
	});

	it("passes through non-decimal scalars untouched", () => {
		const patch: UpdateItemData = { name: "Новая", currentPrice: 100, unit: "кг" };
		expect(itemToApiPatch(patch)).toEqual({ name: "Новая", currentPrice: 100, unit: "кг" });
	});

	it("drops undefined fields entirely", () => {
		const patch: UpdateItemData = { name: "X", description: undefined };
		expect(itemToApiPatch(patch)).toEqual({ name: "X" });
	});
});

describe("newItemToApi", () => {
	it("serialises decimal fields as strings", () => {
		const input: NewItemInput = { name: "X", companyId: "c-1", annualQuantity: 12.5, quantityPerDelivery: 4 };
		expect(newItemToApi(input)).toMatchObject({ annualQuantity: "12.5", quantityPerDelivery: "4" });
	});

	it("includes companyId in the payload", () => {
		const input: NewItemInput = { name: "X", companyId: "c-1" };
		expect(newItemToApi(input).companyId).toBe("c-1");
	});

	it("drops optional fields when undefined", () => {
		const input: NewItemInput = { name: "X", companyId: "c-1" };
		const wire = newItemToApi(input);
		expect(wire).toEqual({ name: "X", companyId: "c-1" });
	});
});

describe("round-trip", () => {
	it("a wire payload survives itemFromApi → itemToApiPatch (decimal preserved as string)", () => {
		const item = itemFromApi(wire({ annualQuantity: "12.5", quantityPerDelivery: "4", currentPrice: "199.99" }));
		const patch = itemToApiPatch(item);
		expect(patch.annualQuantity).toBe("12.5");
		expect(patch.quantityPerDelivery).toBe("4");
		expect(patch.currentPrice).toBe(199.99);
	});
});
