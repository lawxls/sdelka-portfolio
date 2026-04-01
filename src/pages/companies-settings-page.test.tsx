import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { server } from "@/test-msw";
import { createTestQueryClient, makeCompany, mockHostname } from "@/test-utils";
import { CompaniesSettingsPage } from "./companies-settings-page";

const MOCK_COMPANIES = [
	makeCompany("company-1", {
		name: "Сделка",
		addresses: [
			{ id: "addr-1", name: "Офис", type: "office", address: "г. Москва", isMain: true },
			{ id: "addr-2", name: "Склад", type: "warehouse", address: "г. Подольск", isMain: false },
		],
		employeeCount: 12,
		procurementItemCount: 25,
	}),
	makeCompany("company-2", {
		name: "СтройМастер",
		addresses: [{ id: "addr-3", name: "Центральный", type: "office", address: "г. Казань", isMain: true }],
		employeeCount: 5,
		procurementItemCount: 10,
	}),
];

let queryClient: QueryClient;

function renderPage(initialPath = "/settings/companies") {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="*" element={<CompaniesSettingsPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

function SearchParamSpy() {
	const [params] = useSearchParams();
	return <div data-testid="params">{params.toString()}</div>;
}

function renderPageWithSpy(initialPath = "/settings/companies") {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route
						path="*"
						element={
							<>
								<CompaniesSettingsPage />
								<SearchParamSpy />
							</>
						}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	localStorage.setItem("auth-refresh-token", "test-refresh");
	server.use(
		http.get("/api/v1/companies/", () => {
			return HttpResponse.json({ companies: MOCK_COMPANIES, nextCursor: null });
		}),
	);
});

afterEach(() => {
	localStorage.clear();
});

describe("CompaniesSettingsPage table", () => {
	test("renders company names from MSW", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Сделка")).toBeInTheDocument();
		});
		expect(screen.getByText("СтройМастер")).toBeInTheDocument();
	});

	test("renders address count, employee count, procurement count columns", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Сделка")).toBeInTheDocument();
		});
		const rows = screen.getAllByRole("row");
		// row[0] = header, row[1] = Сделка, row[2] = СтройМастер
		const cells = rows[1].querySelectorAll("td");
		expect(cells[1].textContent).toBe("2"); // 2 addresses
		expect(cells[2].textContent).toBe("12"); // 12 employees
		expect(cells[3].textContent).toBe("25"); // 25 procurements
	});
});

describe("CompaniesSettingsPage row click", () => {
	test("clicking a row sets ?company={id} in URL", async () => {
		renderPageWithSpy();
		await waitFor(() => {
			expect(screen.getByText("Сделка")).toBeInTheDocument();
		});
		await userEvent.setup().click(screen.getByText("Сделка"));
		await waitFor(() => {
			expect(screen.getByTestId("params").textContent).toContain("company=company-1");
		});
	});
});

describe("CompaniesSettingsPage header", () => {
	test("renders Добавить компанию button", () => {
		renderPage();
		expect(screen.getByRole("button", { name: /Добавить компанию/i })).toBeInTheDocument();
	});

	test("clicking Добавить компанию opens creation sheet", async () => {
		renderPage();
		await userEvent.setup().click(screen.getByRole("button", { name: /Добавить компанию/i }));
		expect(screen.getByText("Новая компания")).toBeInTheDocument();
	});
});
