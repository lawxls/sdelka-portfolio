import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { server } from "@/test-msw";
import { createTestQueryClient, makeCompany, makeCompanyDetail } from "@/test-utils";
import { CompaniesSettingsPage } from "./companies-settings-page";

let queryClient: QueryClient;

const mockCompanies = [
	makeCompany("co-1", { name: "Альфа", employeeCount: 3, procurementItemCount: 10 }),
	makeCompany("co-2", { name: "Бета", employeeCount: 1, procurementItemCount: 5 }),
];

beforeEach(() => {
	queryClient = createTestQueryClient();
	server.use(
		http.get("/api/v1/companies/", () => HttpResponse.json({ companies: mockCompanies, nextCursor: null })),
		http.get("/api/v1/companies/:id/", ({ params }) => {
			const id = params.id as string;
			return HttpResponse.json(makeCompanyDetail(id, { name: id === "co-1" ? "Альфа" : "Бета" }));
		}),
	);
});

afterEach(() => {
	localStorage.clear();
});

function renderPage(initialPath = "/settings/companies") {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialPath]}>
				<TooltipProvider>
					<Routes>
						<Route path="/settings/companies" element={<CompaniesSettingsPage />} />
					</Routes>
				</TooltipProvider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("CompaniesSettingsPage", () => {
	test("renders page heading", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByRole("heading", { name: "Компании" })).toBeInTheDocument());
	});

	test("renders company names in table", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByText("Альфа")).toBeInTheDocument());
		expect(screen.getByText("Бета")).toBeInTheDocument();
	});

	test("renders Добавить компанию button", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByRole("button", { name: /Добавить компанию/ })).toBeInTheDocument());
	});

	test("clicking company row opens CompanyDrawer", async () => {
		const user = userEvent.setup();
		renderPage();
		await waitFor(() => expect(screen.getByText("Альфа")).toBeInTheDocument());
		await user.click(screen.getByText("Альфа"));
		// Drawer title should appear
		await waitFor(() => expect(screen.getByTestId("drawer-title")).toBeInTheDocument());
	});
});
