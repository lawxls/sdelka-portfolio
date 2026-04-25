import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
	_resetWorkspaceStore,
	_setWorkspaceEmployees,
	fetchWorkspaceEmployeeMock,
	type WorkspaceEmployeeDetail,
} from "@/data/workspace-mock-data";
import { createTestQueryClient, mockHostname } from "@/test-utils";
import { EmployeeDetailDrawer } from "./employee-detail-drawer";

const MOCK_EMPLOYEE: WorkspaceEmployeeDetail = {
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
		procurement: "view",
		tasks: "edit",
		companies: "none",
		employees: "edit",
		emails: "view",
	},
};

const MOCK_EMPLOYEE_PENDING: WorkspaceEmployeeDetail = {
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
};

let queryClient: QueryClient;

function renderWithUrl(initialPath: string) {
	return render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<MemoryRouter initialEntries={[initialPath]}>
					<Routes>
						<Route path="*" element={<EmployeeDetailDrawer />} />
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
	_setWorkspaceEmployees([MOCK_EMPLOYEE, MOCK_EMPLOYEE_PENDING]);
});

afterEach(() => {
	localStorage.clear();
	_resetWorkspaceStore();
});

describe("EmployeeDetailDrawer — Информация tab", () => {
	test("renders employee fields on Информация tab", async () => {
		renderWithUrl("/?employee=1");

		await waitFor(() => {
			expect(screen.getByTestId("employee-drawer-title")).toHaveTextContent("Иванов Иван Иванович");
		});

		expect(screen.getByTestId("employee-info-tab")).toBeInTheDocument();
		expect(screen.getByText("Директор")).toBeInTheDocument();
		expect(screen.getByText("ivan@example.com")).toBeInTheDocument();
		expect(screen.getByText("Компания А")).toBeInTheDocument();
		expect(screen.getByText("15.01.2024")).toBeInTheDocument();
	});

	test("shows Приглашение отправлено for pending employee", async () => {
		renderWithUrl("/?employee=2");

		await waitFor(() => {
			expect(screen.getByTestId("employee-drawer-title")).toHaveTextContent("Петрова Мария Сергеевна");
		});

		expect(screen.getByText("Приглашение отправлено")).toBeInTheDocument();
	});
});

describe("EmployeeDetailDrawer — Права доступа tab", () => {
	test("renders permission matrix on Права доступа tab", async () => {
		renderWithUrl("/?employee=1");

		await waitFor(() => {
			expect(screen.getByTestId("employee-tab-permissions")).toBeInTheDocument();
		});

		await userEvent.setup().click(screen.getByTestId("employee-tab-permissions"));

		expect(screen.getByTestId("employee-permissions-tab")).toBeInTheDocument();
		expect(screen.getByTestId("permissions-matrix")).toBeInTheDocument();
		expect(screen.getByTestId("perm-row-procurement")).toBeInTheDocument();
		expect(screen.getByTestId("perm-row-tasks")).toBeInTheDocument();
		expect(screen.getByTestId("perm-row-companies")).toBeInTheDocument();
		expect(screen.getByTestId("perm-row-employees")).toBeInTheDocument();
		expect(screen.getByTestId("perm-row-emails")).toBeInTheDocument();
	});

	test("permission change persists through the mock store", async () => {
		renderWithUrl("/?employee=1");

		await waitFor(() => {
			expect(screen.getByTestId("employee-tab-permissions")).toBeInTheDocument();
		});

		const user = userEvent.setup();
		await user.click(screen.getByTestId("employee-tab-permissions"));

		await user.click(screen.getByRole("button", { name: "Редактировать права доступа" }));
		await user.click(screen.getByTestId("perm-procurement-edit"));

		await waitFor(async () => {
			const detail = await fetchWorkspaceEmployeeMock(1);
			expect(detail.permissions.procurement).toBe("edit");
		});
	});
});

describe("EmployeeDetailDrawer — URL-driven open/close", () => {
	test("drawer is not visible without ?employee param", () => {
		renderWithUrl("/");
		expect(screen.queryByTestId("employee-drawer-title")).not.toBeInTheDocument();
	});

	test("deep-link with ?employee=1 opens correct employee", async () => {
		renderWithUrl("/?employee=1");

		await waitFor(() => {
			expect(screen.getByTestId("employee-drawer-title")).toHaveTextContent("Иванов Иван Иванович");
		});
	});
});
