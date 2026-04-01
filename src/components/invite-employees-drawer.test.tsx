import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { server } from "@/test-msw";
import { createTestQueryClient, makeCompany, mockHostname } from "@/test-utils";
import { InviteEmployeesDrawer } from "./invite-employees-drawer";

const MOCK_COMPANIES = [makeCompany("c1", { name: "Компания А" }), makeCompany("c2", { name: "Компания Б" })];

let queryClient: QueryClient;

function renderDrawer(open = true) {
	const onOpenChange = vi.fn();
	render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<InviteEmployeesDrawer open={open} onOpenChange={onOpenChange} />
			</MemoryRouter>
		</QueryClientProvider>,
	);
	return { onOpenChange };
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
		http.post("/api/v1/workspace/employees/invite/", () => {
			return HttpResponse.json({}, { status: 201 });
		}),
	);
});

afterEach(() => {
	localStorage.clear();
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
	test("+ Добавить appends a new invite card", async () => {
		renderDrawer();
		await waitFor(() => {
			expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
		});
		await userEvent.setup().click(screen.getByRole("button", { name: /Добавить/i }));
		expect(screen.getByText("Сотрудник 2")).toBeInTheDocument();
	});
});

describe("InviteEmployeesDrawer remove card", () => {
	test("remove button deletes a card, renumbering remaining", async () => {
		renderDrawer();
		await waitFor(() => {
			expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		// Add second card
		await user.click(screen.getByRole("button", { name: /Добавить/i }));
		expect(screen.getByText("Сотрудник 2")).toBeInTheDocument();
		// Remove first card
		const removeButtons = screen.getAllByRole("button", { name: /Удалить приглашение/i });
		await user.click(removeButtons[0]);
		// Only one card remains, renumbered to 1
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
	test("submit fires correct bulk payload to POST /api/v1/workspace/employees/invite/", async () => {
		let captured: unknown = null;
		server.use(
			http.post("/api/v1/workspace/employees/invite/", async ({ request }) => {
				captured = await request.json();
				return HttpResponse.json({}, { status: 201 });
			}),
		);
		renderDrawer();
		await waitFor(() => {
			expect(screen.getByText("Сотрудник 1")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.type(screen.getByRole("textbox", { name: /Электронная почта/i }), "test@example.com");
		await user.click(screen.getByRole("button", { name: /Отправить/i }));
		await waitFor(() => {
			expect(captured).toEqual({
				invites: [{ email: "test@example.com", position: "", role: "user", companies: [] }],
			});
		});
	});
});
