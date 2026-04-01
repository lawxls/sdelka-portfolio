import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WorkspaceEmployee } from "@/data/workspace-types";
import { server } from "@/test-msw";
import { createTestQueryClient } from "@/test-utils";
import { EmployeeDetailDrawer } from "./employee-detail-drawer";

let queryClient: QueryClient;

const mockEmployee: WorkspaceEmployee = {
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
		procurement: "view",
		companies: "none",
		tasks: "edit",
	},
};

beforeEach(() => {
	queryClient = createTestQueryClient();
	server.use(
		http.patch("/api/v1/workspace/employees/:id/permissions/", () =>
			HttpResponse.json({ ...mockEmployee.permissions, analytics: "none" }),
		),
	);
});

afterEach(() => {
	localStorage.clear();
});

function renderDrawer(employee: WorkspaceEmployee | null = mockEmployee) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<TooltipProvider>
					<EmployeeDetailDrawer employee={employee} onClose={() => {}} />
				</TooltipProvider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("EmployeeDetailDrawer", () => {
	test("renders drawer with employee name as title when open", async () => {
		renderDrawer();
		expect(screen.getByText("Иванов Иван Иванович")).toBeInTheDocument();
	});

	test("Информация tab shows employee email and position", async () => {
		renderDrawer();
		expect(screen.getByText("ivan@example.com")).toBeInTheDocument();
		expect(screen.getByText("Директор")).toBeInTheDocument();
	});

	test("Права доступа tab shows permissions matrix", async () => {
		const user = userEvent.setup();
		renderDrawer();
		await user.click(screen.getByRole("tab", { name: "Права доступа" }));
		expect(screen.getByTestId("permissions-matrix")).toBeInTheDocument();
	});

	test("permission change fires update mutation", async () => {
		const user = userEvent.setup();
		let patchBody: unknown;
		server.use(
			http.patch("/api/v1/workspace/employees/:id/permissions/", async ({ request }) => {
				patchBody = await request.json();
				return HttpResponse.json(mockEmployee.permissions);
			}),
		);

		// Use non-privileged role so edit button is visible
		renderDrawer({ ...mockEmployee, role: "user" });
		await user.click(screen.getByRole("tab", { name: "Права доступа" }));

		// Click edit on permissions matrix
		const editBtn = screen.getByRole("button", { name: "Редактировать права доступа" });
		await user.click(editBtn);

		// Click "Нет" (none) for analytics
		await user.click(screen.getByTestId("perm-analytics-none"));

		// Click "Готово" to save
		await user.click(screen.getByRole("button", { name: "Готово" }));

		await waitFor(() => {
			expect(patchBody).toEqual(expect.objectContaining({ analytics: "none" }));
		});
	});

	test("does not render when employee is null", () => {
		renderDrawer(null);
		expect(screen.queryByText("Иванов Иван Иванович")).not.toBeInTheDocument();
	});
});
