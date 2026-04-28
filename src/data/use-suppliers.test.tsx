import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, makeSupplier } from "@/test-utils";
import type { SuppliersClient } from "./clients/suppliers-client";
import { NetworkError, NotFoundError } from "./errors";
import { fakeSuppliersClient, TestClientsProvider } from "./test-clients-provider";
import {
	useDeleteSuppliers,
	useInfiniteSuppliers,
	useSendSupplierMessage,
	useSendSupplierRequest,
	useSupplier,
	useSuppliers,
} from "./use-suppliers";

let queryClient: QueryClient;

function wrapperFactory(client: SuppliersClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ suppliers: client }}>
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

describe("useSuppliers", () => {
	it("fetches all suppliers for a procurement item", async () => {
		const seed = [makeSupplier("s1"), makeSupplier("s2"), makeSupplier("s3")];
		const listForItem = vi.fn().mockResolvedValue({ suppliers: seed });
		const client = fakeSuppliersClient({ listForItem });

		const { result } = renderHook(() => useSuppliers("item-1"), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data).toBeTruthy());
		expect(result.current.data?.suppliers).toHaveLength(3);
		expect(listForItem).toHaveBeenCalledWith("item-1");
	});

	it("does not fetch when itemId is null", () => {
		const listForItem = vi.fn();
		const client = fakeSuppliersClient({ listForItem });
		const { result } = renderHook(() => useSuppliers(null), { wrapper: wrapperFactory(client) });
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
		expect(listForItem).not.toHaveBeenCalled();
	});
});

describe("useInfiniteSuppliers", () => {
	it("threads cursor between pages", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce({ suppliers: [makeSupplier("s1"), makeSupplier("s2")], nextCursor: "s3", total: 4 })
			.mockResolvedValueOnce({ suppliers: [makeSupplier("s3"), makeSupplier("s4")], nextCursor: null, total: 4 });
		const client = fakeSuppliersClient({ list });

		const { result } = renderHook(() => useInfiniteSuppliers("item-1"), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
		expect(result.current.hasNextPage).toBe(true);

		result.current.fetchNextPage();

		await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
		expect(list).toHaveBeenLastCalledWith("item-1", expect.objectContaining({ cursor: "s3" }));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("includes filter params in the query key for cache isolation", async () => {
		const list = vi.fn().mockResolvedValue({ suppliers: [], nextCursor: null, total: 0 });
		const client = fakeSuppliersClient({ list });
		const wrapper = wrapperFactory(client);

		renderHook(() => useInfiniteSuppliers("item-1", { search: "Альфа" }), { wrapper });
		await waitFor(() => expect(queryClient.getQueryData(["suppliers", "item-1", { search: "Альфа" }])).toBeTruthy());

		renderHook(() => useInfiniteSuppliers("item-1", { search: "Бета" }), { wrapper });
		await waitFor(() => expect(queryClient.getQueryData(["suppliers", "item-1", { search: "Бета" }])).toBeTruthy());
	});
});

describe("useSupplier", () => {
	it("fetches a single supplier", async () => {
		const get = vi.fn().mockResolvedValue(makeSupplier("s1", { companyName: "Альфа" }));
		const client = fakeSuppliersClient({ get });
		const { result } = renderHook(() => useSupplier("item-1", "s1"), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data?.companyName).toBe("Альфа"));
		expect(get).toHaveBeenCalledWith("item-1", "s1");
	});

	it("does not fetch when supplierId is null", () => {
		const get = vi.fn();
		const client = fakeSuppliersClient({ get });
		const { result } = renderHook(() => useSupplier("item-1", null), { wrapper: wrapperFactory(client) });
		expect(result.current.isLoading).toBe(false);
		expect(get).not.toHaveBeenCalled();
	});
});

describe("useDeleteSuppliers", () => {
	it("invalidates supplier lists on success", async () => {
		const delFn = vi.fn().mockResolvedValue(undefined);
		const client = fakeSuppliersClient({ delete: delFn });
		queryClient.setQueryData(["suppliers", "item-1", {}], { suppliers: [], nextCursor: null, total: 0 });

		const { result } = renderHook(() => useDeleteSuppliers(), { wrapper: wrapperFactory(client) });

		await result.current.mutateAsync({ itemId: "item-1", supplierIds: ["s1"] });
		expect(delFn).toHaveBeenCalledWith("item-1", ["s1"]);

		const state = queryClient.getQueryState(["suppliers", "item-1", {}]);
		expect(state?.isInvalidated).toBe(true);
	});
});

describe("useSendSupplierRequest", () => {
	it("invalidates suppliers + items + totals + itemDetail when item flips negotiating", async () => {
		const sendRequest = vi.fn().mockResolvedValue(["s1"]);
		const client = fakeSuppliersClient({ sendRequest });
		queryClient.setQueryData(["items", { foo: "bar" }], []);
		queryClient.setQueryData(["totals", {}], { itemCount: 0 });
		queryClient.setQueryData(["itemDetail", "item-1"], { id: "item-1" });

		const { result } = renderHook(() => useSendSupplierRequest(), { wrapper: wrapperFactory(client) });
		await result.current.mutateAsync({ itemId: "item-1", supplierIds: ["s1"] });

		expect(sendRequest).toHaveBeenCalledWith("item-1", ["s1"]);
		expect(queryClient.getQueryState(["items", { foo: "bar" }])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["totals", {}])?.isInvalidated).toBe(true);
		expect(queryClient.getQueryState(["itemDetail", "item-1"])?.isInvalidated).toBe(true);
	});
});

describe("useSendSupplierMessage", () => {
	it("optimistically appends an outgoing message", async () => {
		const seed = makeSupplier("s1", { chatHistory: [] });
		const sendMessage = vi.fn().mockImplementation(async (_iid: string, _sid: string, body: string) => ({
			sender: "Агент",
			timestamp: new Date().toISOString(),
			body,
			isOurs: true,
		}));
		const client = fakeSuppliersClient({ sendMessage });
		queryClient.setQueryData(["supplier", "item-1", "s1"], seed);

		const { result } = renderHook(() => useSendSupplierMessage("item-1", "s1"), {
			wrapper: wrapperFactory(client),
		});
		result.current.mutate({ body: "Тест", files: [] });

		await waitFor(() => {
			const cached = queryClient.getQueryData<typeof seed>(["supplier", "item-1", "s1"]);
			expect(cached?.chatHistory).toHaveLength(1);
			expect(cached?.chatHistory[0].body).toBe("Тест");
			expect(cached?.chatHistory[0].isOurs).toBe(true);
		});
	});

	it("rolls back on error", async () => {
		const seed = makeSupplier("s1", { chatHistory: [] });
		const sendMessage = vi.fn().mockRejectedValue(new Error("boom"));
		const client = fakeSuppliersClient({ sendMessage });
		queryClient.setQueryData(["supplier", "item-1", "s1"], seed);

		const { result } = renderHook(() => useSendSupplierMessage("item-1", "s1"), {
			wrapper: wrapperFactory(client),
		});
		result.current.mutate({ body: "Не дойдёт", files: [] });

		await waitFor(() => expect(result.current.isError).toBe(true));
		const cached = queryClient.getQueryData<typeof seed>(["supplier", "item-1", "s1"]);
		expect(cached?.chatHistory).toHaveLength(0);
	});

	it("optimistic update includes attachments when files are passed", async () => {
		const seed = makeSupplier("s1", { chatHistory: [] });
		const sendMessage = vi.fn().mockResolvedValue({
			sender: "Агент",
			timestamp: new Date().toISOString(),
			body: "С файлом",
			isOurs: true,
		});
		const client = fakeSuppliersClient({ sendMessage });
		queryClient.setQueryData(["supplier", "item-1", "s1"], seed);

		const { result } = renderHook(() => useSendSupplierMessage("item-1", "s1"), {
			wrapper: wrapperFactory(client),
		});
		const file = new File([new Uint8Array(5000)], "offer.pdf", { type: "application/pdf" });
		result.current.mutate({ body: "С файлом", files: [file] });

		await waitFor(() => {
			const cached = queryClient.getQueryData<typeof seed>(["supplier", "item-1", "s1"]);
			expect(cached?.chatHistory[0].attachments).toEqual([{ name: "offer.pdf", type: "pdf", size: 5000 }]);
		});
	});
});

describe("error-class branching", () => {
	it("NotFoundError surfaces on get", async () => {
		const get = vi.fn().mockRejectedValue(new NotFoundError({ id: "missing" }));
		const client = fakeSuppliersClient({ get });

		const { result } = renderHook(() => useSupplier("item-1", "missing"), { wrapper: wrapperFactory(client) });
		await waitFor(() => expect(result.current.error).toBeInstanceOf(NotFoundError));
	});

	it("NetworkError surfaces on listForItem", async () => {
		const listForItem = vi.fn().mockRejectedValue(new NetworkError(new Error("offline")));
		const client = fakeSuppliersClient({ listForItem });

		const { result } = renderHook(() => useSuppliers("item-1"), { wrapper: wrapperFactory(client) });
		await waitFor(() => expect(result.current.error).toBeInstanceOf(NetworkError));
	});
});
