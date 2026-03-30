import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { server } from "@/test-msw";
import { createTestQueryClient, makeSettings } from "@/test-utils";
import { UserAvatarMenu } from "./user-avatar-menu";

const MOCK_SETTINGS = makeSettings({ last_name: "Петров", date_joined: "2025-01-15T10:00:00Z" });

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
	localStorage.clear();
	vi.spyOn(console, "error").mockImplementation(() => {});
});

function renderMenu(initialEntries = ["/"]) {
	const queryClient = createTestQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<Routes>
					<Route
						path="*"
						element={
							<>
								<UserAvatarMenu />
								<Routes>
									<Route path="/profile" element={<div data-testid="profile-page">Profile</div>} />
								</Routes>
							</>
						}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("UserAvatarMenu", () => {
	test("shows user initials avatar when settings load", async () => {
		server.use(http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)));

		renderMenu();

		await waitFor(() => {
			expect(screen.getByText("ИП")).toBeInTheDocument();
		});
	});

	test("shows fallback icon before settings load", () => {
		server.use(http.get("/api/v1/auth/settings", () => new Promise(() => {})));

		renderMenu();

		expect(screen.getByRole("button", { name: "Меню пользователя" })).toBeInTheDocument();
		expect(screen.queryByText("ИП")).not.toBeInTheDocument();
	});

	test("Мой профиль navigates to /profile", async () => {
		server.use(http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)));

		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Мой профиль")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Мой профиль"));

		await waitFor(() => {
			expect(screen.getByTestId("profile-page")).toBeInTheDocument();
		});
	});

	test("Настройки navigates to /profile?tab=settings", async () => {
		server.use(http.get("/api/v1/auth/settings", () => HttpResponse.json(MOCK_SETTINGS)));

		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Настройки")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Настройки"));

		await waitFor(() => {
			expect(screen.getByTestId("profile-page")).toBeInTheDocument();
		});
	});
});
