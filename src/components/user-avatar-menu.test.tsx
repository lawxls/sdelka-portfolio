import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ProfileClient } from "@/data/clients/profile-client";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { fakeProfileClient, TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeSettings } from "@/test-utils";
import { UserAvatarMenu } from "./user-avatar-menu";

const MOCK_SETTINGS = makeSettings({ first_name: "Станислав", last_name: "Чмелев" });

beforeEach(() => {
	localStorage.clear();
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

function renderMenu(opts: { initialEntries?: string[]; profile?: ProfileClient } = {}) {
	const queryClient = createTestQueryClient();
	const profile = opts.profile ?? createInMemoryProfileClient({ settings: MOCK_SETTINGS });
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ profile }}>
			<MemoryRouter initialEntries={opts.initialEntries ?? ["/"]}>
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
		</TestClientsProvider>,
	);
}

describe("UserAvatarMenu trigger", () => {
	test("shows profile icon and full name without a chevron", async () => {
		renderMenu();

		await waitFor(() => {
			expect(screen.getByText("Станислав Чмелев")).toBeInTheDocument();
		});
		const trigger = screen.getByRole("button", { name: "Меню пользователя" });
		expect(trigger.querySelector("svg.lucide-user")).toBeInTheDocument();
		expect(trigger.querySelector("svg.lucide-chevron-down")).not.toBeInTheDocument();
		expect(screen.queryByText("СЧ")).not.toBeInTheDocument();
	});

	test("name renders as '<First> <Last>' when last name is present", async () => {
		renderMenu({
			profile: createInMemoryProfileClient({
				settings: makeSettings({ first_name: "Станислав", last_name: "Чмелев" }),
			}),
		});

		await waitFor(() => {
			expect(screen.getByText("Станислав Чмелев")).toBeInTheDocument();
		});
	});

	test("name renders as '<First>' when last name is missing", async () => {
		renderMenu({
			profile: createInMemoryProfileClient({
				settings: makeSettings({ first_name: "Станислав", last_name: "" }),
			}),
		});

		await waitFor(() => {
			expect(screen.getByText("Станислав")).toBeInTheDocument();
		});
		expect(screen.queryByText(/Станислав\s+\./)).not.toBeInTheDocument();
	});

	test("shows profile icon (no name) before settings load", () => {
		const profile = fakeProfileClient({
			settings: () => new Promise(() => {}),
		});
		renderMenu({ profile });

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
