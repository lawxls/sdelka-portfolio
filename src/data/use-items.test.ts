import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { setToken } from "./auth";
import type { ProcurementItem } from "./types";
import { useItems, useTotals } from "./use-items";

function mockHostname(hostname: string) {
	vi.spyOn(window, "location", "get").mockReturnValue({
		...window.location,
		hostname,
	});
}

let queryClient: QueryClient;

function createWrapper() {
	return ({ children }: { children: ReactNode }) => QueryClientProvider({ client: queryClient, children });
}

function makeItem(id: string, overrides: Partial<ProcurementItem> = {}): ProcurementItem {
	return {
		id,
		name: `Item ${id}`,
		status: "searching",
		annualQuantity: 100,
		currentPrice: 50,
		bestPrice: 40,
		averagePrice: 45,
		folderId: null,
		...overrides,
	};
}

const DEFAULT_PARAMS = {
	search: "",
	filters: { deviation: "all" as const, status: "all" as const },
	sort: null,
	folder: undefined,
};

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	mockHostname("acme.localhost");
	setToken("test-jwt");
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("useItems", () => {
	it("fetches first page of items", async () => {
		const items = Array.from({ length: 25 }, (_, i) => makeItem(`i${i + 1}`));

		server.use(http.get("/api/v1/company/items/", () => HttpResponse.json({ items, nextCursor: "cursor-page2" })));

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createWrapper() });

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

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createWrapper() });
		expect(result.current.isLoading).toBe(true);
	});

	it("hasNextPage is false when nextCursor is null", async () => {
		server.use(
			http.get("/api/v1/company/items/", () => HttpResponse.json({ items: [makeItem("i1")], nextCursor: null })),
		);

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createWrapper() });

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

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createWrapper() });

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

		const { result } = renderHook(() => useItems(params), { wrapper: createWrapper() });

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

	it("omits 'all' filter values from API request", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ items: [], nextCursor: null });
			}),
		);

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createWrapper() });

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

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createWrapper() });

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

		const { result } = renderHook(() => useItems(DEFAULT_PARAMS), { wrapper: createWrapper() });

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

		const { result } = renderHook(() => useTotals(params), { wrapper: createWrapper() });

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

	it("returns loading state initially", () => {
		server.use(
			http.get("/api/v1/company/items/totals", async () => {
				await new Promise(() => {});
			}),
		);

		const { result } = renderHook(() => useTotals(DEFAULT_PARAMS), { wrapper: createWrapper() });
		expect(result.current.isLoading).toBe(true);
	});

	it("returns error state on failure", async () => {
		server.use(http.get("/api/v1/company/items/totals", () => HttpResponse.json({}, { status: 500 })));

		const { result } = renderHook(() => useTotals(DEFAULT_PARAMS), { wrapper: createWrapper() });

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});
});
