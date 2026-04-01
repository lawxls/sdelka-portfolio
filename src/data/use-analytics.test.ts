import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, mockHostname } from "@/test-utils";
import type { AnalyticsKpis, FolderBreakdown, ProcurementStatus } from "./analytics-types";
import type { SupplierStatus } from "./supplier-types";
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

const DEFAULT_PIPELINE: Record<SupplierStatus, number> = {
	письмо_не_отправлено: 0,
	ждем_ответа: 0,
	переговоры: 0,
	получено_кп: 0,
	отказ: 0,
};

beforeEach(() => {
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	localStorage.setItem("auth-refresh-token", "test-refresh");
	// default pipeline handler so existing tests don't see an unhandled-request error
	server.use(http.get("/api/v1/analytics/supplier-pipeline", () => HttpResponse.json(DEFAULT_PIPELINE)));
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

	it("exposes folderBreakdown from response", async () => {
		const folderBreakdown: FolderBreakdown[] = [
			{ folderId: "f1", folderName: "Электроника", overpayment: 100_000, deviationPct: 15 },
			{ folderId: "f2", folderName: "Мебель", overpayment: 50_000, deviationPct: 8 },
		];
		server.use(http.get("/api/v1/analytics/summary", () => HttpResponse.json({ kpis: mockKpis, folderBreakdown })));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.folderBreakdown).toEqual(folderBreakdown);
	});

	it("returns empty folderBreakdown when not present in response", async () => {
		server.use(http.get("/api/v1/analytics/summary", () => HttpResponse.json({ kpis: mockKpis })));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.folderBreakdown).toEqual([]);
	});

	it("exposes statusBreakdown from response", async () => {
		const statusBreakdown: Record<ProcurementStatus, number> = {
			awaiting_analytics: 3,
			searching: 7,
			negotiating: 2,
			completed: 12,
		};
		server.use(http.get("/api/v1/analytics/summary", () => HttpResponse.json({ kpis: mockKpis, statusBreakdown })));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.statusBreakdown).toEqual(statusBreakdown);
	});

	it("returns default statusBreakdown (all zeros) when absent from response", async () => {
		server.use(http.get("/api/v1/analytics/summary", () => HttpResponse.json({ kpis: mockKpis })));

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.statusBreakdown).toEqual({
			awaiting_analytics: 0,
			searching: 0,
			negotiating: 0,
			completed: 0,
		});
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

	it("exposes supplierPipeline from pipeline endpoint", async () => {
		const pipeline: Record<SupplierStatus, number> = {
			письмо_не_отправлено: 8,
			ждем_ответа: 4,
			переговоры: 2,
			получено_кп: 6,
			отказ: 1,
		};
		server.use(
			http.get("/api/v1/analytics/summary", () => HttpResponse.json({ kpis: mockKpis })),
			http.get("/api/v1/analytics/supplier-pipeline", () => HttpResponse.json(pipeline)),
		);

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.supplierPipeline).toEqual(pipeline);
	});

	it("returns default supplierPipeline (all zeros) when pipeline endpoint returns empty", async () => {
		server.use(
			http.get("/api/v1/analytics/summary", () => HttpResponse.json({ kpis: mockKpis })),
			http.get("/api/v1/analytics/supplier-pipeline", () => HttpResponse.json(DEFAULT_PIPELINE)),
		);

		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useAnalyticsSummary(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.supplierPipeline).toEqual({
			письмо_не_отправлено: 0,
			ждем_ответа: 0,
			переговоры: 0,
			получено_кп: 0,
			отказ: 0,
		});
	});
});
