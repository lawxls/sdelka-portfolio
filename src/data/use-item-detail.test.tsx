import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, makeItem } from "@/test-utils";
import type { ItemsClient } from "./clients/items-client";
import { NotFoundError } from "./errors";
import { fakeItemsClient, TestClientsProvider } from "./test-clients-provider";
import { useItemDetail, useUpdateItemDetail } from "./use-item-detail";

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

let queryClient: QueryClient;

function wrapperFactory(client: ItemsClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ items: client }}>
			{children}
		</TestClientsProvider>
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useItemDetail", () => {
	it("fetches a procurement item by id from the client", async () => {
		const get = vi.fn().mockResolvedValue(makeItem("item-1", { name: "Полотно ПВД 2600 мм" }));
		const client = fakeItemsClient({ get });

		const { result } = renderHook(() => useItemDetail("item-1"), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data).toBeTruthy());
		expect(result.current.data?.id).toBe("item-1");
		expect(get).toHaveBeenCalledWith("item-1");
	});

	it("does not fetch when itemId is null", () => {
		const get = vi.fn();
		const client = fakeItemsClient({ get });

		const { result } = renderHook(() => useItemDetail(null), { wrapper: wrapperFactory(client) });
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
		expect(get).not.toHaveBeenCalled();
	});

	it("surfaces NotFoundError as a typed error", async () => {
		const get = vi.fn().mockRejectedValue(new NotFoundError({ id: "missing" }));
		const client = fakeItemsClient({ get });

		const { result } = renderHook(() => useItemDetail("missing"), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.error).toBeTruthy());
		expect(result.current.error).toBeInstanceOf(NotFoundError);
	});
});

describe("useUpdateItemDetail", () => {
	it("calls update on the client and writes returned item back to detail cache", async () => {
		const updated = makeItem("item-1", { name: "Новое название" });
		const update = vi.fn().mockResolvedValue(updated);
		const client = fakeItemsClient({ update });

		const { result } = renderHook(() => useUpdateItemDetail(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({ id: "item-1", name: "Новое название" });
		});

		expect(update).toHaveBeenCalledWith("item-1", { name: "Новое название" });
		expect(queryClient.getQueryData(["itemDetail", "item-1"])).toEqual(updated);
	});

	it("shows toast on error", async () => {
		const { toast } = await import("sonner");
		const update = vi.fn().mockRejectedValue(new Error("fail"));
		const client = fakeItemsClient({ update });

		const { result } = renderHook(() => useUpdateItemDetail(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			try {
				await result.current.mutateAsync({ id: "item-1", name: "x" });
			} catch {}
		});

		expect(toast.error).toHaveBeenCalled();
	});
});
