import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockProcurementItems, SEED_FOLDER_ASSIGNMENTS } from "./mock-data";
import type { ProcurementDataParams, ProcurementItem } from "./types";
import { getAnnualCost, getDeviation, getOverpayment } from "./types";
import { useProcurementData } from "./use-procurement-data";

const defaultParams: ProcurementDataParams = {
	search: "",
	filters: { deviation: "all", status: "all" },
	sort: null,
	batchSize: 25,
};

/** Renders with batchSize covering all 75 items — for tests that don't exercise infinite scroll */
function renderData(overrides: Partial<ProcurementDataParams> = {}) {
	return renderHook(() => useProcurementData({ ...defaultParams, batchSize: 75, ...overrides })).result.current;
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
		it("returns all items when batchSize covers full dataset", () => {
			const result = renderData();
			expect(result.totalItems).toBe(75);
			expect(result.items).toHaveLength(75);
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

	describe("infinite scroll", () => {
		it("initial call returns first batch (default batchSize 25)", () => {
			const { result } = renderHook(() => useProcurementData(defaultParams));
			expect(result.current.items).toHaveLength(25);
			expect(result.current.totalItems).toBe(75);
			expect(result.current.hasNextPage).toBe(true);
		});

		it("loadMore appends next batch — items accumulate", () => {
			const { result } = renderHook(() => useProcurementData(defaultParams));
			expect(result.current.items).toHaveLength(25);

			act(() => result.current.loadMore());
			expect(result.current.items).toHaveLength(50);

			act(() => result.current.loadMore());
			expect(result.current.items).toHaveLength(75);
		});

		it("hasNextPage is true until all items loaded, then false", () => {
			const { result } = renderHook(() => useProcurementData(defaultParams));
			expect(result.current.hasNextPage).toBe(true);

			act(() => result.current.loadMore());
			expect(result.current.hasNextPage).toBe(true);

			act(() => result.current.loadMore());
			expect(result.current.hasNextPage).toBe(false);
		});

		it("loadMore is a no-op when hasNextPage is false", () => {
			const { result } = renderHook(() => useProcurementData(defaultParams));

			act(() => result.current.loadMore());
			act(() => result.current.loadMore());
			expect(result.current.hasNextPage).toBe(false);

			const itemCount = result.current.items.length;
			act(() => result.current.loadMore());
			expect(result.current.items).toHaveLength(itemCount);
		});

		it("last batch contains remaining items (partial batch)", () => {
			const { result } = renderHook(() => useProcurementData({ ...defaultParams, batchSize: 20 }));
			expect(result.current.items).toHaveLength(20);

			act(() => result.current.loadMore()); // 40
			act(() => result.current.loadMore()); // 60
			act(() => result.current.loadMore()); // 75 (partial: 15)
			expect(result.current.items).toHaveLength(75);
			expect(result.current.hasNextPage).toBe(false);
		});

		it("cursor resets when search changes", () => {
			const { result, rerender } = renderHook((props: ProcurementDataParams) => useProcurementData(props), {
				initialProps: defaultParams,
			});

			act(() => result.current.loadMore());
			expect(result.current.items).toHaveLength(50);

			rerender({ ...defaultParams, search: "арматура" });
			expect(result.current.items.length).toBeLessThanOrEqual(25);
		});

		it("cursor resets when filters change", () => {
			const { result, rerender } = renderHook((props: ProcurementDataParams) => useProcurementData(props), {
				initialProps: defaultParams,
			});

			act(() => result.current.loadMore());
			expect(result.current.items).toHaveLength(50);

			rerender({ ...defaultParams, filters: { deviation: "overpaying", status: "all" } });
			expect(result.current.items.length).toBeLessThanOrEqual(25);
		});

		it("cursor resets when sort changes", () => {
			const { result, rerender } = renderHook((props: ProcurementDataParams) => useProcurementData(props), {
				initialProps: defaultParams,
			});

			act(() => result.current.loadMore());
			expect(result.current.items).toHaveLength(50);

			rerender({ ...defaultParams, sort: { field: "currentPrice", direction: "asc" } });
			expect(result.current.items.length).toBeLessThanOrEqual(25);
		});

		it("cursor resets when folder changes", () => {
			const { result, rerender } = renderHook((props: ProcurementDataParams) => useProcurementData(props), {
				initialProps: defaultParams,
			});

			act(() => result.current.loadMore());
			expect(result.current.items).toHaveLength(50);

			rerender({ ...defaultParams, folder: "folder-1" });
			expect(result.current.items.length).toBeLessThanOrEqual(25);
		});

		it("totals reflect all filtered items, not just loaded batch", () => {
			const allItems = renderData();
			const { result } = renderHook(() => useProcurementData(defaultParams));
			expect(result.current.totals).toEqual(allItems.totals);
		});

		it("isFetchingMore is always false", () => {
			const { result } = renderHook(() => useProcurementData(defaultParams));
			expect(result.current.isFetchingMore).toBe(false);

			act(() => result.current.loadMore());
			expect(result.current.isFetchingMore).toBe(false);
		});
	});

	describe("totals", () => {
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
			const result = renderData();
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

	describe("folder filter", () => {
		function itemsWithFolders(): ProcurementItem[] {
			return mockProcurementItems.map((item) => ({
				...item,
				folderId: SEED_FOLDER_ASSIGNMENTS[item.id] ?? null,
			}));
		}

		function renderWithFolders(overrides: Partial<ProcurementDataParams> = {}) {
			return renderHook(() =>
				useProcurementData({
					...defaultParams,
					items: itemsWithFolders(),
					batchSize: 75,
					...overrides,
				}),
			).result.current;
		}

		it("returns all items when folder is undefined", () => {
			const result = renderWithFolders();
			expect(result.totalItems).toBe(75);
		});

		it("filters by specific folder id", () => {
			const result = renderWithFolders({ folder: "folder-1" });
			const expectedCount = Object.values(SEED_FOLDER_ASSIGNMENTS).filter((f) => f === "folder-1").length;
			expect(result.totalItems).toBe(expectedCount);
			for (const item of result.items) {
				expect(item.folderId).toBe("folder-1");
			}
		});

		it("folder=none returns unassigned items", () => {
			const result = renderWithFolders({ folder: "none" });
			const assignedCount = Object.keys(SEED_FOLDER_ASSIGNMENTS).length;
			expect(result.totalItems).toBe(75 - assignedCount);
			for (const item of result.items) {
				expect(item.folderId).toBeNull();
			}
		});

		it("stacks with search filter", () => {
			const result = renderWithFolders({ folder: "folder-1", search: "арматура" });
			expect(result.totalItems).toBeGreaterThan(0);
			for (const item of result.items) {
				expect(item.folderId).toBe("folder-1");
				expect(item.name.toLowerCase()).toContain("арматура");
			}
		});

		it("stacks with deviation filter", () => {
			const result = renderWithFolders({
				folder: "folder-1",
				filters: { deviation: "overpaying", status: "all" },
			});
			for (const item of result.items) {
				expect(item.folderId).toBe("folder-1");
				expect(getDeviation(item)).toBeGreaterThan(0);
			}
		});

		it("stacks with status filter", () => {
			const result = renderWithFolders({
				folder: "folder-2",
				filters: { deviation: "all", status: "searching" },
			});
			for (const item of result.items) {
				expect(item.folderId).toBe("folder-2");
				expect(item.status).toBe("searching");
			}
		});

		it("returns empty when folder has no items", () => {
			const result = renderWithFolders({ folder: "nonexistent-folder" });
			expect(result.totalItems).toBe(0);
			expect(result.items).toHaveLength(0);
		});
	});
});
