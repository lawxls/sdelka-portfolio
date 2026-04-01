import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import type { AnalyticsKpis } from "./analytics-types";
import { useAnalyticsSummary } from "./use-analytics";

const mockKpis: AnalyticsKpis = {
	totalSpend: 5_000_000,
	totalOverpayment: 300_000,
	totalSavings: 150_000,
	completedCount: 8,
	totalCount: 20,
	pendingAnalysisCount: 4,
	openTasksCount: 3,
};

beforeEach(() => {
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	localStorage.setItem("auth-refresh-token", "test-refresh");
});

afterEach(() => {
	localStorage.clear();
});

describe("useAnalyticsSummary", () => {
	it("returns kpis shape on success", async () => {
		server.use(http.get("/api/v1/analytics/summary", () => HttpResponse.json({ kpis: mockKpis })));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.kpis).toEqual(mockKpis);
		expect(result.current.isError).toBe(false);
	});

	it("returns isLoading true and kpis null initially", () => {
		server.use(
			http.get("/api/v1/analytics/summary", async () => {
				await new Promise((r) => setTimeout(r, 100));
				return HttpResponse.json({ kpis: mockKpis });
			}),
		);

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		expect(result.current.isLoading).toBe(true);
		expect(result.current.kpis).toBeNull();
	});

	it("returns isError true on failure", async () => {
		server.use(http.get("/api/v1/analytics/summary", () => HttpResponse.json({}, { status: 500 })));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.kpis).toBeNull();
	});

	it("exposes pendingAnalysisCount from kpis", async () => {
		const kpis = { ...mockKpis, pendingAnalysisCount: 5 };
		server.use(http.get("/api/v1/analytics/summary", () => HttpResponse.json({ kpis })));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.kpis?.pendingAnalysisCount).toBe(5);
	});

	it("passes company param to API request", async () => {
		let capturedUrl = "";
		server.use(
			http.get("/api/v1/analytics/summary", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ kpis: mockKpis });
			}),
		);

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary({ company: "co-123" }), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(capturedUrl).toContain("company=co-123");
	});
});
