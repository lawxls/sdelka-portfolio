import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetSupplierStore, _setSupplierMockDelay, getSuppliers } from "./supplier-mock-data";
import { SUPPLIER_STATUSES } from "./supplier-types";

beforeEach(() => {
	_resetSupplierStore();
	_setSupplierMockDelay(0, 0);
});

afterEach(() => {
	_resetSupplierStore();
});

describe("supplier mock store", () => {
	it("has 10 suppliers for a given procurement item", async () => {
		const { suppliers } = await getSuppliers("item-1");
		expect(suppliers.length).toBe(10);
	});

	it("all suppliers belong to the requested item", async () => {
		const { suppliers } = await getSuppliers("item-1");
		for (const s of suppliers) {
			expect(s.itemId).toBe("item-1");
		}
	});

	it("spreads suppliers across all 5 statuses", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const statuses = new Set(suppliers.map((s) => s.status));
		expect(statuses.size).toBe(5);
		for (const status of SUPPLIER_STATUSES) {
			expect(statuses.has(status)).toBe(true);
		}
	});

	it("has 2-3 suppliers with получено_кп status", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const kpCount = suppliers.filter((s) => s.status === "получено_кп").length;
		expect(kpCount).toBeGreaterThanOrEqual(2);
		expect(kpCount).toBeLessThanOrEqual(3);
	});

	it("получено_кп suppliers have non-null price, tco, and rating", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const kpSuppliers = suppliers.filter((s) => s.status === "получено_кп");
		for (const s of kpSuppliers) {
			expect(s.pricePerUnit).toBeTypeOf("number");
			expect(s.tco).toBeTypeOf("number");
			expect(s.rating).toBeTypeOf("number");
			expect(s.rating).toBeGreaterThanOrEqual(0);
			expect(s.rating).toBeLessThanOrEqual(100);
		}
	});

	it("non-КП suppliers have null price, tco, and rating", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const nonKp = suppliers.filter((s) => s.status !== "получено_кп");
		expect(nonKp.length).toBeGreaterThan(0);
		for (const s of nonKp) {
			expect(s.pricePerUnit).toBeNull();
			expect(s.tco).toBeNull();
			expect(s.rating).toBeNull();
		}
	});

	it("tco equals pricePerUnit + deliveryCost for КП suppliers", async () => {
		const { suppliers } = await getSuppliers("item-1");
		const kpSuppliers = suppliers.filter((s) => s.status === "получено_кп");
		for (const s of kpSuppliers) {
			expect(s.tco).toBe((s.pricePerUnit ?? 0) + s.deliveryCost);
		}
	});

	it("suppliers have Russian company names and valid emails", async () => {
		const { suppliers } = await getSuppliers("item-1");
		for (const s of suppliers) {
			expect(s.companyName).toMatch(/[А-Яа-яЁё]/);
			expect(s.email).toContain("@");
		}
	});

	it("generates different suppliers for different item IDs", async () => {
		const { suppliers: s1 } = await getSuppliers("item-1");
		const { suppliers: s2 } = await getSuppliers("item-2");
		const ids1 = new Set(s1.map((s) => s.id));
		const ids2 = new Set(s2.map((s) => s.id));
		// No overlapping IDs
		for (const id of ids2) {
			expect(ids1.has(id)).toBe(false);
		}
	});
});
