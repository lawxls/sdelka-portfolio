import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as settingsApi from "@/data/settings-api";
import { _resetWorkspaceStore, _setUserSettings } from "@/data/workspace-mock-data";
import { createTestQueryClient, makeSettings } from "@/test-utils";
import { UserAvatarMenu } from "./user-avatar-menu";

const MOCK_SETTINGS = makeSettings({ last_name: "Петров", date_joined: "2025-01-15T10:00:00Z" });

beforeEach(() => {
	localStorage.clear();
	_setUserSettings(MOCK_SETTINGS);
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	_resetWorkspaceStore();
	vi.restoreAllMocks();
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
									<Route path="/settings/profile" element={<div data-testid="settings-profile-page">Profile</div>} />
									<Route
										path="/settings/companies"
										element={<div data-testid="settings-companies-page">Companies</div>}
									/>
									<Route
										path="/settings/employees"
										element={<div data-testid="settings-employees-page">Employees</div>}
									/>
									<Route path="/tasks" element={<div data-testid="tasks-page">Tasks</div>} />
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
		renderMenu();

		await waitFor(() => {
			expect(screen.getByText("ИП")).toBeInTheDocument();
		});
	});

	test("shows fallback icon before settings load", () => {
		vi.spyOn(settingsApi, "fetchSettings").mockReturnValueOnce(new Promise(() => {}));

		renderMenu();

		expect(screen.getByRole("button", { name: "Меню пользователя" })).toBeInTheDocument();
		expect(screen.queryByText("ИП")).not.toBeInTheDocument();
	});

	test("Мой профиль navigates to /settings/profile", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Мой профиль")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Мой профиль"));

		await waitFor(() => {
			expect(screen.getByTestId("settings-profile-page")).toBeInTheDocument();
		});
	});

	test("Компании navigates to /settings/companies", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Компании")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Компании"));

		await waitFor(() => {
			expect(screen.getByTestId("settings-companies-page")).toBeInTheDocument();
		});
	});

	test("Сотрудники navigates to /settings/employees", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Сотрудники")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Сотрудники"));

		await waitFor(() => {
			expect(screen.getByTestId("settings-employees-page")).toBeInTheDocument();
		});
	});

	test("Задачи navigates to /tasks", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Задачи")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Задачи"));

		await waitFor(() => {
			expect(screen.getByTestId("tasks-page")).toBeInTheDocument();
		});
	});

	test("menu items are in correct order: settings → Задачи → theme → Выйти", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Задачи")).toBeInTheDocument();
		});

		const items = screen.getAllByRole("menuitem");
		const labels = items.map((item) => item.textContent?.trim());

		expect(labels).toEqual(["Мой профиль", "Компании", "Сотрудники", "Задачи", "Сменить темуСменить тему", "Выйти"]);
	});

	test("menu shows Сменить тему item", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getAllByText("Сменить тему").length).toBeGreaterThan(0);
		});
	});

	test("menu shows Выйти item", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Выйти")).toBeInTheDocument();
		});
	});
});
