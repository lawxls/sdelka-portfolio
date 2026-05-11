import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test } from "vitest";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { createInMemoryTasksClient } from "@/data/clients/tasks-in-memory";
import type { Task } from "@/data/task-types";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeMe, makeTask, TooltipWrapper } from "@/test-utils";
import { AppRail } from "./app-rail";

function renderRail(initialPath = "/positions", tasksSeed: Task[] = []) {
	const queryClient = createTestQueryClient();
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				profile: createInMemoryProfileClient({ me: makeMe() }),
				tasks: createInMemoryTasksClient({ seed: tasksSeed }),
			}}
		>
			<TooltipWrapper>
				<MemoryRouter initialEntries={[initialPath]}>
					<Routes>
						<Route path="*" element={<AppRail />} />
					</Routes>
				</MemoryRouter>
			</TooltipWrapper>
		</TestClientsProvider>,
	);
}

describe("AppRail items", () => {
	test("renders Запросы, Позиции, Вопросы, and Настройки with aria-labels", () => {
		renderRail();
		expect(screen.getByRole("link", { name: "Запросы" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Позиции" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Вопросы" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Настройки" })).toBeInTheDocument();
	});

	test("Запросы is the first top-nav item, above Позиции", () => {
		renderRail();
		const mainNav = screen.getByRole("navigation", { name: "Основная навигация" });
		const links = within(mainNav).getAllByRole("link");
		expect(links[0]).toHaveAccessibleName("Запросы");
		expect(links[1]).toHaveAccessibleName("Позиции");
	});

	test("items link to /positions, /tasks, and /settings", () => {
		renderRail();
		expect(screen.getByRole("link", { name: "Позиции" })).toHaveAttribute("href", "/positions");
		expect(screen.getByRole("link", { name: "Вопросы" })).toHaveAttribute("href", "/tasks");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("href", "/settings");
	});

	test("nav has aria-label", () => {
		renderRail();
		expect(screen.getByRole("navigation", { name: "Основная навигация" })).toBeInTheDocument();
	});

	test("Настройки and Помощь live in the bottom section", () => {
		renderRail();
		const bottom = screen.getByTestId("app-rail-bottom");
		expect(bottom).toContainElement(screen.getByRole("link", { name: "Настройки" }));
		expect(bottom).toContainElement(screen.getByRole("button", { name: "Помощь" }));
	});

	test("top navigation does not contain Настройки", () => {
		renderRail();
		const mainNav = screen.getByRole("navigation", { name: "Основная навигация" });
		expect(mainNav).not.toContainElement(screen.getByRole("link", { name: "Настройки" }));
	});

	test("Помощь renders as a button (no navigation)", () => {
		renderRail();
		expect(screen.queryByRole("link", { name: "Помощь" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Помощь" })).toBeInTheDocument();
	});

	test("clicking Помощь opens the support dialog", async () => {
		renderRail();
		expect(screen.queryByRole("dialog", { name: "Поддержка" })).not.toBeInTheDocument();
		await userEvent.setup().click(screen.getByRole("button", { name: "Помощь" }));
		expect(screen.getByRole("dialog", { name: "Поддержка" })).toBeInTheDocument();
	});

	test("avatar trigger lives at the bottom of the sidebar, separated from nav items", () => {
		renderRail();
		const bottom = screen.getByTestId("app-rail-bottom");
		expect(bottom).toContainElement(screen.getByRole("link", { name: "Меню пользователя" }));
	});
});

describe("AppRail active state", () => {
	test("marks Позиции active at /positions", () => {
		renderRail("/positions");
		expect(screen.getByRole("link", { name: "Позиции" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "Вопросы" })).not.toHaveAttribute("aria-current");
	});

	test("marks Вопросы active at /tasks", () => {
		renderRail("/tasks");
		expect(screen.getByRole("link", { name: "Вопросы" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active at /settings", () => {
		renderRail("/settings");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active for deep settings routes (/settings/profile)", () => {
		renderRail("/settings/profile");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Позиции active when query params are present", () => {
		renderRail("/positions?folder=archive");
		expect(screen.getByRole("link", { name: "Позиции" })).toHaveAttribute("aria-current", "page");
	});
});

describe("AppRail visibility", () => {
	test("container has desktop-only visibility classes (hidden on mobile)", () => {
		renderRail();
		const rail = screen.getByTestId("app-rail");
		expect(rail.className).toContain("hidden");
		expect(rail.className).toContain("md:flex");
	});
});

describe("AppRail task count badge", () => {
	test("shows count of active tasks (assigned + in_progress) next to Вопросы", async () => {
		renderRail("/positions", [
			makeTask("t-1", { status: "assigned" }),
			makeTask("t-2", { status: "in_progress" }),
			makeTask("t-3", { status: "in_progress" }),
			makeTask("t-4", { status: "completed" }),
			makeTask("t-5", { status: "archived" }),
		]);
		const tasksLink = screen.getByRole("link", { name: "Вопросы" });
		expect(await within(tasksLink).findByTestId("nav-tasks-count")).toHaveTextContent("3");
	});

	test("hides badge when there are no active tasks", async () => {
		renderRail("/positions", [makeTask("t-1", { status: "completed" }), makeTask("t-2", { status: "archived" })]);
		// Wait for query settle so a missing badge isn't a race
		expect(await screen.findByRole("link", { name: "Вопросы" })).toBeInTheDocument();
		expect(screen.queryByTestId("nav-tasks-count")).not.toBeInTheDocument();
	});

	test("badge is hidden from accessible name", async () => {
		renderRail("/positions", [makeTask("t-1", { status: "assigned" })]);
		const tasksLink = await screen.findByRole("link", { name: "Вопросы" });
		const badge = await within(tasksLink).findByTestId("nav-tasks-count");
		expect(badge).toHaveAttribute("aria-hidden", "true");
	});
});

describe("AppRail navigation", () => {
	test("clicking an item navigates", async () => {
		const queryClient = createTestQueryClient();
		render(
			<TestClientsProvider
				queryClient={queryClient}
				clients={{
					profile: createInMemoryProfileClient({ me: makeMe() }),
					tasks: createInMemoryTasksClient({ seed: [] }),
				}}
			>
				<TooltipWrapper>
					<MemoryRouter initialEntries={["/positions"]}>
						<AppRail />
						<Routes>
							<Route path="/positions" element={<div>procurement-page</div>} />
							<Route path="/tasks" element={<div>tasks-page</div>} />
						</Routes>
					</MemoryRouter>
				</TooltipWrapper>
			</TestClientsProvider>,
		);
		await userEvent.setup().click(screen.getByRole("link", { name: "Вопросы" }));
		expect(screen.getByText("tasks-page")).toBeInTheDocument();
	});
});
