import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ProfileClient } from "@/data/clients/profile-client";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { fakeProfileClient, TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeMe } from "@/test-utils";
import { UserAvatarMenu } from "./user-avatar-menu";

const MOCK_ME = makeMe({ first_name: "Станислав", last_name: "Чмелев" });

beforeEach(() => {
	localStorage.clear();
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

function renderMenu(opts: { initialEntries?: string[]; profile?: ProfileClient } = {}) {
	const queryClient = createTestQueryClient();
	const profile = opts.profile ?? createInMemoryProfileClient({ me: MOCK_ME });
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
		const trigger = screen.getByRole("link", { name: "Меню пользователя" });
		expect(trigger.querySelector("svg.lucide-user")).toBeInTheDocument();
		expect(trigger.querySelector("svg.lucide-chevron-down")).not.toBeInTheDocument();
		expect(screen.queryByText("СЧ")).not.toBeInTheDocument();
	});

	test("name renders as '<First> <Last>' when last name is present", async () => {
		renderMenu({
			profile: createInMemoryProfileClient({
				me: makeMe({ first_name: "Станислав", last_name: "Чмелев" }),
			}),
		});

		await waitFor(() => {
			expect(screen.getByText("Станислав Чмелев")).toBeInTheDocument();
		});
	});

	test("name renders as '<First>' when last name is missing", async () => {
		renderMenu({
			profile: createInMemoryProfileClient({
				me: makeMe({ first_name: "Станислав", last_name: "" }),
			}),
		});

		await waitFor(() => {
			expect(screen.getByText("Станислав")).toBeInTheDocument();
		});
		expect(screen.queryByText(/Станислав\s+\./)).not.toBeInTheDocument();
	});

	test("shows profile icon (no name) before me loads", () => {
		const profile = fakeProfileClient({
			me: () => new Promise(() => {}),
		});
		renderMenu({ profile });

		const trigger = screen.getByRole("link", { name: "Меню пользователя" });
		expect(trigger.querySelector("svg.lucide-user")).toBeInTheDocument();
		expect(screen.queryByText(/Станислав/)).not.toBeInTheDocument();
	});
});

describe("UserAvatarMenu navigation", () => {
	test("trigger is a link to /settings/profile", () => {
		renderMenu();
		const trigger = screen.getByRole("link", { name: "Меню пользователя" });
		expect(trigger).toHaveAttribute("href", "/settings/profile");
	});

	test("clicking the trigger navigates to /settings/profile", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("link", { name: "Меню пользователя" }));

		await waitFor(() => {
			expect(screen.getByTestId("settings-profile-page")).toBeInTheDocument();
		});
	});

	test("does not open a dropdown menu", async () => {
		renderMenu();
		const user = userEvent.setup();

		await user.click(screen.getByRole("link", { name: "Меню пользователя" }));

		expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
	});
});
