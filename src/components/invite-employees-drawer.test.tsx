import type { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { TestClientsProvider } from "@/data/test-clients-provider";
import type { Company } from "@/data/types";
import * as workspaceMock from "@/data/workspace-mock-data";
import { createTestQueryClient, mockHostname } from "@/test-utils";
import { InviteEmployeesDrawer } from "./invite-employees-drawer";

function makeCompanyDoc(id: string, name: string): Company {
	return {
		id,
		name,
		website: "",
		description: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses: [],
		employees: [],
	};
}

const MOCK_COMPANIES: Company[] = [makeCompanyDoc("c1", "Компания А"), makeCompanyDoc("c2", "Компания Б")];

let queryClient: QueryClient;

function renderDrawer(open = true) {
	const onOpenChange = vi.fn();
	render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{ companies: createInMemoryCompaniesClient(MOCK_COMPANIES) }}
		>
			<MemoryRouter>
				<InviteEmployeesDrawer open={open} onOpenChange={onOpenChange} />
			</MemoryRouter>
		</TestClientsProvider>,
	);
	return { onOpenChange };
}

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	workspaceMock._resetWorkspaceStore();
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("InviteEmployeesDrawer default state", () => {
	test("renders one invite card by default", async () => {
		renderDrawer();
		await waitFor(() => {
			expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
		});
		expect(screen.queryByText("Сотрудник 2")).not.toBeInTheDocument();
	});
});

describe("InviteEmployeesDrawer add card", () => {
	test("+ Добавить appends a new invite card when required fields are filled", async () => {
		renderDrawer();
		await waitFor(() => {
			expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.type(screen.getByRole("textbox", { name: /Фамилия/i }), "Иванов");
		await user.type(screen.getByRole("textbox", { name: /^Имя$/i }), "Иван");
		await user.type(screen.getByRole("textbox", { name: /Электронная почта/i }), "a@b.com");
		await user.click(screen.getByRole("button", { name: /Добавить/i }));
		expect(screen.getByText("Сотрудник 2")).toBeInTheDocument();
	});

	test("+ Добавить highlights email when empty", async () => {
		renderDrawer();
		await waitFor(() => {
			expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /Добавить/i }));
		expect(screen.queryByText("Сотрудник 2")).not.toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: /Электронная почта/i })).toHaveAttribute("aria-invalid", "true");
	});
});

describe("InviteEmployeesDrawer remove card", () => {
	test("remove button deletes a card, renumbering remaining", async () => {
		renderDrawer();
		await waitFor(() => {
			expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.type(screen.getByRole("textbox", { name: /Фамилия/i }), "Иванов");
		await user.type(screen.getByRole("textbox", { name: /^Имя$/i }), "Иван");
		await user.type(screen.getByRole("textbox", { name: /Электронная почта/i }), "a@b.com");
		await user.click(screen.getByRole("button", { name: /Добавить/i }));
		expect(screen.getByText("Сотрудник 2")).toBeInTheDocument();
		const removeButtons = screen.getAllByRole("button", { name: /Удалить приглашение/i });
		await user.click(removeButtons[0]);
		expect(screen.queryByText("Сотрудник 2")).not.toBeInTheDocument();
		expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
	});

	test("cannot remove when only one card remains (no remove button)", async () => {
		renderDrawer();
		await waitFor(() => {
			expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
		});
		expect(screen.queryByRole("button", { name: /Удалить приглашение/i })).not.toBeInTheDocument();
	});
});

describe("InviteEmployeesDrawer submit", () => {
	test("submit appends the invitee to the workspace store", async () => {
		workspaceMock._setWorkspaceEmployees([]);
		renderDrawer();
		await waitFor(() => {
			expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.type(screen.getByRole("textbox", { name: /Фамилия/i }), "Иванов");
		await user.type(screen.getByRole("textbox", { name: /^Имя$/i }), "Иван");
		await user.type(screen.getByRole("textbox", { name: /Электронная почта/i }), "test@example.com");
		await user.click(screen.getByRole("button", { name: /Отправить/i }));

		await waitFor(async () => {
			const list = await workspaceMock.fetchWorkspaceEmployeesMock();
			expect(list.some((e) => e.email === "test@example.com")).toBe(true);
		});
	});
});
