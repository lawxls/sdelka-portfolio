import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient } from "@/test-utils";
import { _resetSupplierStore, _setSendShouldFail, _setSupplierMockDelay, getAllSuppliers } from "./supplier-mock-data";
import type { Supplier } from "./supplier-types";
import {
	useDeleteSuppliers,
	useInfiniteSuppliers,
	useSendSupplierMessage,
	useSupplier,
	useSuppliers,
} from "./use-suppliers";

// useSuppliers returns the full list (including archived); the exact count depends on the
// mock layer's per-item target, so we resolve it at the start of each test.
async function getItem1TotalCount(): Promise<number> {
	return (await getAllSuppliers("item-1")).suppliers.length;
}

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
	it("fetches all suppliers for a procurement item", async () => {
		const expected = await getItem1TotalCount();
		const { result } = renderHook(() => useSuppliers("item-1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toBeTruthy();
		});

		expect(result.current.data?.suppliers).toHaveLength(expected);
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
});

describe("useInfiniteSuppliers", () => {
	it("fetches first page of suppliers", async () => {
		const { result } = renderHook(() => useInfiniteSuppliers("item-1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toBeTruthy();
		});

		const firstPage = result.current.data?.pages[0];
		expect(firstPage?.suppliers.length).toBeGreaterThan(0);
		expect(firstPage?.suppliers.length).toBeLessThanOrEqual(30);
	});

	it("includes filter params in query key for cache isolation", async () => {
		const wrapper = createQueryWrapper(queryClient);
		renderHook(() => useInfiniteSuppliers("item-1", { search: "Альфа" }), { wrapper });

		await waitFor(() => {
			expect(queryClient.getQueryData(["suppliers", "item-1", { search: "Альфа" }])).toBeTruthy();
		});

		renderHook(() => useInfiniteSuppliers("item-1", { search: "Бета" }), { wrapper });

		await waitFor(() => {
			expect(queryClient.getQueryData(["suppliers", "item-1", { search: "Бета" }])).toBeTruthy();
		});
	});
});

describe("useSupplier", () => {
	it("fetches a single supplier by itemId and supplierId", async () => {
		const wrapper = createQueryWrapper(queryClient);
		const { result: listResult } = renderHook(() => useSuppliers("item-1"), { wrapper });
		await waitFor(() => expect(listResult.current.data).toBeTruthy());
		const supplierId = listResult.current.data?.suppliers[0].id as string;

		const { result } = renderHook(() => useSupplier("item-1", supplierId), { wrapper });
		await waitFor(() => expect(result.current.data).toBeTruthy());
		expect(result.current.data?.id).toBe(supplierId);
		expect(result.current.data?.itemId).toBe("item-1");
	});

	it("does not fetch when supplierId is null", () => {
		const { result } = renderHook(() => useSupplier("item-1", null), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});
});

describe("useDeleteSuppliers", () => {
	it("deletes suppliers and invalidates cache", async () => {
		const expected = await getItem1TotalCount();
		const wrapper = createQueryWrapper(queryClient);

		const { result: suppliersResult } = renderHook(() => useSuppliers("item-1"), { wrapper });
		await waitFor(() => {
			expect(suppliersResult.current.data?.suppliers).toHaveLength(expected);
		});

		const idToDelete = suppliersResult.current.data?.suppliers[0].id as string;

		const { result: deleteResult } = renderHook(() => useDeleteSuppliers(), { wrapper });
		await deleteResult.current.mutateAsync({ itemId: "item-1", supplierIds: [idToDelete] });

		await waitFor(() => {
			expect(suppliersResult.current.data?.suppliers).toHaveLength(expected - 1);
		});
	});
});

describe("useSendSupplierMessage", () => {
	it("optimistically adds message to supplier cache", async () => {
		const wrapper = createQueryWrapper(queryClient);

		// Populate the single-supplier cache
		const { result: supplierResult } = renderHook(() => useSupplier("item-1", "supplier-item-1-1"), { wrapper });
		await waitFor(() => expect(supplierResult.current.data).toBeTruthy());
		const initialCount = supplierResult.current.data?.chatHistory.length ?? 0;

		const { result: mutationResult } = renderHook(() => useSendSupplierMessage("item-1", "supplier-item-1-1"), {
			wrapper,
		});

		mutationResult.current.mutate({ body: "Тестовое сообщение", files: [] });

		// Optimistic update should appear immediately (before API resolves)
		await waitFor(() => {
			const cached = queryClient.getQueryData<Supplier | null>(["supplier", "item-1", "supplier-item-1-1"]);
			expect(cached?.chatHistory).toHaveLength(initialCount + 1);
			expect(cached?.chatHistory[cached.chatHistory.length - 1].body).toBe("Тестовое сообщение");
			expect(cached?.chatHistory[cached.chatHistory.length - 1].isOurs).toBe(true);
		});
	});

	it("rolls back on error", async () => {
		const wrapper = createQueryWrapper(queryClient);

		const { result: supplierResult } = renderHook(() => useSupplier("item-1", "supplier-item-1-1"), { wrapper });
		await waitFor(() => expect(supplierResult.current.data).toBeTruthy());
		const initialCount = supplierResult.current.data?.chatHistory.length ?? 0;

		_setSendShouldFail(true);

		const { result: mutationResult } = renderHook(() => useSendSupplierMessage("item-1", "supplier-item-1-1"), {
			wrapper,
		});

		mutationResult.current.mutate({ body: "Сообщение, которое не дойдёт", files: [] });

		// After error, cache should roll back to original
		await waitFor(() => {
			expect(mutationResult.current.isError).toBe(true);
		});

		const cached = queryClient.getQueryData<Supplier | null>(["supplier", "item-1", "supplier-item-1-1"]);
		expect(cached?.chatHistory).toHaveLength(initialCount);
	});

	it("optimistic update includes attachments when files provided", async () => {
		const wrapper = createQueryWrapper(queryClient);

		const { result: supplierResult } = renderHook(() => useSupplier("item-1", "supplier-item-1-1"), { wrapper });
		await waitFor(() => expect(supplierResult.current.data).toBeTruthy());

		const { result: mutationResult } = renderHook(() => useSendSupplierMessage("item-1", "supplier-item-1-1"), {
			wrapper,
		});

		const file = new File([new Uint8Array(5000)], "offer.pdf", { type: "application/pdf" });
		mutationResult.current.mutate({ body: "С файлом", files: [file] });

		await waitFor(() => {
			const cached = queryClient.getQueryData<Supplier | null>(["supplier", "item-1", "supplier-item-1-1"]);
			const lastMsg = cached?.chatHistory[cached.chatHistory.length - 1];
			expect(lastMsg?.attachments).toHaveLength(1);
			expect(lastMsg?.attachments?.[0].name).toBe("offer.pdf");
		});
	});
});
