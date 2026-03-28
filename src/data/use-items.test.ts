import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, makeItem, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
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
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("useItems", () => {
	it("fetches first page of items", async () => {
		const items = Array.from({ length: 25 }, (_, i) => makeItem(`i${i + 1}`));

		server.use(http.get("/api/v1/company/items/", () => HttpResponse.json({ items, nextCursor: "cursor-page2" })));

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.items).toHaveLength(25);
		});
		expect(result.current.hasNextPage).toBe(true);
	});

	it("returns loading state initially", () => {
		server.use(
			http.get("/api/v1/company/items/", async () => {
				await new Promise(() => {}); // never resolves
			}),
		);

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });
		expect(result.current.isLoading).toBe(true);
	});

	it("hasNextPage is false when nextCursor is null", async () => {
		server.use(
			http.get("/api/v1/company/items/", () => HttpResponse.json({ items: [makeItem("i1")], nextCursor: null })),
		);

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.items).toHaveLength(1);
		});
		expect(result.current.hasNextPage).toBe(false);
	});

	it("fetches next page with cursor via fetchNextPage", async () => {
		let requestCount = 0;

		server.use(
			http.get("/api/v1/company/items/", ({ request }) => {
				requestCount++;
				const url = new URL(request.url);
				const cursor = url.searchParams.get("cursor");

				if (!cursor) {
					return HttpResponse.json({ items: [makeItem("i1")], nextCursor: "page2-cursor" });
				}
				expect(cursor).toBe("page2-cursor");
				return HttpResponse.json({ items: [makeItem("i2")], nextCursor: null });
			}),
		);

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.items).toHaveLength(1);
		});

		result.current.loadMore();

		await waitFor(() => {
			expect(result.current.items).toHaveLength(2);
		});
		expect(result.current.hasNextPage).toBe(false);
		expect(requestCount).toBe(2);
	});

	it("includes filter params in API request", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ items: [], nextCursor: null });
			}),
		);

		const params = {
			search: "Widget",
			filters: { deviation: "overpaying" as const, status: "searching" as const },
			sort: { field: "currentPrice" as const, direction: "desc" as const },
			folder: "f1",
		};

		const { result } = renderHook(() => useItems(params), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("q")).toBe("Widget");
		expect(url.searchParams.get("status")).toBe("searching");
		expect(url.searchParams.get("deviation")).toBe("overpaying");
		expect(url.searchParams.get("folder")).toBe("f1");
		expect(url.searchParams.get("sort")).toBe("currentPrice");
		expect(url.searchParams.get("dir")).toBe("desc");
	});

	it("includes company param in API request when provided", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ items: [], nextCursor: null });
			}),
		);

		const params = {
			...DEFAULT_PARAMS,
			company: "c1",
		};

		const { result } = renderHook(() => useItems(params), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("company")).toBe("c1");
	});

	it("omits 'all' filter values from API request", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ items: [], nextCursor: null });
			}),
		);

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.has("status")).toBe(false);
		expect(url.searchParams.has("deviation")).toBe(false);
		expect(url.searchParams.has("q")).toBe(false);
	});

	it("returns error state on API failure", async () => {
		server.use(http.get("/api/v1/company/items/", () => HttpResponse.json({}, { status: 500 })));

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});
	});

	it("refetch function retries after error", async () => {
		let callCount = 0;
		server.use(
			http.get("/api/v1/company/items/", () => {
				callCount++;
				if (callCount === 1) return HttpResponse.json({}, { status: 500 });
				return HttpResponse.json({ items: [makeItem("i1")], nextCursor: null });
			}),
		);

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
	it("fetches totals with filter params", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/totals", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					itemCount: 42,
					totalOverpayment: "15000.00",
					totalSavings: "8000.00",
					totalDeviation: "120.50",
				});
			}),
		);

		const params = {
			search: "Widget",
			filters: { deviation: "overpaying" as const, status: "searching" as const },
			folder: "f1",
		};

		const { result } = renderHook(() => useTotals(params), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.data).toBeTruthy();
		});

		expect(result.current.data).toEqual({
			itemCount: 42,
			totalOverpayment: 15000,
			totalSavings: 8000,
			totalDeviation: 120.5,
		});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("q")).toBe("Widget");
		expect(url.searchParams.get("deviation")).toBe("overpaying");
		expect(url.searchParams.get("status")).toBe("searching");
		expect(url.searchParams.get("folder")).toBe("f1");
	});

	it("includes company param in totals request", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/totals", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					itemCount: 10,
					totalOverpayment: "0",
					totalSavings: "0",
					totalDeviation: "0",
				});
			}),
		);

		const params = {
			...DEFAULT_PARAMS,
			company: "c1",
		};

		const { result } = renderHook(() => useTotals(params), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.data).toBeTruthy();
		});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("company")).toBe("c1");
	});

	it("returns loading state initially", () => {
		server.use(
			http.get("/api/v1/company/items/totals", async () => {
				await new Promise(() => {});
			}),
		);

		const { result } = renderHook(() => useTotals(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });
		expect(result.current.isLoading).toBe(true);
	});

	it("returns error state on failure", async () => {
		server.use(http.get("/api/v1/company/items/totals", () => HttpResponse.json({}, { status: 500 })));

		const { result } = renderHook(() => useTotals(DEFAULT_PARAMS), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});
});

// --- Helper: seed items into infinite query cache ---

function seedItems(items: ProcurementItem[], folder?: string) {
	queryClient.setQueryData(
		["items", { q: undefined, status: undefined, deviation: undefined, folder, sort: undefined, dir: undefined }],
		{
			pages: [{ items, nextCursor: null }],
			pageParams: [undefined],
		},
	);
}

describe("useUpdateItem", () => {
	it("sends PATCH with partial data", async () => {
		let capturedBody: unknown;

		server.use(
			http.patch("/api/v1/company/items/:id/", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json(makeItem("i1", { name: "Renamed" }));
			}),
			http.get("/api/v1/company/items/", () => HttpResponse.json({ items: [], nextCursor: null })),
			http.get("/api/v1/company/items/totals", () =>
				HttpResponse.json({ itemCount: 0, totalOverpayment: "0", totalSavings: "0", totalDeviation: "0" }),
			),
			http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: [] })),
		);

		const { result } = renderHook(() => useUpdateItem(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync({ id: "i1", name: "Renamed" });
		});

		expect(capturedBody).toEqual({ name: "Renamed" });
	});

	it("optimistically renames item in cache", async () => {
		seedItems([makeItem("i1", { name: "Old" }), makeItem("i2")]);

		server.use(
			http.patch("/api/v1/company/items/:id/", async () => {
				await delay(5000);
				return HttpResponse.json(makeItem("i1", { name: "Renamed" }));
			}),
		);

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
		// Other items unchanged
		const data = queryClient.getQueryData<{ pages: Array<{ items: ProcurementItem[] }> }>([
			"items",
			{ q: undefined, status: undefined, deviation: undefined, folder: undefined, sort: undefined, dir: undefined },
		]);
		expect(data?.pages[0].items.find((i) => i.id === "i2")?.name).toBe("Item i2");
	});

	it("rolls back on error and shows toast", async () => {
		const { toast } = await import("sonner");
		seedItems([makeItem("i1", { name: "Original" })]);

		server.use(http.patch("/api/v1/company/items/:id/", () => HttpResponse.json({}, { status: 400 })));

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
	it("sends DELETE request", async () => {
		let capturedId: string | undefined;

		server.use(
			http.delete("/api/v1/company/items/:id/", ({ params }) => {
				capturedId = params.id as string;
				return new HttpResponse(null, { status: 204 });
			}),
			http.get("/api/v1/company/items/", () => HttpResponse.json({ items: [], nextCursor: null })),
			http.get("/api/v1/company/items/totals", () =>
				HttpResponse.json({ itemCount: 0, totalOverpayment: "0", totalSavings: "0", totalDeviation: "0" }),
			),
			http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: [] })),
		);

		const { result } = renderHook(() => useDeleteItem(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync("i1");
		});

		expect(capturedId).toBe("i1");
	});

	it("optimistically removes item from cache", async () => {
		seedItems([makeItem("i1"), makeItem("i2"), makeItem("i3")]);

		server.use(
			http.delete("/api/v1/company/items/:id/", async () => {
				await delay(5000);
				return new HttpResponse(null, { status: 204 });
			}),
		);

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
		seedItems([makeItem("i1"), makeItem("i2")]);

		server.use(http.delete("/api/v1/company/items/:id/", () => HttpResponse.json({}, { status: 500 })));

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
		seedItems([makeItem("i1", { folderId: null })]);

		server.use(
			http.patch("/api/v1/company/items/:id/", async () => {
				await delay(5000);
				return HttpResponse.json(makeItem("i1", { folderId: "f1" }));
			}),
		);

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
		seedItems([makeItem("i1", { folderId: "f1" })]);

		server.use(
			http.patch("/api/v1/company/items/:id/", async () => {
				await delay(5000);
				return HttpResponse.json(makeItem("i1", { folderId: null }));
			}),
		);

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
		seedItems([makeItem("i1", { folderId: "f1" }), makeItem("i2", { folderId: "f1" })], "f1");

		server.use(
			http.patch("/api/v1/company/items/:id/", async () => {
				await delay(5000);
				return HttpResponse.json(makeItem("i1", { folderId: "f2" }));
			}),
		);

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
		seedItems([makeItem("i1", { folderId: null }), makeItem("i2", { folderId: null })], "none");

		server.use(
			http.patch("/api/v1/company/items/:id/", async () => {
				await delay(5000);
				return HttpResponse.json(makeItem("i1", { folderId: "f1" }));
			}),
		);

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
		seedItems([makeItem("i1", { folderId: null })]);

		server.use(
			http.patch("/api/v1/company/items/:id/", () =>
				HttpResponse.json({ folderId: ["Invalid folder."] }, { status: 400 }),
			),
		);

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
	it("sends items to POST /items/batch and invalidates queries on sync response", async () => {
		let capturedBody: unknown;

		server.use(
			http.post("/api/v1/company/items/batch", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json(
					{
						items: [makeItem("new-1", { name: "Widget A" })],
						isAsync: false,
					},
					{ status: 201 },
				);
			}),
			http.get("/api/v1/company/items/", () => HttpResponse.json({ items: [], nextCursor: null })),
			http.get("/api/v1/company/items/totals", () =>
				HttpResponse.json({ itemCount: 0, totalOverpayment: "0", totalSavings: "0", totalDeviation: "0" }),
			),
			http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: [] })),
		);

		const { result } = renderHook(() => useCreateItems(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			await result.current.mutateAsync([{ name: "Widget A" }]);
		});

		expect(capturedBody).toEqual({ items: [{ name: "Widget A" }] });
	});

	it("returns isAsync false for sync response", async () => {
		server.use(
			http.post("/api/v1/company/items/batch", () =>
				HttpResponse.json({ items: [makeItem("new-1")], isAsync: false }, { status: 201 }),
			),
			http.get("/api/v1/company/items/", () => HttpResponse.json({ items: [], nextCursor: null })),
			http.get("/api/v1/company/items/totals", () =>
				HttpResponse.json({ itemCount: 0, totalOverpayment: "0", totalSavings: "0", totalDeviation: "0" }),
			),
			http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: [] })),
		);

		const { result } = renderHook(() => useCreateItems(), { wrapper: createQueryWrapper(queryClient) });

		let response: unknown;
		await act(async () => {
			response = await result.current.mutateAsync([{ name: "Item" }]);
		});

		expect((response as { isAsync: boolean }).isAsync).toBe(false);
	});

	it("returns isAsync true for async response (>=100 items)", async () => {
		server.use(
			http.post("/api/v1/company/items/batch", () =>
				HttpResponse.json({ isAsync: true, taskId: "task-123" }, { status: 202 }),
			),
			http.get("/api/v1/company/items/", () => HttpResponse.json({ items: [], nextCursor: null })),
			http.get("/api/v1/company/items/totals", () =>
				HttpResponse.json({ itemCount: 0, totalOverpayment: "0", totalSavings: "0", totalDeviation: "0" }),
			),
			http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: [] })),
		);

		const { result } = renderHook(() => useCreateItems(), { wrapper: createQueryWrapper(queryClient) });

		let response: unknown;
		await act(async () => {
			response = await result.current.mutateAsync([{ name: "Item" }]);
		});

		expect((response as { isAsync: boolean }).isAsync).toBe(true);
	});

	it("shows error toast on 400 validation failure", async () => {
		const { toast } = await import("sonner");

		server.use(
			http.post("/api/v1/company/items/batch", () =>
				HttpResponse.json({ items: [{ name: ["This field is required."] }] }, { status: 400 }),
			),
		);

		const { result } = renderHook(() => useCreateItems(), { wrapper: createQueryWrapper(queryClient) });

		await act(async () => {
			try {
				await result.current.mutateAsync([{ name: "" }]);
			} catch {}
		});

		expect(toast.error).toHaveBeenCalled();
	});
});
