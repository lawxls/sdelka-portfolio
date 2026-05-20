import type { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { SettingsLayout } from "@/components/settings-layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { createInMemorySessionClient } from "@/data/clients/session-in-memory";
import { createInMemoryWorkspaceEmployeesClient } from "@/data/clients/workspace-employees-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Company } from "@/data/types";
import { createTestQueryClient, makeMe, mockHostname } from "@/test-utils";
import { CompaniesSettingsPage } from "./companies-settings-page";

function makeStored(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		inn: "",
		website: "",
		additionalComments: "",
		isMain: false,
		cardFile: null,
		cardFileName: "",
		employeeCount: 0,
		procurementItemCount: 0,
		addressesCount: 1,
		createdAt: "2026-04-01T00:00:00+03:00",
		updatedAt: "2026-04-01T00:00:00+03:00",
		addresses: [{ id: `addr-${id}`, name: "Офис", address: "г. Москва", phone: "", isMain: true }],
		...overrides,
	};
}

const MOCK_COMPANIES: Company[] = [
	makeStored("company-1", {
		name: "Сделка",
		addressesCount: 2,
		addresses: [
			{ id: "addr-1", name: "Офис", address: "г. Москва", phone: "", isMain: true },
			{ id: "addr-2", name: "Склад", address: "г. Подольск", phone: "", isMain: false },
		],
		employeeCount: 12,
		procurementItemCount: 25,
	}),
	makeStored("company-2", {
		name: "СтройМастер",
		addressesCount: 1,
		addresses: [{ id: "addr-3", name: "Центральный", address: "г. Казань", phone: "", isMain: true }],
		employeeCount: 5,
		procurementItemCount: 10,
	}),
];

let queryClient: QueryClient;
let companies: Company[];
let companiesClient: ReturnType<typeof createInMemoryCompaniesClient>;

function renderPage(initialPath = "/settings/companies") {
	companiesClient = createInMemoryCompaniesClient(companies);
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: companiesClient,
				workspaceEmployees: createInMemoryWorkspaceEmployeesClient({ seed: [] }),
				profile: createInMemoryProfileClient({ me: makeMe() }),
				session: createInMemorySessionClient(),
			}}
		>
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
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: createInMemoryCompaniesClient(companies),
				workspaceEmployees: createInMemoryWorkspaceEmployeesClient({ seed: [] }),
				profile: createInMemoryProfileClient({ me: makeMe() }),
				session: createInMemorySessionClient(),
			}}
		>
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
	sessionStorage.setItem("auth-access-token", "test-token");
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

	test("Архивировать calls client.archive on the selected company", async () => {
		renderPage();
		const user = userEvent.setup();
		await waitFor(() => expect(screen.getByText("Сделка")).toBeInTheDocument());

		await user.click(screen.getByRole("checkbox", { name: "Выбрать Сделка" }));
		await user.click(screen.getByRole("button", { name: /Архивировать/ }));

		await waitFor(async () => {
			const all = await companiesClient.listAll();
			expect(all.map((c) => c.id)).toEqual(["company-2"]);
		});
	});

	test("Архивировать disabled when workspace has a single company", async () => {
		companies = [MOCK_COMPANIES[0]];
		renderPage();
		const user = userEvent.setup();
		await waitFor(() => expect(screen.getByText("Сделка")).toBeInTheDocument());

		await user.click(screen.getByRole("checkbox", { name: "Выбрать Сделка" }));
		expect(screen.getByRole("button", { name: /Архивировать/ })).toBeDisabled();
	});

	test("Архивировать disabled when selection covers every active company", async () => {
		renderPage();
		const user = userEvent.setup();
		await waitFor(() => expect(screen.getByText("Сделка")).toBeInTheDocument());

		await user.click(screen.getByRole("checkbox", { name: "Выбрать все компании" }));
		expect(screen.getByRole("button", { name: /Архивировать/ })).toBeDisabled();
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
