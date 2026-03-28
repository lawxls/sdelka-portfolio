import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, makeCompany, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import { useCompanies, useProcurementCompanies } from "./use-companies";

let queryClient: QueryClient;

const DEFAULT_PARAMS = { search: "", sort: null };

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	setTokens("test-jwt", "test-refresh");
});

afterEach(() => {
	localStorage.clear();
});

describe("useCompanies", () => {
	it("fetches first page of companies", async () => {
		const companies = Array.from({ length: 10 }, (_, i) => makeCompany(`c${i + 1}`));

		server.use(http.get("/api/v1/companies/", () => HttpResponse.json({ companies, nextCursor: "cursor-page2" })));

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.companies).toHaveLength(10);
		});
		expect(result.current.hasNextPage).toBe(true);
	});

	it("returns loading state initially", () => {
		server.use(
			http.get("/api/v1/companies/", async () => {
				await new Promise(() => {});
			}),
		);

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});
		expect(result.current.isLoading).toBe(true);
	});

	it("hasNextPage is false when nextCursor is null", async () => {
		server.use(
			http.get("/api/v1/companies/", () => HttpResponse.json({ companies: [makeCompany("c1")], nextCursor: null })),
		);

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.companies).toHaveLength(1);
		});
		expect(result.current.hasNextPage).toBe(false);
	});

	it("fetches next page with cursor via loadMore", async () => {
		let requestCount = 0;

		server.use(
			http.get("/api/v1/companies/", ({ request }) => {
				requestCount++;
				const url = new URL(request.url);
				const cursor = url.searchParams.get("cursor");

				if (!cursor) {
					return HttpResponse.json({ companies: [makeCompany("c1")], nextCursor: "page2-cursor" });
				}
				expect(cursor).toBe("page2-cursor");
				return HttpResponse.json({ companies: [makeCompany("c2")], nextCursor: null });
			}),
		);

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.companies).toHaveLength(1);
		});

		result.current.loadMore();

		await waitFor(() => {
			expect(result.current.companies).toHaveLength(2);
		});
		expect(result.current.hasNextPage).toBe(false);
		expect(requestCount).toBe(2);
	});

	it("includes search and sort params in API request", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/companies/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ companies: [], nextCursor: null });
			}),
		);

		const params = {
			search: "Сделка",
			sort: { field: "employeeCount" as const, direction: "desc" as const },
		};

		const { result } = renderHook(() => useCompanies(params), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("q")).toBe("Сделка");
		expect(url.searchParams.get("sort")).toBe("employeeCount");
		expect(url.searchParams.get("dir")).toBe("desc");
	});

	it("omits empty search from API request", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/companies/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ companies: [], nextCursor: null });
			}),
		);

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.has("q")).toBe(false);
		expect(url.searchParams.has("sort")).toBe(false);
		expect(url.searchParams.has("dir")).toBe(false);
	});

	it("returns error state on API failure", async () => {
		server.use(http.get("/api/v1/companies/", () => HttpResponse.json({}, { status: 500 })));

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});
	});

	it("refetch retries after error", async () => {
		let callCount = 0;
		server.use(
			http.get("/api/v1/companies/", () => {
				callCount++;
				if (callCount === 1) return HttpResponse.json({}, { status: 500 });
				return HttpResponse.json({ companies: [makeCompany("c1")], nextCursor: null });
			}),
		);

		const { result } = renderHook(() => useCompanies(DEFAULT_PARAMS), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});

		result.current.refetch();

		await waitFor(() => {
			expect(result.current.companies).toHaveLength(1);
		});
	});
});

describe("useProcurementCompanies", () => {
	it("fetches all companies for procurement sidebar", async () => {
		const companies = [makeCompany("c1", { procurementItemCount: 15 }), makeCompany("c2", { procurementItemCount: 8 })];

		server.use(http.get("/api/v1/companies/", () => HttpResponse.json({ companies, nextCursor: null })));

		const { result } = renderHook(() => useProcurementCompanies(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toHaveLength(2);
		});
		expect(result.current.data?.[0].procurementItemCount).toBe(15);
	});

	it("auto-paginates through all pages", async () => {
		server.use(
			http.get("/api/v1/companies/", ({ request }) => {
				const url = new URL(request.url);
				const cursor = url.searchParams.get("cursor");

				if (!cursor) {
					return HttpResponse.json({ companies: [makeCompany("c1")], nextCursor: "page2" });
				}
				return HttpResponse.json({ companies: [makeCompany("c2")], nextCursor: null });
			}),
		);

		const { result } = renderHook(() => useProcurementCompanies(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toHaveLength(2);
		});
		expect(result.current.isLoading).toBe(false);
	});
});
