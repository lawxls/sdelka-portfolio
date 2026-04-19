import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as settingsApi from "@/data/settings-api";
import { _resetWorkspaceStore, _setUserSettings } from "@/data/workspace-mock-data";
import { createTestQueryClient, makeSettings } from "@/test-utils";
import { UserAvatarMenu } from "./user-avatar-menu";

const MOCK_SETTINGS = makeSettings({ first_name: "Станислав", last_name: "Чмелев" });

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
								</Routes>
							</>
						}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("UserAvatarMenu trigger", () => {
	test("shows profile icon and formatted name without a chevron", async () => {
		renderMenu();

		await waitFor(() => {
			expect(screen.getByText("Станислав Ч.")).toBeInTheDocument();
		});
		const trigger = screen.getByRole("button", { name: "Меню пользователя" });
		expect(trigger.querySelector("svg.lucide-user")).toBeInTheDocument();
		expect(trigger.querySelector("svg.lucide-chevron-down")).not.toBeInTheDocument();
		expect(screen.queryByText("СЧ")).not.toBeInTheDocument();
	});

	test("name renders as '<First> <L>.' when last name is present", async () => {
		_setUserSettings(makeSettings({ first_name: "Станислав", last_name: "Чмелев" }));
		renderMenu();

		await waitFor(() => {
			expect(screen.getByText("Станислав Ч.")).toBeInTheDocument();
		});
	});

	test("name renders as '<First>' (no dot) when last name is missing", async () => {
		_setUserSettings(makeSettings({ first_name: "Станислав", last_name: "" }));
		renderMenu();

		await waitFor(() => {
			expect(screen.getByText("Станислав")).toBeInTheDocument();
		});
		expect(screen.queryByText(/Станислав\s+\./)).not.toBeInTheDocument();
	});

	test("shows profile icon (no name) before settings load", () => {
		vi.spyOn(settingsApi, "fetchSettings").mockReturnValueOnce(new Promise(() => {}));

		renderMenu();

		const trigger = screen.getByRole("button", { name: "Меню пользователя" });
		expect(trigger.querySelector("svg.lucide-user")).toBeInTheDocument();
		expect(screen.queryByText(/Станислав/)).not.toBeInTheDocument();
	});
});

describe("UserAvatarMenu dropdown", () => {
	test("contains only Мой профиль, Сменить тему, Выйти in order", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Мой профиль")).toBeInTheDocument();
		});

		const items = screen.getAllByRole("menuitem");
		const labels = items.map((item) => item.textContent?.replace(/Сменить темуСменить тему/, "Сменить тему").trim());
		expect(labels).toEqual(["Мой профиль", "Сменить тему", "Выйти"]);
	});

	test("does not show Компании, Сотрудники, or Задачи entries", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Мой профиль")).toBeInTheDocument();
		});

		expect(screen.queryByText("Компании")).not.toBeInTheDocument();
		expect(screen.queryByText("Сотрудники")).not.toBeInTheDocument();
		expect(screen.queryByText("Задачи")).not.toBeInTheDocument();
	});

	test("has a separator below Мой профиль and above Выйти", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Мой профиль")).toBeInTheDocument();
		});

		const separators = screen.getAllByRole("separator");
		expect(separators).toHaveLength(2);
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

	test("Выйти has destructive styling and clears tokens", async () => {
		localStorage.setItem("auth-access-token", "token");
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByText("Выйти")).toBeInTheDocument();
		});

		const logout = screen.getByText("Выйти").closest('[role="menuitem"]');
		expect(logout).toHaveAttribute("data-variant", "destructive");

		await user.click(screen.getByText("Выйти"));

		await waitFor(() => {
			expect(localStorage.getItem("auth-access-token")).toBeNull();
		});
	});

	test("Сменить тему toggles dark class and persists to localStorage", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getAllByText("Сменить тему").length).toBeGreaterThan(0);
		});

		await user.click(screen.getAllByText("Сменить тему")[0]);

		await waitFor(() => {
			expect(document.documentElement.classList.contains("dark")).toBe(true);
		});
		expect(localStorage.getItem("theme")).toBe("dark");

		document.documentElement.classList.remove("dark");
	});
});
