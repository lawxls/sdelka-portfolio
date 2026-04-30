import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, makeItem, makeSupplier } from "@/test-utils";
import type { ItemsClient } from "../clients/items-client";
import type { SuppliersClient } from "../clients/suppliers-client";
import type { TendersClient } from "../clients/tenders-client";
import { fakeItemsClient, fakeSuppliersClient, fakeTendersClient, TestClientsProvider } from "../test-clients-provider";
import type { ProcurementInquiry } from "../types";
import { useSelectSupplierForItem, useSetCurrentSupplierFromQuote } from "./use-procurement-operations";

let queryClient: QueryClient;

function makeTender(id: string): ProcurementInquiry {
	return {
		id,
		name: `Tender ${id}`,
		companyId: "company-1",
		folderId: null,
		budget: 0,
		createdAt: "2026-04-01",
		deadline: "2026-05-01",
	};
}

function wrapperFactory(suppliers: SuppliersClient, items: ItemsClient, tenders: TendersClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ suppliers, items, tenders }}>
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
	it("invalidates itemDetail + supplier-list + tenders caches after the operation runs", async () => {
		const supplier = makeSupplier("s1", { companyName: "Альфа", pricePerUnit: 100 });
		const itemsGet = vi.fn().mockResolvedValue(makeItem("item-1", { tenderId: "T-001" }));
		const get = vi.fn().mockResolvedValue(supplier);
		const tendersUpdate = vi.fn().mockResolvedValue(makeTender("T-001"));
		const items = fakeItemsClient({ get: itemsGet });
		const suppliers = fakeSuppliersClient({ get });
		const tenders = fakeTendersClient({ update: tendersUpdate });

		queryClient.setQueryData(["itemDetail", "item-1"], { id: "item-1" });
		queryClient.setQueryData(["suppliers", "item-1", {}], { suppliers: [], nextCursor: null, total: 0 });
		queryClient.setQueryData(["tenders", { foo: "bar" }], { items: [], nextCursor: null });

		const { result } = renderHook(() => useSelectSupplierForItem(), {
			wrapper: wrapperFactory(suppliers, items, tenders),
		});
		await result.current.mutateAsync({ itemId: "item-1", supplierId: "s1" });

		expect(get).toHaveBeenCalledWith("item-1", "s1");
		expect(tendersUpdate).toHaveBeenCalledWith(
			"T-001",
			expect.objectContaining({
				currentSupplier: expect.objectContaining({ companyName: "Альфа", pricePerUnit: 100 }),
			}),
		);
		expect(queryClient.getQueryState(["itemDetail", "item-1"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["suppliers", "item-1", {}])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["tenders", { foo: "bar" }])?.isInvalidated).toBe(true);
	});
});

describe("useSetCurrentSupplierFromQuote", () => {
	it("invalidates items + totals + itemDetail + supplier-lists + tenders after the operation runs", async () => {
		const supplier = makeSupplier("s1", { inn: "7700", tco: 95, pricePerUnit: 100 });
		const itemsGet = vi.fn().mockResolvedValue(makeItem("item-1", { tenderId: "T-001", currentPrice: 100 }));
		const itemsUpdate = vi.fn().mockResolvedValue(makeItem("item-1"));
		const listForItem = vi.fn().mockResolvedValue({ suppliers: [supplier] });
		const tendersUpdate = vi.fn().mockResolvedValue(makeTender("T-001"));
		const items = fakeItemsClient({ get: itemsGet, update: itemsUpdate });
		const suppliers = fakeSuppliersClient({ listForItem });
		const tenders = fakeTendersClient({ update: tendersUpdate });

		queryClient.setQueryData(["itemDetail", "item-1"], { id: "item-1" });
		queryClient.setQueryData(["items", { foo: "bar" }], []);
		queryClient.setQueryData(["totals", {}], { itemCount: 0 });
		queryClient.setQueryData(["suppliers-global"], []);
		queryClient.setQueryData(["tenders", { foo: "bar" }], { items: [], nextCursor: null });

		const { result } = renderHook(() => useSetCurrentSupplierFromQuote(), {
			wrapper: wrapperFactory(suppliers, items, tenders),
		});
		await result.current.mutateAsync({ itemId: "item-1", inn: "7700" });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(listForItem).toHaveBeenCalledWith("item-1");
		expect(tendersUpdate).toHaveBeenCalledWith(
			"T-001",
			expect.objectContaining({ currentSupplier: expect.objectContaining({ inn: "7700" }) }),
		);
		expect(itemsUpdate).toHaveBeenCalledWith("item-1", { currentPrice: 95 });
		expect(queryClient.getQueryState(["itemDetail", "item-1"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["items", { foo: "bar" }])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["totals", {}])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["suppliers-global"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["tenders", { foo: "bar" }])?.isInvalidated).toBe(true);
	});
});
