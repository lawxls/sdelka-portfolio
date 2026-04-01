import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as authApi from "@/data/auth-api";
import { server } from "@/test-msw";
import { createTestQueryClient, makeSettings } from "@/test-utils";
import { ProfileSettingsPage } from "./profile-settings-page";

const mockSettings = makeSettings();

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	server.use(http.get("/api/v1/auth/settings", () => HttpResponse.json(mockSettings)));
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

function renderPage() {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={["/settings/profile"]}>
				<ProfileSettingsPage />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("ProfileSettingsPage", () => {
	test("renders user name and email from mock", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByText("Иван Иванов")).toBeInTheDocument());
		expect(screen.getByDisplayValue("ivan@example.com")).toBeInTheDocument();
	});

	test("renders editable Имя, Фамилия fields pre-filled", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByDisplayValue("Иван")).toBeInTheDocument());
		expect(screen.getByDisplayValue("Иванов")).toBeInTheDocument();
	});

	test("save mutation called with changed fields on submit", async () => {
		const user = userEvent.setup();
		let patchBody: unknown;
		server.use(
			http.patch("/api/v1/auth/settings", async ({ request }) => {
				patchBody = await request.json();
				return HttpResponse.json({ ...mockSettings, first_name: "Алексей" });
			}),
		);

		renderPage();
		await waitFor(() => expect(screen.getByDisplayValue("Иван")).toBeInTheDocument());

		const firstNameInput = screen.getByDisplayValue("Иван");
		await user.clear(firstNameInput);
		await user.type(firstNameInput, "Алексей");

		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		await waitFor(() => {
			expect(patchBody).toEqual(expect.objectContaining({ first_name: "Алексей" }));
		});
	});

	test("Изменить пароль button sends reset email to user email", async () => {
		const forgotPasswordSpy = vi.spyOn(authApi, "forgotPassword").mockResolvedValue({ detail: "Sent" });
		const user = userEvent.setup();
		server.use(http.post("/api/v1/auth/forgot-password", () => HttpResponse.json({ detail: "Sent" })));

		renderPage();
		await waitFor(() => expect(screen.getByText("Изменить пароль")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: "Изменить пароль" }));

		await waitFor(() => {
			expect(forgotPasswordSpy).toHaveBeenCalledWith("ivan@example.com");
		});
	});

	test("shows loading skeleton while fetching", () => {
		server.use(
			http.get("/api/v1/auth/settings", async () => {
				await new Promise((r) => setTimeout(r, 200));
				return HttpResponse.json(mockSettings);
			}),
		);
		renderPage();
		expect(screen.getByTestId("profile-skeleton")).toBeInTheDocument();
	});
});
