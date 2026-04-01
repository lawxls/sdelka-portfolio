import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { server } from "@/test-msw";
import { createTestQueryClient, makeCompany } from "@/test-utils";
import { InviteEmployeesDrawer } from "./invite-employees-drawer";

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	server.use(
		http.get("/api/v1/companies/", () =>
			HttpResponse.json({
				companies: [makeCompany("co-1", { name: "Альфа" }), makeCompany("co-2", { name: "Бета" })],
				nextCursor: null,
			}),
		),
		http.post("/api/v1/workspace/employees/invite/", () => new HttpResponse(null, { status: 201 })),
	);
});

afterEach(() => {
	localStorage.clear();
});

function renderDrawer(open = true) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<InviteEmployeesDrawer open={open} onOpenChange={() => {}} />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("InviteEmployeesDrawer", () => {
	test("renders drawer title", () => {
		renderDrawer();
		expect(screen.getByText("Отправить приглашения")).toBeInTheDocument();
	});

	test("starts with one invite card", () => {
		renderDrawer();
		// One email input field visible
		expect(screen.getAllByLabelText("Электронная почта")).toHaveLength(1);
	});

	test("clicking + Добавить appends a card", async () => {
		const user = userEvent.setup();
		renderDrawer();
		await user.click(screen.getByRole("button", { name: "+ Добавить" }));
		expect(screen.getAllByLabelText("Электронная почта")).toHaveLength(2);
	});

	test("submit fires bulk invite POST request", async () => {
		const user = userEvent.setup();
		let capturedBody: unknown;
		server.use(
			http.post("/api/v1/workspace/employees/invite/", async ({ request }) => {
				capturedBody = await request.json();
				return new HttpResponse(null, { status: 201 });
			}),
		);

		renderDrawer();

		await user.type(screen.getByLabelText("Электронная почта"), "new@example.com");
		await user.type(screen.getByLabelText("Должность"), "Менеджер");

		await user.click(screen.getByRole("button", { name: "Отправить" }));

		await waitFor(() => {
			expect(capturedBody).toEqual(
				expect.objectContaining({
					invites: expect.arrayContaining([expect.objectContaining({ email: "new@example.com" })]),
				}),
			);
		});
	});

	test("does not render when closed", () => {
		renderDrawer(false);
		expect(screen.queryByText("Отправить приглашения")).not.toBeInTheDocument();
	});
});
