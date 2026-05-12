import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, makeItem, makeSupplier } from "@/test-utils";
import type { ItemsClient } from "../clients/items-client";
import type { ProcurementInquiriesClient } from "../clients/procurement-inquiries-client";
import type { SuppliersClient } from "../clients/suppliers-client";
import {
	fakeItemsClient,
	fakeProcurementInquiriesClient,
	fakeSuppliersClient,
	TestClientsProvider,
} from "../test-clients-provider";
import type { ProcurementInquiry } from "../types";
import {
	useArchiveProcurementInquiryCascade,
	useCreateProcurementInquiryWithItems,
	useSelectSupplierForItem,
	useSetCurrentSupplierFromQuote,
} from "./use-procurement-operations";

let queryClient: QueryClient;

function makeProcurementInquiry(id: string): ProcurementInquiry {
	return {
		id,
		name: `ProcurementInquiry ${id}`,
		companyId: "company-1",
		folderId: null,
		budget: 0,
		createdAt: "2026-04-01",
		deadline: "2026-05-01",
	};
}

function wrapperFactory(
	suppliers: SuppliersClient,
	items: ItemsClient,
	procurementInquiries: ProcurementInquiriesClient,
) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ suppliers, items, procurementInquiries }}>
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
	it("invalidates itemDetail + supplier-list + inquiries caches after the operation runs", async () => {
		const supplier = makeSupplier("s1", { companyName: "Альфа", pricePerUnit: 100 });
		const itemsGet = vi.fn().mockResolvedValue(makeItem("item-1", { procurementInquiryId: "T-001" }));
		const get = vi.fn().mockResolvedValue(supplier);
		const procurementInquiriesUpdate = vi.fn().mockResolvedValue(makeProcurementInquiry("T-001"));
		const items = fakeItemsClient({ get: itemsGet });
		const suppliers = fakeSuppliersClient({ get });
		const procurementInquiries = fakeProcurementInquiriesClient({ update: procurementInquiriesUpdate });

		queryClient.setQueryData(["itemDetail", "item-1"], { id: "item-1" });
		queryClient.setQueryData(["suppliers", "item-1", {}], { suppliers: [], nextCursor: null, total: 0 });
		queryClient.setQueryData(["procurementInquiries", { foo: "bar" }], { items: [], nextCursor: null });

		const { result } = renderHook(() => useSelectSupplierForItem(), {
			wrapper: wrapperFactory(suppliers, items, procurementInquiries),
		});
		await result.current.mutateAsync({ itemId: "item-1", supplierId: "s1" });

		expect(get).toHaveBeenCalledWith("item-1", "s1");
		expect(procurementInquiriesUpdate).toHaveBeenCalledWith(
			"T-001",
			expect.objectContaining({
				currentSupplier: expect.objectContaining({ companyName: "Альфа", pricePerUnit: 100 }),
			}),
		);
		expect(queryClient.getQueryState(["itemDetail", "item-1"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["suppliers", "item-1", {}])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["procurementInquiries", { foo: "bar" }])?.isInvalidated).toBe(true);
	});
});

describe("useArchiveProcurementInquiryCascade", () => {
	it("invalidates procurementInquiries + items + folder stats after archiving", async () => {
		const archive = vi.fn().mockResolvedValue({ id: "T-001", isArchived: true });
		const procurementInquiries = fakeProcurementInquiriesClient({ archive });

		queryClient.setQueryData(["procurementInquiries", { foo: "bar" }], { items: [], nextCursor: null });
		queryClient.setQueryData(["items"], []);
		queryClient.setQueryData(["items-global"], []);
		queryClient.setQueryData(["totals"], { itemCount: 0 });
		queryClient.setQueryData(["folderStats"], {});

		const { result } = renderHook(() => useArchiveProcurementInquiryCascade(), {
			wrapper: ({ children }) => (
				<TestClientsProvider queryClient={queryClient} clients={{ procurementInquiries }}>
					{children}
				</TestClientsProvider>
			),
		});
		await result.current.mutateAsync({ id: "T-001", isArchived: true });

		expect(archive).toHaveBeenCalledWith("T-001", true);
		expect(queryClient.getQueryState(["procurementInquiries", { foo: "bar" }])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["items"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["items-global"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["totals"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["folderStats"])?.isInvalidated).toBe(true);
	});
});

describe("useCreateProcurementInquiryWithItems", () => {
	it("invalidates procurementInquiries + items + totals + folder stats after the operation runs", async () => {
		const createdProcurementInquiry = makeProcurementInquiry("T-001");
		const procurementInquiriesCreate = vi.fn().mockResolvedValue(createdProcurementInquiry);
		const itemsCreate = vi
			.fn()
			.mockResolvedValue({ items: [makeItem("i-1", { procurementInquiryId: "T-001" })], isAsync: false });
		const procurementInquiries = fakeProcurementInquiriesClient({
			create: procurementInquiriesCreate,
			delete: vi.fn(),
		});
		const items = fakeItemsClient({ create: itemsCreate });

		queryClient.setQueryData(["procurementInquiries", { foo: "bar" }], { items: [], nextCursor: null });
		queryClient.setQueryData(["items"], []);
		queryClient.setQueryData(["totals"], { itemCount: 0 });
		queryClient.setQueryData(["folderStats"], {});

		const { result } = renderHook(() => useCreateProcurementInquiryWithItems(), {
			wrapper: ({ children }) => (
				<TestClientsProvider queryClient={queryClient} clients={{ items, procurementInquiries }}>
					{children}
				</TestClientsProvider>
			),
		});

		await result.current.mutateAsync({
			procurementInquiry: { name: "T", companyId: "c1", folderId: null, budget: 0, deadline: "2026-05-01" },
			items: [{ name: "Pos", paymentType: "prepayment" }],
		});

		expect(procurementInquiriesCreate).toHaveBeenCalled();
		expect(itemsCreate).toHaveBeenCalledWith([
			{ name: "Pos", paymentType: "prepayment", procurementInquiryId: "T-001" },
		]);
		expect(queryClient.getQueryState(["procurementInquiries", { foo: "bar" }])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["items"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["totals"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["folderStats"])?.isInvalidated).toBe(true);
	});
});

describe("useSetCurrentSupplierFromQuote", () => {
	it("invalidates items + totals + itemDetail + supplier-lists + inquiries after the operation runs", async () => {
		const supplier = makeSupplier("s1", { inn: "7700", tco: 95, pricePerUnit: 100 });
		const itemsGet = vi
			.fn()
			.mockResolvedValue(makeItem("item-1", { procurementInquiryId: "T-001", currentPrice: 100 }));
		const itemsUpdate = vi.fn().mockResolvedValue(makeItem("item-1"));
		const listForItem = vi.fn().mockResolvedValue({ suppliers: [supplier] });
		const procurementInquiriesUpdate = vi.fn().mockResolvedValue(makeProcurementInquiry("T-001"));
		const items = fakeItemsClient({ get: itemsGet, update: itemsUpdate });
		const suppliers = fakeSuppliersClient({ listForItem });
		const procurementInquiries = fakeProcurementInquiriesClient({ update: procurementInquiriesUpdate });

		queryClient.setQueryData(["itemDetail", "item-1"], { id: "item-1" });
		queryClient.setQueryData(["items", { foo: "bar" }], []);
		queryClient.setQueryData(["totals", {}], { itemCount: 0 });
		queryClient.setQueryData(["suppliers-global"], []);
		queryClient.setQueryData(["procurementInquiries", { foo: "bar" }], { items: [], nextCursor: null });

		const { result } = renderHook(() => useSetCurrentSupplierFromQuote(), {
			wrapper: wrapperFactory(suppliers, items, procurementInquiries),
		});
		await result.current.mutateAsync({ itemId: "item-1", inn: "7700" });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(listForItem).toHaveBeenCalledWith("item-1");
		expect(procurementInquiriesUpdate).toHaveBeenCalledWith(
			"T-001",
			expect.objectContaining({ currentSupplier: expect.objectContaining({ inn: "7700" }) }),
		);
		expect(itemsUpdate).toHaveBeenCalledWith("item-1", { currentPrice: 95 });
		expect(queryClient.getQueryState(["itemDetail", "item-1"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["items", { foo: "bar" }])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["totals", {}])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["suppliers-global"])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["procurementInquiries", { foo: "bar" }])?.isInvalidated).toBe(true);
	});
});
