import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProcurementItem } from "./types";
import { FREQUENCIES, FREQUENCY_LABELS, PROCUREMENT_TYPE_LABELS } from "./types";
import { useCustomItems } from "./use-custom-items";

const LS_KEY = "custom-items";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("useCustomItems", () => {
	describe("getItems", () => {
		it("returns empty array when no custom items exist", () => {
			const { result } = renderHook(() => useCustomItems());
			expect(result.current.getItems()).toEqual([]);
		});

		it("returns previously added items", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Test Item" }]);
			});
			const items = result.current.getItems();
			expect(items).toHaveLength(1);
			expect(items[0].name).toBe("Test Item");
		});
	});

	describe("addItems", () => {
		it("creates ProcurementItem with status searching and null prices", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "New Position" }]);
			});
			const item = result.current.getItems()[0];
			expect(item.status).toBe("searching");
			expect(item.bestPrice).toBeNull();
			expect(item.averagePrice).toBeNull();
		});

		it("generates unique IDs for each item", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "A" }, { name: "B" }]);
			});
			const items = result.current.getItems();
			expect(items[0].id).not.toBe(items[1].id);
		});

		it("sets default values for annualQuantity, currentPrice, and folderId", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Item" }]);
			});
			const item = result.current.getItems()[0];
			expect(item.annualQuantity).toBe(0);
			expect(item.currentPrice).toBe(0);
			expect(item.folderId).toBeNull();
		});

		it("maps description, unit, annualQuantity, and currentPrice to ProcurementItem", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([
					{
						name: "Цемент М500",
						description: "Портландцемент",
						unit: "т",
						annualQuantity: 120,
						currentPrice: 5500,
					},
				]);
			});
			const item = result.current.getItems()[0];
			expect(item.description).toBe("Портландцемент");
			expect(item.unit).toBe("т");
			expect(item.annualQuantity).toBe(120);
			expect(item.currentPrice).toBe(5500);
		});

		it("leaves description and unit undefined when not provided", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Plain" }]);
			});
			const item = result.current.getItems()[0];
			expect(item.description).toBeUndefined();
			expect(item.unit).toBeUndefined();
		});

		it("adds multiple items in a single call", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "A" }, { name: "B" }, { name: "C" }]);
			});
			expect(result.current.getItems()).toHaveLength(3);
		});

		it("accumulates items across multiple addItems calls", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "First" }]);
			});
			act(() => {
				result.current.addItems([{ name: "Second" }]);
			});
			expect(result.current.getItems()).toHaveLength(2);
		});

		it("persists items to localStorage", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Persisted" }]);
			});
			const stored: ProcurementItem[] = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
			expect(stored).toHaveLength(1);
			expect(stored[0].name).toBe("Persisted");
		});
	});

	describe("localStorage persistence", () => {
		it("reads items from localStorage on mount", () => {
			const items: ProcurementItem[] = [
				{
					id: "custom-abc",
					name: "Stored Item",
					status: "searching",
					annualQuantity: 0,
					currentPrice: 0,
					bestPrice: null,
					averagePrice: null,
					folderId: null,
				},
			];
			localStorage.setItem(LS_KEY, JSON.stringify(items));

			const { result } = renderHook(() => useCustomItems());
			expect(result.current.getItems()).toHaveLength(1);
			expect(result.current.getItems()[0].name).toBe("Stored Item");
		});

		it("survives remount (simulating page reload)", () => {
			const { result, unmount } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Survivor" }]);
			});
			unmount();

			const { result: result2 } = renderHook(() => useCustomItems());
			expect(result2.current.getItems()).toHaveLength(1);
			expect(result2.current.getItems()[0].name).toBe("Survivor");
		});

		it("falls back to empty array when localStorage is empty", () => {
			const { result } = renderHook(() => useCustomItems());
			expect(result.current.getItems()).toEqual([]);
		});
	});

	describe("procurementType and frequency", () => {
		it("maps procurementType and frequency to ProcurementItem", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([
					{
						name: "Regular Item",
						procurementType: "regular",
						frequency: "monthly",
					},
				]);
			});
			const item = result.current.getItems()[0];
			expect(item.procurementType).toBe("regular");
			expect(item.frequency).toBe("monthly");
		});

		it("leaves procurementType and frequency undefined when not provided", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([{ name: "Plain" }]);
			});
			const item = result.current.getItems()[0];
			expect(item.procurementType).toBeUndefined();
			expect(item.frequency).toBeUndefined();
		});

		it("sets frequency undefined for one-time procurement", () => {
			const { result } = renderHook(() => useCustomItems());
			act(() => {
				result.current.addItems([
					{
						name: "One-time",
						procurementType: "one-time",
					},
				]);
			});
			const item = result.current.getItems()[0];
			expect(item.procurementType).toBe("one-time");
			expect(item.frequency).toBeUndefined();
		});
	});
});

describe("type constants", () => {
	it("PROCUREMENT_TYPE_LABELS covers both types", () => {
		expect(Object.keys(PROCUREMENT_TYPE_LABELS)).toEqual(["one-time", "regular"]);
	});

	it("FREQUENCY_LABELS covers all 6 frequencies", () => {
		expect(Object.keys(FREQUENCY_LABELS)).toHaveLength(6);
		expect(FREQUENCY_LABELS.weekly).toBe("Еженедельно");
		expect(FREQUENCY_LABELS["on-demand"]).toBe("По требованию");
	});

	it("FREQUENCIES array matches FREQUENCY_LABELS keys", () => {
		expect(FREQUENCIES).toEqual(Object.keys(FREQUENCY_LABELS));
	});
});
