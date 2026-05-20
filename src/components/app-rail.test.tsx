import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { createInMemoryTasksClient } from "@/data/clients/tasks-in-memory";
import type { CurrentEmployee } from "@/data/domains/profile";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import type { Task } from "@/data/task-types";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeMe, makeTask, TooltipWrapper } from "@/test-utils";
import { AppRail } from "./app-rail";

function renderRail(initialPath = "/positions", tasksSeed: Task[] = [], me: CurrentEmployee = makeMe()) {
	const queryClient = createTestQueryClient();
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				profile: createInMemoryProfileClient({ me }),
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

beforeEach(() => {
	_setMockDelay(0, 0);
});

afterEach(() => {
	_resetMockDelay();
});

describe("AppRail items", () => {
	test("renders Запросы, Позиции, Вопросы, and Настройки with aria-labels", async () => {
		renderRail();
		expect(await screen.findByRole("button", { name: "Запросы" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Позиции" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Вопросы" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Настройки" })).toBeInTheDocument();
	});

	test("Запросы is the first top-nav item, above Позиции", async () => {
		renderRail();
		await screen.findByRole("button", { name: "Запросы" });
		const mainNav = screen.getByRole("navigation", { name: "Основная навигация" });
		const buttons = within(mainNav).getAllByRole("button");
		expect(buttons[0]).toHaveAccessibleName("Запросы");
		expect(buttons[1]).toHaveAccessibleName("Позиции");
	});

	test("nav has aria-label", () => {
		renderRail();
		expect(screen.getByRole("navigation", { name: "Основная навигация" })).toBeInTheDocument();
	});

	test("Настройки and Помощь live in the bottom section", async () => {
		renderRail();
		const bottom = screen.getByTestId("app-rail-bottom");
		expect(bottom).toContainElement(await screen.findByRole("button", { name: "Настройки" }));
		expect(bottom).toContainElement(screen.getByRole("button", { name: "Помощь" }));
	});

	test("top navigation does not contain Настройки", async () => {
		renderRail();
		await screen.findByRole("button", { name: "Запросы" });
		const mainNav = screen.getByRole("navigation", { name: "Основная навигация" });
		expect(mainNav).not.toContainElement(screen.getByRole("button", { name: "Настройки" }));
	});

	test("Помощь opens the support dialog", async () => {
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
	test("marks Позиции active at /positions", async () => {
		renderRail("/positions");
		expect(await screen.findByRole("button", { name: "Позиции" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("button", { name: "Вопросы" })).not.toHaveAttribute("aria-current");
	});

	test("marks Вопросы active at /tasks", async () => {
		renderRail("/tasks");
		expect(await screen.findByRole("button", { name: "Вопросы" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active at /settings", () => {
		renderRail("/settings");
		expect(screen.getByRole("button", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active for deep settings routes (/settings/profile)", () => {
		renderRail("/settings/profile");
		expect(screen.getByRole("button", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Позиции active when query params are present", async () => {
		renderRail("/positions?folder=archive");
		expect(await screen.findByRole("button", { name: "Позиции" })).toHaveAttribute("aria-current", "page");
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
		const tasksButton = await screen.findByRole("button", { name: "Вопросы" });
		expect(await within(tasksButton).findByTestId("nav-tasks-count")).toHaveTextContent("3");
	});

	test("hides badge when there are no active tasks", async () => {
		renderRail("/positions", [makeTask("t-1", { status: "completed" }), makeTask("t-2", { status: "archived" })]);
		expect(await screen.findByRole("button", { name: "Вопросы" })).toBeInTheDocument();
		expect(screen.queryByTestId("nav-tasks-count")).not.toBeInTheDocument();
	});

	test("badge is hidden from accessible name", async () => {
		renderRail("/positions", [makeTask("t-1", { status: "assigned" })]);
		const tasksButton = await screen.findByRole("button", { name: "Вопросы" });
		const badge = await within(tasksButton).findByTestId("nav-tasks-count");
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
		await userEvent.setup().click(await screen.findByRole("button", { name: "Вопросы" }));
		expect(screen.getByText("tasks-page")).toBeInTheDocument();
	});
});

describe("AppRail permission filtering", () => {
	test("user with tasks:none does not see Вопросы in the rail", async () => {
		const me = makeMe({
			role: "user",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "view",
				positions: "view",
				tasks: "none",
				workspaceSettings: "none",
				companies: "none",
				employees: "none",
				emails: "none",
			},
		});
		renderRail("/positions", [], me);
		expect(await screen.findByRole("button", { name: "Позиции" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Вопросы" })).not.toBeInTheDocument();
	});

	test("admin sees every module item regardless of stored permissions", async () => {
		const me = makeMe({
			role: "admin",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "none",
				positions: "none",
				tasks: "none",
				workspaceSettings: "none",
				companies: "none",
				employees: "none",
				emails: "none",
			},
		});
		renderRail("/positions", [], me);
		expect(await screen.findByRole("button", { name: "Запросы" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Позиции" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Вопросы" })).toBeInTheDocument();
	});
});
