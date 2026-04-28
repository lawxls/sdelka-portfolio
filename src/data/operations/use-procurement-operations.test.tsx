import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, makeItem, makeSupplier } from "@/test-utils";
import type { ItemsClient } from "../clients/items-client";
import type { SuppliersClient } from "../clients/suppliers-client";
import { fakeItemsClient, fakeSuppliersClient, TestClientsProvider } from "../test-clients-provider";
import { useSelectSupplierForItem, useSetCurrentSupplierFromQuote } from "./use-procurement-operations";

let queryClient: QueryClient;

function wrapperFactory(suppliers: SuppliersClient, items: ItemsClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ suppliers, items }}>
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

describe("useSelectSupplierForItem", () => {
	it("invalidates itemDetail + supplier-list caches after the operation runs", async () => {
		const supplier = makeSupplier("s1", { companyName: "Альфа", pricePerUnit: 100 });
		const get = vi.fn().mockResolvedValue(supplier);
		const update = vi.fn().mockResolvedValue(makeItem("item-1"));
		const suppliers = fakeSuppliersClient({ get });
		const items = fakeItemsClient({ update });

		queryClient.setQueryData(["itemDetail", "item-1"], { id: "item-1" });
		queryClient.setQueryData(["suppliers", "item-1", {}], { suppliers: [], nextCursor: null, total: 0 });

		const { result } = renderHook(() => useSelectSupplierForItem(), {
			wrapper: wrapperFactory(suppliers, items),
		});
		await result.current.mutateAsync({ itemId: "item-1", supplierId: "s1" });

		expect(get).toHaveBeenCalledWith("item-1", "s1");
		expect(update).toHaveBeenCalledWith(
			"item-1",
			expect.objectContaining({
				currentSupplier: expect.objectContaining({ companyName: "Альфа", pricePerUnit: 100 }),
			}),
		);
		expect(queryClient.getQueryState(["itemDetail", "item-1"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["suppliers", "item-1", {}])?.isInvalidated).toBe(true);
	});
});

describe("useSetCurrentSupplierFromQuote", () => {
	it("invalidates items + totals + itemDetail + supplier lists after the operation runs", async () => {
		const supplier = makeSupplier("s1", { inn: "7700", tco: 95, pricePerUnit: 100 });
		const listForItem = vi.fn().mockResolvedValue({ suppliers: [supplier] });
		const update = vi.fn().mockResolvedValue(makeItem("item-1"));
		const suppliers = fakeSuppliersClient({ listForItem });
		const items = fakeItemsClient({ update });

		queryClient.setQueryData(["itemDetail", "item-1"], { id: "item-1" });
		queryClient.setQueryData(["items", { foo: "bar" }], []);
		queryClient.setQueryData(["totals", {}], { itemCount: 0 });
		queryClient.setQueryData(["suppliers-global"], []);

		const { result } = renderHook(() => useSetCurrentSupplierFromQuote(), {
			wrapper: wrapperFactory(suppliers, items),
		});
		await result.current.mutateAsync({ itemId: "item-1", inn: "7700" });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(listForItem).toHaveBeenCalledWith("item-1");
		expect(update).toHaveBeenCalledWith(
			"item-1",
			expect.objectContaining({ currentPrice: 95, currentSupplier: expect.objectContaining({ inn: "7700" }) }),
		);
		expect(queryClient.getQueryState(["itemDetail", "item-1"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["items", { foo: "bar" }])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["totals", {}])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["suppliers-global"])?.isInvalidated).toBe(true);
	});
});
