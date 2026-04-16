import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient, makeItem, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import * as itemsMock from "./items-mock-data";
import type { ProcurementItem } from "./types";
import { useAssignFolder, useCreateItems, useDeleteItem, useItems, useTotals, useUpdateItem } from "./use-items";

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

let queryClient: QueryClient;

const DEFAULT_PARAMS = {
	search: "",
	filters: { deviation: "all" as const, status: "all" as const },
	sort: null,
	folder: undefined,
};

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	setTokens("test-jwt", "test-refresh");
	itemsMock._resetItemsStore();
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("useItems", () => {
	it("returns seeded items", async () => {
		itemsMock._setItems([makeItem("i1"), makeItem("i2")]);

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.items).toHaveLength(2);
		});
		expect(result.current.items.map((i) => i.id)).toEqual(["i1", "i2"]);
	});

	it("returns loading state initially", () => {
		itemsMock._setItems([makeItem("i1")]);
		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });
		expect(result.current.isLoading).toBe(true);
	});

	it("hasNextPage reflects pagination", async () => {
		itemsMock._setItems(Array.from({ length: 35 }, (_, i) => makeItem(`i${i + 1}`)));

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.items.length).toBeGreaterThan(0);
		});
		expect(result.current.hasNextPage).toBe(true);
	});

	it("loadMore fetches next page", async () => {
		itemsMock._setItems(Array.from({ length: 35 }, (_, i) => makeItem(`i${i + 1}`)));

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.items).toHaveLength(30);
		});

		result.current.loadMore();

		await waitFor(() => {
			expect(result.current.items).toHaveLength(35);
		});
		expect(result.current.hasNextPage).toBe(false);
	});

	it("applies status filter", async () => {
		itemsMock._setItems([makeItem("i1", { status: "searching" }), makeItem("i2", { status: "completed" })]);

		const { result } = renderHook(
			() => useItems({ ...DEFAULT_PARAMS, filters: { deviation: "all", status: "completed" } }),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => {
			expect(result.current.items).toHaveLength(1);
		});
		expect(result.current.items[0].id).toBe("i2");
	});

	it("applies search filter", async () => {
		itemsMock._setItems([makeItem("i1", { name: "Widget" }), makeItem("i2", { name: "Gadget" })]);

		const { result } = renderHook(() => useItems({ ...DEFAULT_PARAMS, search: "widg" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.items).toHaveLength(1);
		});
		expect(result.current.items[0].id).toBe("i1");
	});

	it("applies folder filter", async () => {
		itemsMock._setItems([makeItem("i1", { folderId: "f1" }), makeItem("i2", { folderId: "f2" })]);

		const { result } = renderHook(() => useItems({ ...DEFAULT_PARAMS, folder: "f1" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.items).toHaveLength(1);
		});
		expect(result.current.items[0].id).toBe("i1");
	});

	it("applies company filter", async () => {
		itemsMock._setItems([makeItem("i1", { companyId: "c1" }), makeItem("i2", { companyId: "c2" })]);

		const { result } = renderHook(() => useItems({ ...DEFAULT_PARAMS, company: "c2" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.items).toHaveLength(1);
		});
		expect(result.current.items[0].id).toBe("i2");
	});

	it("returns error state when mock throws", async () => {
		vi.spyOn(itemsMock, "fetchItemsMock").mockRejectedValue(new Error("boom"));

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});
	});

	it("refetch retries after error", async () => {
		let calls = 0;
		vi.spyOn(itemsMock, "fetchItemsMock").mockImplementation(async () => {
			calls++;
			if (calls === 1) throw new Error("transient");
			return { items: [makeItem("i1")], nextCursor: null };
		});

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});

		result.current.refetch();

		await waitFor(() => {
			expect(result.current.items).toHaveLength(1);
		});
	});
});

describe("useTotals", () => {
	it("returns totals computed from seeded items", async () => {
		itemsMock._setItems([
			makeItem("i1", { annualQuantity: 10, currentPrice: 100, bestPrice: 80 }),
			makeItem("i2", { annualQuantity: 5, currentPrice: 50, bestPrice: 60 }),
		]);

		const { result } = renderHook(() => useTotals(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.data).toBeTruthy();
		});
		expect(result.current.data).toEqual({
			itemCount: 2,
			totalOverpayment: 200,
			totalSavings: 50,
			totalDeviation: expect.any(Number),
		});
	});

	it("returns loading state initially", () => {
		const { result } = renderHook(() => useTotals(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });
		expect(result.current.isLoading).toBe(true);
	});

	it("returns error state when mock throws", async () => {
		vi.spyOn(itemsMock, "fetchTotalsMock").mockRejectedValue(new Error("boom"));

		const { result } = renderHook(() => useTotals(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});
});

function seedItemsCache(items: ProcurementItem[], folder?: string) {
	queryClient.setQueryData(
		["items", { q: undefined, status: undefined, deviation: undefined, folder, sort: undefined, dir: undefined }],
		{
			pages: [{ items, nextCursor: null }],
			pageParams: [undefined],
		},
	);
}

describe("useUpdateItem", () => {
	it("updates the item via mock store", async () => {
		itemsMock._setItems([makeItem("i1", { name: "Old" })]);

		const { result } = renderHook(() => useUpdateItem(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync({ id: "i1", name: "Renamed" });
		});

		expect(itemsMock._getAllItems().find((i) => i.id === "i1")?.name).toBe("Renamed");
	});

	it("optimistically renames item in cache", async () => {
		itemsMock._setItems([makeItem("i1", { name: "Old" }), makeItem("i2")]);
		seedItemsCache([makeItem("i1", { name: "Old" }), makeItem("i2")]);

		const { result } = renderHook(() => useUpdateItem(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate({ id: "i1", name: "Renamed" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
				"items",
				{ q: undefined, status: undefined, deviation: undefined, folder: undefined, sort: undefined, dir: undefined },
			]);
			expect(data?.pages[0].items.find((i) => i.id === "i1")?.name).toBe("Renamed");
		});
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		itemsMock._setItems([makeItem("i1", { name: "Original" })]);
		seedItemsCache([makeItem("i1", { name: "Original" })]);

		vi.spyOn(itemsMock, "updateItemMock").mockRejectedValue(new Error("fail"));

		const { result } = renderHook(() => useUpdateItem(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "i1", name: "Bad" });
			} catch {}
		});

		const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
			"items",
			{ q: undefined, status: undefined, deviation: undefined, folder: undefined, sort: undefined, dir: undefined },
		]);
		expect(data?.pages[0].items[0].name).toBe("Original");
		expect(toast.error).toHaveBeenCalled();
	});
});

describe("useDeleteItem", () => {
	it("removes the item from the mock store", async () => {
		itemsMock._setItems([makeItem("i1"), makeItem("i2")]);

		const { result } = renderHook(() => useDeleteItem(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync("i1");
		});

		expect(itemsMock._getAllItems().map((i) => i.id)).toEqual(["i2"]);
	});

	it("optimistically removes item from cache", async () => {
		itemsMock._setItems([makeItem("i1"), makeItem("i2"), makeItem("i3")]);
		seedItemsCache([makeItem("i1"), makeItem("i2"), makeItem("i3")]);

		// delay the mutation so we can observe optimistic state first
		vi.spyOn(itemsMock, "deleteItemMock").mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50)));

		const { result } = renderHook(() => useDeleteItem(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate("i2");
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
				"items",
				{ q: undefined, status: undefined, deviation: undefined, folder: undefined, sort: undefined, dir: undefined },
			]);
			expect(data?.pages[0].items).toHaveLength(2);
			expect(data?.pages[0].items.map((i) => i.id)).toEqual(["i1", "i3"]);
		});
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		itemsMock._setItems([makeItem("i1"), makeItem("i2")]);
		seedItemsCache([makeItem("i1"), makeItem("i2")]);

		vi.spyOn(itemsMock, "deleteItemMock").mockRejectedValue(new Error("fail"));

		const { result } = renderHook(() => useDeleteItem(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			try {
				await result.current.mutateAsync("i1");
			} catch {}
		});

		const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
			"items",
			{ q: undefined, status: undefined, deviation: undefined, folder: undefined, sort: undefined, dir: undefined },
		]);
		expect(data?.pages[0].items).toHaveLength(2);
		expect(toast.error).toHaveBeenCalled();
	});
});

describe("useAssignFolder", () => {
	it("optimistically assigns folder to item", async () => {
		itemsMock._setItems([makeItem("i1", { folderId: null })]);
		seedItemsCache([makeItem("i1", { folderId: null })]);

		const { result } = renderHook(() => useAssignFolder(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate({ id: "i1", folderId: "f1" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
				"items",
				{ q: undefined, status: undefined, deviation: undefined, folder: undefined, sort: undefined, dir: undefined },
			]);
			expect(data?.pages[0].items[0].folderId).toBe("f1");
		});
	});

	it("optimistically unassigns folder (folderId: null)", async () => {
		itemsMock._setItems([makeItem("i1", { folderId: "f1" })]);
		seedItemsCache([makeItem("i1", { folderId: "f1" })]);

		const { result } = renderHook(() => useAssignFolder(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate({ id: "i1", folderId: null });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
				"items",
				{ q: undefined, status: undefined, deviation: undefined, folder: undefined, sort: undefined, dir: undefined },
			]);
			expect(data?.pages[0].items[0].folderId).toBeNull();
		});
	});

	it("removes item from folder-filtered cache when reassigned to another folder", async () => {
		itemsMock._setItems([makeItem("i1", { folderId: "f1" }), makeItem("i2", { folderId: "f1" })]);
		seedItemsCache([makeItem("i1", { folderId: "f1" }), makeItem("i2", { folderId: "f1" })], "f1");

		const { result } = renderHook(() => useAssignFolder(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate({ id: "i1", folderId: "f2" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
				"items",
				{ q: undefined, status: undefined, deviation: undefined, folder: "f1", sort: undefined, dir: undefined },
			]);
			expect(data?.pages[0].items).toHaveLength(1);
			expect(data?.pages[0].items[0].id).toBe("i2");
		});
	});

	it("removes item from 'none' cache when assigned to a folder", async () => {
		itemsMock._setItems([makeItem("i1", { folderId: null }), makeItem("i2", { folderId: null })]);
		seedItemsCache([makeItem("i1", { folderId: null }), makeItem("i2", { folderId: null })], "none");

		const { result } = renderHook(() => useAssignFolder(), { wrapper: createQueryWrapper(queryClient) });

		act(() => {
			result.current.mutate({ id: "i1", folderId: "f1" });
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
				"items",
				{ q: undefined, status: undefined, deviation: undefined, folder: "none", sort: undefined, dir: undefined },
			]);
			expect(data?.pages[0].items).toHaveLength(1);
			expect(data?.pages[0].items[0].id).toBe("i2");
		});
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		itemsMock._setItems([makeItem("i1", { folderId: null })]);
		seedItemsCache([makeItem("i1", { folderId: null })]);

		vi.spyOn(itemsMock, "updateItemMock").mockRejectedValue(new Error("fail"));

		const { result } = renderHook(() => useAssignFolder(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "i1", folderId: "bad-id" });
			} catch {}
		});

		const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
			"items",
			{ q: undefined, status: undefined, deviation: undefined, folder: undefined, sort: undefined, dir: undefined },
		]);
		expect(data?.pages[0].items[0].folderId).toBeNull();
		expect(toast.error).toHaveBeenCalled();
	});
});

describe("useCreateItems", () => {
	it("creates items and returns isAsync=false", async () => {
		itemsMock._setItems([]);

		const { result } = renderHook(() => useCreateItems(), { wrapper: createQueryWrapper(queryClient) });

		let response: unknown;
		await act(async () => {
			response = await result.current.mutateAsync([{ name: "Widget A" }]);
		});

		expect((response as { isAsync: boolean }).isAsync).toBe(false);
		expect(itemsMock._getAllItems()[0].name).toBe("Widget A");
	});

	it("shows error toast when mock throws", async () => {
		const { toast } = await import("sonner");
		vi.spyOn(itemsMock, "createItemsBatchMock").mockRejectedValue(new Error("bad"));

		const { result } = renderHook(() => useCreateItems(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			try {
				await result.current.mutateAsync([{ name: "" }]);
			} catch {}
		});

		expect(toast.error).toHaveBeenCalled();
	});
});
