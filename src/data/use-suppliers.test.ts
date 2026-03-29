import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient } from "@/test-utils";
import { _resetSupplierStore, _setSupplierMockDelay } from "./supplier-mock-data";
import { useDeleteSuppliers, useSuppliers } from "./use-suppliers";

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	_resetSupplierStore();
	_setSupplierMockDelay(0, 0);
});

afterEach(() => {
	_resetSupplierStore();
	vi.restoreAllMocks();
});

describe("useSuppliers", () => {
	it("fetches suppliers for a procurement item", async () => {
		const { result } = renderHook(() => useSuppliers("item-1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toBeTruthy();
		});

		expect(result.current.data?.suppliers).toHaveLength(10);
		for (const s of result.current.data?.suppliers ?? []) {
			expect(s.itemId).toBe("item-1");
		}
	});

	it("returns loading state initially", () => {
		_setSupplierMockDelay(10000, 10000);
		const { result } = renderHook(() => useSuppliers("item-1"), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.isLoading).toBe(true);
	});

	it("does not fetch when itemId is null", () => {
		const { result } = renderHook(() => useSuppliers(null), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});

	it("uses itemId in query key for cache isolation", async () => {
		renderHook(() => useSuppliers("item-1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			const data = queryClient.getQueryData(["suppliers", "item-1"]);
			expect(data).toBeTruthy();
		});

		renderHook(() => useSuppliers("item-2"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			const data = queryClient.getQueryData(["suppliers", "item-2"]);
			expect(data).toBeTruthy();
		});

		// Two separate cache entries
		const entries = queryClient.getQueriesData({ queryKey: ["suppliers"] });
		expect(entries.length).toBe(2);
	});

	it("includes filter params in query key for cache isolation", async () => {
		const wrapper = createQueryWrapper(queryClient);
		renderHook(() => useSuppliers("item-1", { search: "Альфа" }), { wrapper });

		await waitFor(() => {
			expect(queryClient.getQueryData(["suppliers", "item-1", { search: "Альфа" }])).toBeTruthy();
		});

		renderHook(() => useSuppliers("item-1", { search: "Бета" }), { wrapper });

		await waitFor(() => {
			expect(queryClient.getQueryData(["suppliers", "item-1", { search: "Бета" }])).toBeTruthy();
		});

		const entries = queryClient.getQueriesData({ queryKey: ["suppliers", "item-1"] });
		expect(entries.length).toBe(2);
	});
});

describe("useDeleteSuppliers", () => {
	it("deletes suppliers and invalidates cache", async () => {
		const wrapper = createQueryWrapper(queryClient);

		// First load suppliers
		const { result: suppliersResult } = renderHook(() => useSuppliers("item-1"), { wrapper });
		await waitFor(() => {
			expect(suppliersResult.current.data?.suppliers).toHaveLength(10);
		});

		const idToDelete = suppliersResult.current.data?.suppliers[0].id as string;

		// Delete one supplier
		const { result: deleteResult } = renderHook(() => useDeleteSuppliers(), { wrapper });
		await deleteResult.current.mutateAsync({ itemId: "item-1", supplierIds: [idToDelete] });

		// Cache should be invalidated — refetched data should have 9
		await waitFor(() => {
			expect(suppliersResult.current.data?.suppliers).toHaveLength(9);
		});
	});
});
