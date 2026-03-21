import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ProcurementItem } from "./types";
import { useItemOverrides } from "./use-item-overrides";

const LS_KEY = "item-overrides";

const testItems: ProcurementItem[] = [
	{
		id: "1",
		name: "Item A",
		status: "searching",
		annualQuantity: 100,
		currentPrice: 1000,
		bestPrice: 900,
		averagePrice: 950,
		folderId: null,
	},
	{
		id: "2",
		name: "Item B",
		status: "completed",
		annualQuantity: 200,
		currentPrice: 2000,
		bestPrice: 1800,
		averagePrice: 1900,
		folderId: "f-1",
	},
	{
		id: "3",
		name: "Item C",
		status: "negotiating",
		annualQuantity: 300,
		currentPrice: 3000,
		bestPrice: null,
		averagePrice: null,
		folderId: null,
	},
];

afterEach(() => {
	localStorage.clear();
});

describe("useItemOverrides", () => {
	describe("applyOverrides", () => {
		it("returns items unchanged when no overrides exist", () => {
			const { result } = renderHook(() => useItemOverrides());
			const applied = result.current.applyOverrides(testItems);
			expect(applied).toEqual(testItems);
		});

		it("filters out deleted items", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.deleteItem("2");
			});
			const applied = result.current.applyOverrides(testItems);
			expect(applied).toHaveLength(2);
			expect(applied.find((i) => i.id === "2")).toBeUndefined();
		});

		it("patches renamed items", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.renameItem("1", "Renamed A");
			});
			const applied = result.current.applyOverrides(testItems);
			expect(applied.find((i) => i.id === "1")?.name).toBe("Renamed A");
		});

		it("applies both deletions and renames", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.deleteItem("2");
				result.current.renameItem("3", "Renamed C");
			});
			const applied = result.current.applyOverrides(testItems);
			expect(applied).toHaveLength(2);
			expect(applied.find((i) => i.id === "3")?.name).toBe("Renamed C");
		});

		it("does not mutate original items", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.renameItem("1", "New Name");
			});
			result.current.applyOverrides(testItems);
			expect(testItems[0].name).toBe("Item A");
		});
	});

	describe("deleteItem", () => {
		it("removes item from applied list", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.deleteItem("1");
			});
			const applied = result.current.applyOverrides(testItems);
			expect(applied.find((i) => i.id === "1")).toBeUndefined();
		});

		it("persists to localStorage", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.deleteItem("1");
			});
			const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
			expect(stored.deleted).toContain("1");
		});

		it("is idempotent for same id", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.deleteItem("1");
				result.current.deleteItem("1");
			});
			const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
			expect(stored.deleted.filter((id: string) => id === "1")).toHaveLength(1);
		});
	});

	describe("renameItem", () => {
		it("changes item name in applied list", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.renameItem("2", "New B");
			});
			const applied = result.current.applyOverrides(testItems);
			expect(applied.find((i) => i.id === "2")?.name).toBe("New B");
		});

		it("persists to localStorage", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.renameItem("2", "New B");
			});
			const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
			expect(stored.renamed["2"]).toBe("New B");
		});

		it("overwrites previous rename", () => {
			const { result } = renderHook(() => useItemOverrides());
			act(() => {
				result.current.renameItem("1", "First");
			});
			act(() => {
				result.current.renameItem("1", "Second");
			});
			const applied = result.current.applyOverrides(testItems);
			expect(applied.find((i) => i.id === "1")?.name).toBe("Second");
		});
	});

	describe("localStorage persistence", () => {
		it("reads from localStorage on mount", () => {
			localStorage.setItem(LS_KEY, JSON.stringify({ deleted: ["2"], renamed: { "1": "Stored Name" } }));
			const { result } = renderHook(() => useItemOverrides());
			const applied = result.current.applyOverrides(testItems);
			expect(applied).toHaveLength(2);
			expect(applied.find((i) => i.id === "1")?.name).toBe("Stored Name");
		});

		it("falls back to empty overrides when localStorage empty", () => {
			const { result } = renderHook(() => useItemOverrides());
			const applied = result.current.applyOverrides(testItems);
			expect(applied).toHaveLength(3);
		});
	});
});
