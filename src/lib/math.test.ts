import { describe, expect, it } from "vitest";
import type { Supplier } from "@/data/supplier-types";
import type { ProcurementItem } from "@/data/types";
import { batchCost, savingsPercent } from "./math";

type SupplierStub = Pick<Supplier, "pricePerUnit" | "companyName">;
type ItemStub = Pick<ProcurementItem, "quantityPerDelivery">;

function supplier(pricePerUnit: number | null, companyName = "Поставщик А"): SupplierStub {
	return { pricePerUnit, companyName };
}

function item(quantityPerDelivery: number | undefined): ItemStub {
	return { quantityPerDelivery };
}

describe("batchCost", () => {
	it("multiplies pricePerUnit by quantityPerDelivery", () => {
		expect(batchCost(supplier(1000), item(5))).toBe(5000);
	});

	it("returns null when pricePerUnit is null", () => {
		expect(batchCost(supplier(null), item(5))).toBeNull();
	});

	it("returns null when quantityPerDelivery is undefined", () => {
		expect(batchCost(supplier(1000), item(undefined))).toBeNull();
	});

	it("returns 0 when pricePerUnit is 0", () => {
		expect(batchCost(supplier(0), item(10))).toBe(0);
	});
});

describe("savingsPercent", () => {
	const current = { pricePerUnit: 1000, companyName: "Текущий" };

	it("positive percentage when supplier is cheaper", () => {
		const result = savingsPercent(supplier(800, "Дешёвый"), current, item(10));
		expect(result).toBe(20);
	});

	it("negative percentage when supplier is more expensive", () => {
		const result = savingsPercent(supplier(1100, "Дорогой"), current, item(10));
		expect(result).toBeCloseTo(-10, 5);
	});

	it("zero when prices equal", () => {
		const result = savingsPercent(supplier(1000, "Равный"), current, item(10));
		expect(result).toBe(0);
	});

	it("returns null for self-comparison by companyName", () => {
		const result = savingsPercent(supplier(800, "Текущий"), current, item(10));
		expect(result).toBeNull();
	});

	it("returns null when currentSupplier is null", () => {
		expect(savingsPercent(supplier(800), null, item(10))).toBeNull();
	});

	it("returns null when currentSupplier is undefined", () => {
		expect(savingsPercent(supplier(800), undefined, item(10))).toBeNull();
	});

	it("returns null when current pricePerUnit is null", () => {
		const result = savingsPercent(supplier(800, "Дешёвый"), { pricePerUnit: null, companyName: "Текущий" }, item(10));
		expect(result).toBeNull();
	});

	it("returns null when supplier pricePerUnit is null", () => {
		expect(savingsPercent(supplier(null, "X"), current, item(10))).toBeNull();
	});

	it("returns null when quantityPerDelivery is missing", () => {
		expect(savingsPercent(supplier(800, "X"), current, item(undefined))).toBeNull();
	});

	it("returns null when current price is zero", () => {
		const result = savingsPercent(supplier(800, "X"), { pricePerUnit: 0, companyName: "Текущий" }, item(10));
		expect(result).toBeNull();
	});

	it("returns null when current price is negative", () => {
		const result = savingsPercent(supplier(800, "X"), { pricePerUnit: -100, companyName: "Текущий" }, item(10));
		expect(result).toBeNull();
	});
});
