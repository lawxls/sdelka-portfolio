import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockProcurementItems } from "./mock-data";
import type { ProcurementDataParams } from "./types";
import { getAnnualCost, getDeviation, getOverpayment } from "./types";
import { useProcurementData } from "./use-procurement-data";

const defaultParams: ProcurementDataParams = {
	search: "",
	filters: { deviation: "all", status: "all" },
	sort: null,
	page: 1,
	pageSize: 50,
};

function renderData(overrides: Partial<ProcurementDataParams> = {}) {
	return renderHook(() => useProcurementData({ ...defaultParams, ...overrides })).result.current;
}

describe("mock data", () => {
	it("generates 75 items", () => {
		expect(mockProcurementItems).toHaveLength(75);
	});

	it("is deterministic", () => {
		expect(mockProcurementItems[0].name).toBe("Арматура А500С ∅12");
		expect(mockProcurementItems[0].id).toBe("item-1");
	});

	it("has 8 items with null prices", () => {
		const nullCount = mockProcurementItems.filter((i) => i.bestPrice == null).length;
		expect(nullCount).toBe(8);
	});

	it("null-price items also have null averagePrice", () => {
		for (const item of mockProcurementItems) {
			if (item.bestPrice == null) {
				expect(item.averagePrice).toBeNull();
			}
		}
	});

	it("all items have prices in valid range", () => {
		for (const item of mockProcurementItems) {
			expect(item.currentPrice).toBeGreaterThanOrEqual(500);
			expect(item.currentPrice).toBeLessThanOrEqual(500000);
			expect(item.annualQuantity).toBeGreaterThanOrEqual(10);
		}
	});

	it("has all three statuses represented", () => {
		const statuses = new Set(mockProcurementItems.map((i) => i.status));
		expect(statuses).toContain("searching");
		expect(statuses).toContain("negotiating");
		expect(statuses).toContain("completed");
	});
});

describe("useProcurementData", () => {
	describe("no filters", () => {
		it("returns first page of items", () => {
			const result = renderData();
			expect(result.totalItems).toBe(75);
			expect(result.items).toHaveLength(50);
		});

		it("returns correct page info", () => {
			const result = renderData();
			expect(result.pageInfo).toEqual({ currentPage: 1, totalPages: 2, pageSize: 50 });
		});
	});

	describe("search", () => {
		it("filters by name substring", () => {
			const result = renderData({ search: "арматура" });
			expect(result.items.length).toBeGreaterThan(0);
			for (const item of result.items) {
				expect(item.name.toLowerCase()).toContain("арматура");
			}
		});

		it("is case insensitive", () => {
			const lower = renderData({ search: "цемент" });
			const upper = renderData({ search: "ЦЕМЕНТ" });
			expect(lower.totalItems).toBe(upper.totalItems);
			expect(lower.totalItems).toBeGreaterThan(0);
		});

		it("returns empty for no match", () => {
			const result = renderData({ search: "xyznonexistent" });
			expect(result.totalItems).toBe(0);
			expect(result.items).toHaveLength(0);
		});
	});

	describe("deviation filter", () => {
		it("overpaying returns only items with positive deviation", () => {
			const result = renderData({ filters: { deviation: "overpaying", status: "all" } });
			expect(result.items.length).toBeGreaterThan(0);
			for (const item of result.items) {
				expect(getDeviation(item)).toBeGreaterThan(0);
			}
		});

		it("saving returns only items with negative deviation", () => {
			const result = renderData({ filters: { deviation: "saving", status: "all" } });
			expect(result.items.length).toBeGreaterThan(0);
			for (const item of result.items) {
				expect(getDeviation(item)).toBeLessThan(0);
			}
		});

		it("excludes null-price items", () => {
			const overpaying = renderData({ filters: { deviation: "overpaying", status: "all" } });
			const saving = renderData({ filters: { deviation: "saving", status: "all" } });
			const all = renderData();
			const nullCount = mockProcurementItems.filter((i) => i.bestPrice == null).length;
			expect(overpaying.totalItems + saving.totalItems).toBeLessThanOrEqual(all.totalItems - nullCount);
		});
	});

	describe("status filter", () => {
		for (const status of ["searching", "negotiating", "completed"] as const) {
			it(`filters by ${status}`, () => {
				const result = renderData({ filters: { deviation: "all", status } });
				expect(result.items.length).toBeGreaterThan(0);
				for (const item of result.items) {
					expect(item.status).toBe(status);
				}
			});
		}
	});

	describe("combined filters", () => {
		it("combines deviation and status", () => {
			const result = renderData({ filters: { deviation: "overpaying", status: "searching" } });
			for (const item of result.items) {
				expect(item.status).toBe("searching");
				expect(getDeviation(item)).toBeGreaterThan(0);
			}
		});

		it("combined filters reduce result count", () => {
			const statusOnly = renderData({ filters: { deviation: "all", status: "searching" } });
			const combined = renderData({ filters: { deviation: "overpaying", status: "searching" } });
			expect(combined.totalItems).toBeLessThanOrEqual(statusOnly.totalItems);
		});
	});

	describe("sorting", () => {
		it("sorts by currentPrice ascending", () => {
			const result = renderData({ sort: { field: "currentPrice", direction: "asc" } });
			for (let i = 1; i < result.items.length; i++) {
				expect(result.items[i].currentPrice).toBeGreaterThanOrEqual(result.items[i - 1].currentPrice);
			}
		});

		it("sorts by currentPrice descending", () => {
			const result = renderData({ sort: { field: "currentPrice", direction: "desc" } });
			for (let i = 1; i < result.items.length; i++) {
				expect(result.items[i].currentPrice).toBeLessThanOrEqual(result.items[i - 1].currentPrice);
			}
		});

		it("sorts by annualCost", () => {
			const result = renderData({ sort: { field: "annualCost", direction: "asc" } });
			for (let i = 1; i < result.items.length; i++) {
				expect(getAnnualCost(result.items[i])).toBeGreaterThanOrEqual(getAnnualCost(result.items[i - 1]));
			}
		});

		it("sorts by deviation with nulls last", () => {
			const result = renderData({ sort: { field: "deviation", direction: "asc" } });
			const deviations = result.items.map((i) => getDeviation(i));
			const firstNull = deviations.findIndex((d) => d == null);
			if (firstNull >= 0) {
				for (let i = firstNull; i < deviations.length; i++) {
					expect(deviations[i]).toBeNull();
				}
			}
		});

		it("sorts by overpayment", () => {
			const result = renderData({ sort: { field: "overpayment", direction: "desc" } });
			const values = result.items.map((i) => getOverpayment(i));
			const nonNull = values.filter((v): v is number => v != null);
			for (let i = 1; i < nonNull.length; i++) {
				expect(nonNull[i]).toBeLessThanOrEqual(nonNull[i - 1]);
			}
		});
	});

	describe("pagination", () => {
		it("returns correct number of items per page", () => {
			const result = renderData({ pageSize: 10 });
			expect(result.items).toHaveLength(10);
			expect(result.pageInfo.totalPages).toBe(8);
		});

		it("page 2 has different items than page 1", () => {
			const page1 = renderData({ pageSize: 10, page: 1 });
			const page2 = renderData({ pageSize: 10, page: 2 });
			expect(page1.items[0].id).not.toBe(page2.items[0].id);
		});

		it("clamps out-of-range page to last page", () => {
			const result = renderData({ pageSize: 10, page: 100 });
			expect(result.pageInfo.currentPage).toBe(8);
			expect(result.items.length).toBeGreaterThan(0);
		});

		it("last page has correct partial count", () => {
			const result = renderData({ pageSize: 20, page: 4 });
			expect(result.items).toHaveLength(15); // 75 % 20 = 15
			expect(result.pageInfo.totalPages).toBe(4);
		});
	});

	describe("totals", () => {
		it("reflect all filtered items, not just current page", () => {
			const fullPage = renderData({ pageSize: 50 });
			const smallPage = renderData({ pageSize: 10, page: 1 });
			expect(smallPage.totals).toEqual(fullPage.totals);
		});

		it("overpaying filter produces zero savings", () => {
			const result = renderData({ filters: { deviation: "overpaying", status: "all" } });
			expect(result.totals.totalSavings).toBe(0);
			expect(result.totals.totalOverpayment).toBeGreaterThan(0);
		});

		it("saving filter produces zero overpayment", () => {
			const result = renderData({ filters: { deviation: "saving", status: "all" } });
			expect(result.totals.totalOverpayment).toBe(0);
			expect(result.totals.totalSavings).toBeGreaterThan(0);
		});

		it("computes correct totals from items with prices", () => {
			const result = renderData({ pageSize: 75 });
			const itemsWithPrices = mockProcurementItems.filter((i) => i.bestPrice != null);
			let expectedOverpayment = 0;
			let expectedSavings = 0;
			for (const item of itemsWithPrices) {
				const overpayment = getOverpayment(item);
				if (overpayment == null) continue;
				if (overpayment > 0) expectedOverpayment += overpayment;
				else expectedSavings += Math.abs(overpayment);
			}
			expect(result.totals.totalOverpayment).toBeCloseTo(expectedOverpayment, 2);
			expect(result.totals.totalSavings).toBeCloseTo(expectedSavings, 2);
		});

		it("itemCount matches totalItems", () => {
			const result = renderData({ search: "труба" });
			expect(result.totals.itemCount).toBe(result.totalItems);
		});

		it("totalDeviation is overpayment minus savings", () => {
			const result = renderData();
			expect(result.totals.totalDeviation).toBeCloseTo(result.totals.totalOverpayment - result.totals.totalSavings, 2);
		});
	});
});
