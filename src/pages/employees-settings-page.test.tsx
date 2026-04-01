import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { WorkspaceEmployee } from "@/data/workspace-types";
import { server } from "@/test-msw";
import { createTestQueryClient } from "@/test-utils";
import { EmployeesSettingsPage } from "./employees-settings-page";

let queryClient: QueryClient;

const mockEmployees: WorkspaceEmployee[] = [
	{
		id: 1,
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Директор",
		role: "admin",
		phone: "+79991234567",
		email: "ivan@example.com",
		companies: [{ id: "co-1", name: "Альфа" }],
		registeredAt: "2024-01-15T10:00:00Z",
		permissions: {
			id: "perm-1",
			employeeId: 1,
			analytics: "edit",
			procurement: "edit",
			companies: "edit",
			tasks: "edit",
		},
	},
	{
		id: 2,
		firstName: "Мария",
		lastName: "Петрова",
		patronymic: "",
		position: "Менеджер",
		role: "user",
		phone: "+79997654321",
		email: "maria@example.com",
		companies: [],
		registeredAt: null, // invite pending
		permissions: {
			id: "perm-2",
			employeeId: 2,
			analytics: "none",
			procurement: "view",
			companies: "none",
			tasks: "view",
		},
	},
];

beforeEach(() => {
	queryClient = createTestQueryClient();
	server.use(http.get("/api/v1/workspace/employees/", () => HttpResponse.json({ employees: mockEmployees })));
});

afterEach(() => {
	localStorage.clear();
});

function renderPage(initialPath = "/settings/employees") {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="/settings/employees" element={<EmployeesSettingsPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("EmployeesSettingsPage", () => {
	test("renders page heading", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByRole("heading", { name: "Сотрудники" })).toBeInTheDocument());
	});

	test("renders employee names in table", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByText("Иванов Иван")).toBeInTheDocument());
		expect(screen.getByText("Петрова Мария")).toBeInTheDocument();
	});

	test("shows formatted date for registered employees", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByText(/15.01.2024/)).toBeInTheDocument());
	});

	test("shows Приглашение отправлено for pending invite", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByText("Приглашение отправлено")).toBeInTheDocument());
	});

	test("clicking row opens employee detail drawer", async () => {
		const user = userEvent.setup();
		renderPage();
		await waitFor(() => expect(screen.getByText("Иванов Иван")).toBeInTheDocument());
		await user.click(screen.getByText("Иванов Иван"));
		await waitFor(() => expect(screen.getByTestId("employee-detail-drawer")).toBeInTheDocument());
	});

	test("renders Отправить приглашения button", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByRole("button", { name: /Отправить приглашения/ })).toBeInTheDocument());
	});
});
