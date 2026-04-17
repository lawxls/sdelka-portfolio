import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient } from "@/test-utils";
import { _resetItemDetailStore, _setItemDetailMockDelay } from "./item-detail-mock-data";
import { useItemDetail, useUpdateItemDetail } from "./use-item-detail";

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	_resetItemDetailStore();
	_setItemDetailMockDelay(0, 0);
});

afterEach(() => {
	_resetItemDetailStore();
	vi.restoreAllMocks();
});

describe("useItemDetail", () => {
	it("fetches a procurement item by ID", async () => {
		const { result } = renderHook(() => useItemDetail("item-1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.data).toBeTruthy());

		expect(result.current.data?.id).toBe("item-1");
		expect(result.current.data?.name).toBe("Полотно ПВД 2600 мм");
		expect(result.current.data?.annualQuantity).toBe(180_000);
	});

	it("does not fetch when itemId is null", () => {
		const { result } = renderHook(() => useItemDetail(null), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});
});

describe("useUpdateItemDetail", () => {
	it("updates item and sets cache", async () => {
		const wrapper = createQueryWrapper(queryClient);

		// Seed cache
		const { result: detailResult } = renderHook(() => useItemDetail("item-1"), { wrapper });
		await waitFor(() => expect(detailResult.current.data).toBeTruthy());

		// Update
		const { result: mutationResult } = renderHook(() => useUpdateItemDetail(), { wrapper });
		await mutationResult.current.mutateAsync({ id: "item-1", name: "Новое название" });

		// Cache should be updated
		await waitFor(() => {
			expect(detailResult.current.data?.name).toBe("Новое название");
		});
	});
});
