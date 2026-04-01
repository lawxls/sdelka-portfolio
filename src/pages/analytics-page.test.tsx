import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AnalyticsKpis } from "@/data/analytics-types";
import { server } from "@/test-msw";
import { createTestQueryClient, makeCompany, mockHostname } from "@/test-utils";
import { AnalyticsPage } from "./analytics-page";

const mockKpis: AnalyticsKpis = {
	totalSpend: 5_000_000,
	totalOverpayment: 300_000,
	totalSavings: 150_000,
	completedCount: 8,
	totalCount: 20,
	pendingAnalysisCount: 2,
	openTasksCount: 5,
};

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	localStorage.setItem("auth-refresh-token", "test-refresh");

	// Default: single company, success analytics response
	server.use(
		http.get("/api/v1/analytics/summary", () => HttpResponse.json({ kpis: mockKpis })),
		http.get("/api/v1/companies/", () => HttpResponse.json({ companies: [makeCompany("co-1")], nextCursor: null })),
	);
});

afterEach(() => {
	localStorage.clear();
});

function renderPage(initialEntries?: string[]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries ?? ["/analytics"]}>
				<AnalyticsPage />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("AnalyticsPage", () => {
	it("renders KPI values from mocked API response", async () => {
		renderPage();

		await waitFor(() => expect(screen.getByText("Годовые затраты")).toBeInTheDocument());
		expect(screen.getByText("Переплата")).toBeInTheDocument();
		expect(screen.getByText("Экономия")).toBeInTheDocument();
		expect(screen.getByText("Выполнено")).toBeInTheDocument();
		expect(screen.getByText("Открытые задачи")).toBeInTheDocument();
	});

	it("shows loading skeletons while data is fetching", () => {
		server.use(
			http.get("/api/v1/analytics/summary", async () => {
				await new Promise((r) => setTimeout(r, 200));
				return HttpResponse.json({ kpis: mockKpis });
			}),
		);

		renderPage();
		expect(screen.getByTestId("kpi-skeletons")).toBeInTheDocument();
	});

	it("passes company URL param to analytics API", async () => {
		let capturedUrl = "";
		server.use(
			http.get("/api/v1/analytics/summary", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ kpis: mockKpis });
			}),
		);

		renderPage(["/analytics?company=co-1"]);

		await waitFor(() => expect(capturedUrl).toContain("company=co-1"));
	});

	it("calls analytics API without company param when no URL param set", async () => {
		let capturedUrl = "";
		server.use(
			http.get("/api/v1/analytics/summary", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ kpis: mockKpis });
			}),
		);

		renderPage(["/analytics"]);

		await waitFor(() => expect(screen.getByText("Годовые затраты")).toBeInTheDocument());
		expect(capturedUrl).not.toContain("company=");
	});

	it("shows company filter when multiple companies are available", async () => {
		server.use(
			http.get("/api/v1/companies/", () =>
				HttpResponse.json({
					companies: [makeCompany("co-1", { name: "Альфа" }), makeCompany("co-2", { name: "Бета" })],
					nextCursor: null,
				}),
			),
		);

		renderPage();

		await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());
	});

	it("hides company filter with a single company", async () => {
		renderPage();

		await waitFor(() => expect(screen.getByText("Годовые затраты")).toBeInTheDocument());
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	});

	it("shows pending analysis footnote when pendingAnalysisCount > 0", async () => {
		renderPage();

		await waitFor(() => expect(screen.getByText(/не проанализировано/)).toBeInTheDocument());
	});
});
