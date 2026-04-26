import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { SettingsLayout } from "@/components/settings-layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { _resetWorkspaceStore, _setWorkspaceEmployees, type WorkspaceEmployeeDetail } from "@/data/workspace-mock-data";
import { createTestQueryClient, mockHostname } from "@/test-utils";
import { EmployeesSettingsPage } from "./employees-settings-page";

const MOCK_EMPLOYEES: WorkspaceEmployeeDetail[] = [
	{
		id: 1,
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Директор",
		role: "admin",
		phone: "+71234567890",
		email: "ivan@example.com",
		registeredAt: "2024-01-15T10:00:00Z",
		companies: [
			{
				id: "c1",
				name: "Компания А",
				isMain: true,
				addresses: [],
				employeeCount: 3,
				procurementItemCount: 5,
			},
		],
		permissions: {
			id: "perm-1",
			employeeId: 1,
			procurement: "edit",
			tasks: "edit",
			companies: "edit",
			employees: "edit",
			emails: "edit",
		},
	},
	{
		id: 2,
		firstName: "Мария",
		lastName: "Петрова",
		patronymic: "Сергеевна",
		position: "Менеджер",
		role: "user",
		phone: "+79876543210",
		email: "maria@example.com",
		registeredAt: null,
		companies: [],
		permissions: {
			id: "perm-2",
			employeeId: 2,
			procurement: "none",
			tasks: "none",
			companies: "none",
			employees: "none",
			emails: "none",
		},
	},
];

let queryClient: QueryClient;

function renderPage(initialPath = "/settings/employees") {
	return render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<MemoryRouter initialEntries={[initialPath]}>
					<Routes>
						<Route element={<SettingsLayout />}>
							<Route path="*" element={<EmployeesSettingsPage />} />
						</Route>
					</Routes>
				</MemoryRouter>
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

function SearchParamSpy() {
	const [params] = useSearchParams();
	return <div data-testid="params">{params.toString()}</div>;
}

function renderPageWithSpy(initialPath = "/settings/employees") {
	return render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<MemoryRouter initialEntries={[initialPath]}>
					<Routes>
						<Route
							path="*"
							element={
								<>
									<EmployeesSettingsPage />
									<SearchParamSpy />
								</>
							}
						/>
					</Routes>
				</MemoryRouter>
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	_setWorkspaceEmployees(MOCK_EMPLOYEES);
});

afterEach(() => {
	localStorage.clear();
	_resetWorkspaceStore();
});

describe("EmployeesSettingsPage table", () => {
	test("renders employee ФИО, Должность, Почта from mock store", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Иванов Иван Иванович")).toBeInTheDocument();
		});
		expect(screen.getByText("Петрова Мария Сергеевна")).toBeInTheDocument();
		expect(screen.getByText("Директор")).toBeInTheDocument();
		expect(screen.getByText("Менеджер")).toBeInTheDocument();
		expect(screen.getByText("ivan@example.com")).toBeInTheDocument();
		expect(screen.getByText("maria@example.com")).toBeInTheDocument();
	});

	test("renders Роль column with role labels", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Иванов Иван Иванович")).toBeInTheDocument();
		});
		const rows = screen.getAllByRole("row");
		expect(rows[1].querySelectorAll("td")[3].textContent).toBe("Администратор");
		expect(rows[2].querySelectorAll("td")[3].textContent).toBe("Пользователь");
	});

	test("shows formatted date for registered employee", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Иванов Иван Иванович")).toBeInTheDocument();
		});
		expect(screen.getByText("15.01.2024")).toBeInTheDocument();
	});

	test("shows Приглашение отправлено for pending employee", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Петрова Мария Сергеевна")).toBeInTheDocument();
		});
		expect(screen.getByText("Приглашение отправлено")).toBeInTheDocument();
	});
});

describe("EmployeesSettingsPage row click", () => {
	test("clicking a row sets ?employee={id} in URL", async () => {
		renderPageWithSpy();
		await waitFor(() => {
			expect(screen.getByText("Иванов Иван Иванович")).toBeInTheDocument();
		});
		await userEvent.setup().click(screen.getByText("Иванов Иван Иванович"));
		await waitFor(() => {
			expect(screen.getByTestId("params").textContent).toContain("employee=1");
		});
	});
});

describe("EmployeesSettingsPage multi-select", () => {
	test("renders row checkboxes", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Иванов Иван Иванович")).toBeInTheDocument();
		});
		expect(screen.getByRole("checkbox", { name: "Выбрать Иванов Иван Иванович" })).toBeInTheDocument();
	});

	test("selecting admin employee disables Удалить action", async () => {
		renderPage();
		const user = userEvent.setup();
		await waitFor(() => {
			expect(screen.getByText("Иванов Иван Иванович")).toBeInTheDocument();
		});
		// Иванов has role=admin → cannot delete
		await user.click(screen.getByRole("checkbox", { name: "Выбрать Иванов Иван Иванович" }));
		expect(screen.getByRole("button", { name: /Удалить/ })).toBeDisabled();
	});

	test("selecting only user-role employee enables Удалить", async () => {
		renderPage();
		const user = userEvent.setup();
		await waitFor(() => {
			expect(screen.getByText("Петрова Мария Сергеевна")).toBeInTheDocument();
		});
		// Петрова has role=user → can delete
		await user.click(screen.getByRole("checkbox", { name: "Выбрать Петрова Мария Сергеевна" }));
		expect(screen.getByRole("button", { name: /Удалить/ })).toBeEnabled();
	});
});

describe("EmployeesSettingsPage toolbar", () => {
	test("renders Добавить сотрудника button in the toolbar", async () => {
		renderPage();
		expect(screen.getByRole("button", { name: /Добавить сотрудника/i })).toBeInTheDocument();
	});
});
