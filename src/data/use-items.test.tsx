import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, makeItem } from "@/test-utils";
import type { ItemsClient } from "./clients/items-client";
import type { CursorPage, ProcurementItem } from "./domains/items";
import { NetworkError, NotFoundError } from "./errors";
import { fakeItemsClient, TestClientsProvider } from "./test-clients-provider";
import {
	useAssignFolder,
	useCreateItems,
	useDeleteItem,
	useExportItems,
	useItems,
	useTotals,
	useUpdateItem,
} from "./use-items";

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

describe("useItems", () => {
	it("fetches first page from the client", async () => {
		const list = vi.fn().mockResolvedValue({
			items: [makeItem("i1"), makeItem("i2")],
			nextCursor: "i3",
		} satisfies CursorPage<ProcurementItem>);
		const client = fakeItemsClient({ list });

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.items).toHaveLength(2));
		expect(result.current.items.map((i) => i.id)).toEqual(["i1", "i2"]);
		expect(result.current.hasNextPage).toBe(true);
	});

	it("returns loading state initially", () => {
		const client = fakeItemsClient({ list: () => new Promise<CursorPage<ProcurementItem>>(() => {}) });
		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });
		expect(result.current.isLoading).toBe(true);
	});

	it("hasNextPage is false when nextCursor is null", async () => {
		const list = vi.fn().mockResolvedValue({ items: [makeItem("i1")], nextCursor: null });
		const client = fakeItemsClient({ list });

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.items).toHaveLength(1));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("loadMore fetches next page using returned cursor", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce({ items: [makeItem("i1"), makeItem("i2")], nextCursor: "i3" })
			.mockResolvedValueOnce({ items: [makeItem("i3"), makeItem("i4")], nextCursor: null });
		const client = fakeItemsClient({ list });

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.items).toHaveLength(2));
		result.current.loadMore();
		await waitFor(() => expect(result.current.items).toHaveLength(4));
		expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "i3" }));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("threads filters and sort into the client", async () => {
		const list = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
		const client = fakeItemsClient({ list });

		renderHook(
			() =>
				useItems({
					search: "арм",
					filters: { deviation: "overpaying", status: "completed" },
					sort: { field: "currentPrice", direction: "desc" },
					folder: "f1",
					company: "c1",
				}),
			{ wrapper: wrapperFactory(client) },
		);

		await waitFor(() => expect(list).toHaveBeenCalled());
		expect(list).toHaveBeenCalledWith({
			q: "арм",
			status: "completed",
			deviation: "overpaying",
			folder: "f1",
			company: "c1",
			sort: "currentPrice",
			dir: "desc",
			cursor: undefined,
		});
	});

	it("surfaces typed errors from the client", async () => {
		const list = vi.fn().mockRejectedValue(new NetworkError(new TypeError("fetch failed")));
		const client = fakeItemsClient({ list });

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.error).toBeTruthy());
		expect(result.current.error).toBeInstanceOf(NetworkError);
	});

	it("refetch retries after error", async () => {
		const list = vi
			.fn()
			.mockRejectedValueOnce(new Error("transient"))
			.mockResolvedValueOnce({ items: [makeItem("i1")], nextCursor: null });
		const client = fakeItemsClient({ list });

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.error).toBeTruthy());
		result.current.refetch();
		await waitFor(() => expect(result.current.items).toHaveLength(1));
	});
});

describe("useTotals", () => {
	it("calls totals on the client and exposes the response", async () => {
		const totals = vi
			.fn()
			.mockResolvedValue({ itemCount: 2, totalOverpayment: 200, totalSavings: 50, totalDeviation: 10 });
		const client = fakeItemsClient({ totals });

		const { result } = renderHook(() => useTotals(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.data).toBeTruthy());
		expect(result.current.data).toEqual({ itemCount: 2, totalOverpayment: 200, totalSavings: 50, totalDeviation: 10 });
		expect(totals).toHaveBeenCalled();
	});

	it("surfaces errors from totals", async () => {
		const totals = vi.fn().mockRejectedValue(new Error("boom"));
		const client = fakeItemsClient({ totals });

		const { result } = renderHook(() => useTotals(DEFAULT_PARAMS), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(result.current.isError).toBe(true));
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

describe("useUpdateItem (optimistic)", () => {
	it("optimistically renames item in cache before the server resolves", async () => {
		seedItemsCache([makeItem("i1", { name: "Old" }), makeItem("i2")]);
		const update = vi.fn(
			(id: string, data: { name?: string }) =>
				new Promise<ProcurementItem>((resolve) => setTimeout(() => resolve(makeItem(id, data)), 10)),
		);
		const client = fakeItemsClient({ update });

		const { result } = renderHook(() => useUpdateItem(), { wrapper: wrapperFactory(client) });

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
		seedItemsCache([makeItem("i1", { name: "Original" })]);
		const update = vi.fn().mockRejectedValue(new Error("fail"));
		const client = fakeItemsClient({ update });

		const { result } = renderHook(() => useUpdateItem(), { wrapper: wrapperFactory(client) });

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

describe("useDeleteItem (optimistic)", () => {
	it("optimistically removes item from cache", async () => {
		seedItemsCache([makeItem("i1"), makeItem("i2"), makeItem("i3")]);
		const del = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));
		const client = fakeItemsClient({ delete: del });

		const { result } = renderHook(() => useDeleteItem(), { wrapper: wrapperFactory(client) });

		act(() => {
			result.current.mutate("i2");
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
				"items",
				{ q: undefined, status: undefined, deviation: undefined, folder: undefined, sort: undefined, dir: undefined },
			]);
			expect(data?.pages[0].items.map((i) => i.id)).toEqual(["i1", "i3"]);
		});
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		seedItemsCache([makeItem("i1"), makeItem("i2")]);
		const del = vi.fn().mockRejectedValue(new NotFoundError({ id: "i1" }));
		const client = fakeItemsClient({ delete: del });

		const { result } = renderHook(() => useDeleteItem(), { wrapper: wrapperFactory(client) });

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

describe("useAssignFolder (optimistic)", () => {
	it("optimistically assigns folder to item", async () => {
		seedItemsCache([makeItem("i1", { folderId: null })]);
		const update = vi.fn().mockResolvedValue(makeItem("i1", { folderId: "f1" }));
		const client = fakeItemsClient({ update });

		const { result } = renderHook(() => useAssignFolder(), { wrapper: wrapperFactory(client) });

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

	it("removes item from folder-filtered cache when reassigned to another folder", async () => {
		seedItemsCache([makeItem("i1", { folderId: "f1" }), makeItem("i2", { folderId: "f1" })], "f1");
		const update = vi.fn().mockResolvedValue(makeItem("i1", { folderId: "f2" }));
		const client = fakeItemsClient({ update });

		const { result } = renderHook(() => useAssignFolder(), { wrapper: wrapperFactory(client) });

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
		seedItemsCache([makeItem("i1", { folderId: null }), makeItem("i2", { folderId: null })], "none");
		const update = vi.fn().mockResolvedValue(makeItem("i1", { folderId: "f1" }));
		const client = fakeItemsClient({ update });

		const { result } = renderHook(() => useAssignFolder(), { wrapper: wrapperFactory(client) });

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
		seedItemsCache([makeItem("i1", { folderId: null })]);
		const update = vi.fn().mockRejectedValue(new Error("fail"));
		const client = fakeItemsClient({ update });

		const { result } = renderHook(() => useAssignFolder(), { wrapper: wrapperFactory(client) });

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
	it("calls create on the client and returns isAsync flag", async () => {
		const created = [makeItem("new-1", { name: "Widget A" })];
		const create = vi.fn().mockResolvedValue({ items: created, isAsync: false });
		const client = fakeItemsClient({ create });

		const { result } = renderHook(() => useCreateItems(), { wrapper: wrapperFactory(client) });

		let response: { items?: ProcurementItem[]; isAsync: boolean } | undefined;
		await act(async () => {
			response = await result.current.mutateAsync([{ name: "Widget A" }]);
		});

		expect(create).toHaveBeenCalledWith([{ name: "Widget A" }]);
		expect(response?.isAsync).toBe(false);
		expect(response?.items?.[0].name).toBe("Widget A");
	});

	it("shows error toast when create rejects", async () => {
		const { toast } = await import("sonner");
		const create = vi.fn().mockRejectedValue(new Error("bad"));
		const client = fakeItemsClient({ create });

		const { result } = renderHook(() => useCreateItems(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			try {
				await result.current.mutateAsync([{ name: "" }]);
			} catch {}
		});

		expect(toast.error).toHaveBeenCalled();
	});
});

describe("useExportItems", () => {
	it("calls export on the client", async () => {
		const blob = new Blob(["ok"]);
		const exportFn = vi.fn().mockResolvedValue({ blob, filename: "items.xlsx" });
		const client = fakeItemsClient({ export: exportFn });

		// jsdom click on an <a> with download attribute is a no-op; just verify the method is invoked.
		const createObjectURL = vi.fn().mockReturnValue("blob:mock");
		const revokeObjectURL = vi.fn();
		Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
		Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });

		const { result } = renderHook(() => useExportItems(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({ company: "c1" });
		});

		expect(exportFn).toHaveBeenCalledWith({ company: "c1" });
		expect(createObjectURL).toHaveBeenCalledWith(blob);
	});
});
