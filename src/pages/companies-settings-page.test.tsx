import type { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { SettingsLayout } from "@/components/settings-layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Company } from "@/data/types";
import { createTestQueryClient, mockHostname } from "@/test-utils";
import { CompaniesSettingsPage } from "./companies-settings-page";

function makeStored(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		website: "",
		description: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses: [{ id: `addr-${id}`, name: "Офис", address: "г. Москва", phone: "", isMain: true }],
		employees: [],
		...overrides,
	};
}

const MOCK_COMPANIES: Company[] = [
	makeStored("company-1", {
		name: "Сделка",
		addresses: [
			{ id: "addr-1", name: "Офис", address: "г. Москва", phone: "", isMain: true },
			{ id: "addr-2", name: "Склад", address: "г. Подольск", phone: "", isMain: false },
		],
		employees: Array.from({ length: 12 }, (_, i) => ({
			id: i + 1,
			firstName: "x",
			lastName: "y",
			patronymic: "",
			position: "",
			role: "user" as const,
			phone: "",
			email: "",
			permissions: {
				id: `p${i}`,
				employeeId: i + 1,
				procurement: "none" as const,
				tasks: "none" as const,
				companies: "none" as const,
				employees: "none" as const,
				emails: "none" as const,
			},
		})),
		procurementItemCount: 25,
	}),
	makeStored("company-2", {
		name: "СтройМастер",
		addresses: [{ id: "addr-3", name: "Центральный", address: "г. Казань", phone: "", isMain: true }],
		employees: Array.from({ length: 5 }, (_, i) => ({
			id: 100 + i,
			firstName: "x",
			lastName: "y",
			patronymic: "",
			position: "",
			role: "user" as const,
			phone: "",
			email: "",
			permissions: {
				id: `p2-${i}`,
				employeeId: 100 + i,
				procurement: "none" as const,
				tasks: "none" as const,
				companies: "none" as const,
				employees: "none" as const,
				emails: "none" as const,
			},
		})),
		procurementItemCount: 10,
	}),
];

let queryClient: QueryClient;
let companies: Company[];

function renderPage(initialPath = "/settings/companies") {
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ companies: createInMemoryCompaniesClient(companies) }}>
			<TooltipProvider>
				<MemoryRouter initialEntries={[initialPath]}>
					<Routes>
						<Route element={<SettingsLayout />}>
							<Route path="*" element={<CompaniesSettingsPage />} />
						</Route>
					</Routes>
				</MemoryRouter>
			</TooltipProvider>
		</TestClientsProvider>,
	);
}

function SearchParamSpy() {
	const [params] = useSearchParams();
	return <div data-testid="params">{params.toString()}</div>;
}

function renderPageWithSpy(initialPath = "/settings/companies") {
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ companies: createInMemoryCompaniesClient(companies) }}>
			<TooltipProvider>
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
			</TooltipProvider>
		</TestClientsProvider>,
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	companies = MOCK_COMPANIES;
});

afterEach(() => {
	localStorage.clear();
});

describe("CompaniesSettingsPage table", () => {
	test("renders company names from mock store", async () => {
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
		const cells = rows[1].querySelectorAll("td");
		expect(cells[2].textContent).toBe("2"); // 2 addresses
		expect(cells[3].textContent).toBe("12"); // 12 employees
		expect(cells[4].textContent).toBe("25"); // 25 procurements
	});

	test("renders row checkboxes", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Сделка")).toBeInTheDocument();
		});
		expect(screen.getByRole("checkbox", { name: "Выбрать Сделка" })).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "Выбрать СтройМастер" })).toBeInTheDocument();
	});

	test("selecting a row shows toolbar selection state with Удалить", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Сделка")).toBeInTheDocument();
		});
		await userEvent.setup().click(screen.getByRole("checkbox", { name: "Выбрать Сделка" }));
		expect(screen.getByTestId("toolbar-selected-count")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Удалить/ })).toBeInTheDocument();
	});

	test("selecting all companies disables Удалить to keep at least one", async () => {
		renderPage();
		const user = userEvent.setup();
		await waitFor(() => {
			expect(screen.getByText("Сделка")).toBeInTheDocument();
		});
		await user.click(screen.getByRole("checkbox", { name: "Выбрать все компании" }));
		const deleteBtn = screen.getByRole("button", { name: /Удалить/ });
		expect(deleteBtn).toBeDisabled();
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

describe("CompaniesSettingsPage pagination", () => {
	test("auto-loads all pages when hasNextPage is true", async () => {
		const filler = Array.from({ length: 32 }, (_, i) => makeStored(`fill-${i}`, { name: `Filler ${i}` }));
		companies = [...filler, makeStored("company-last", { name: "ТретьяКомпания" })];

		renderPage();
		await waitFor(() => {
			expect(screen.getByText("ТретьяКомпания")).toBeInTheDocument();
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
