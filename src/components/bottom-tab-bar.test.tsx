import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test } from "vitest";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { createInMemoryTasksClient } from "@/data/clients/tasks-in-memory";
import type { CurrentEmployee } from "@/data/domains/profile";
import type { Task } from "@/data/task-types";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeMe, makeTask } from "@/test-utils";
import { BottomTabBar } from "./bottom-tab-bar";

function renderBar(initialPath = "/positions", tasksSeed: Task[] = [], me: CurrentEmployee = makeMe()) {
	const queryClient = createTestQueryClient();
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				tasks: createInMemoryTasksClient({ seed: tasksSeed }),
				profile: createInMemoryProfileClient({ me }),
			}}
		>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="*" element={<BottomTabBar />} />
				</Routes>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

describe("BottomTabBar items", () => {
	test("renders Позиции, Вопросы, and Настройки with aria-labels", async () => {
		renderBar();
		expect(await screen.findByRole("link", { name: "Позиции" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Вопросы" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Настройки" })).toBeInTheDocument();
	});

	test("items link to /positions, /tasks, and /settings", async () => {
		renderBar();
		expect(await screen.findByRole("link", { name: "Позиции" })).toHaveAttribute("href", "/positions");
		expect(screen.getByRole("link", { name: "Вопросы" })).toHaveAttribute("href", "/tasks");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("href", "/settings");
	});

	test("nav has aria-label", () => {
		renderBar();
		expect(screen.getByRole("navigation", { name: "Основная навигация" })).toBeInTheDocument();
	});
});

describe("BottomTabBar active state", () => {
	test("marks Позиции active at /positions", async () => {
		renderBar("/positions");
		expect(await screen.findByRole("link", { name: "Позиции" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "Вопросы" })).not.toHaveAttribute("aria-current");
	});

	test("marks Вопросы active at /tasks", async () => {
		renderBar("/tasks");
		expect(await screen.findByRole("link", { name: "Вопросы" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active at /settings", async () => {
		renderBar("/settings");
		expect(await screen.findByRole("link", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active for deep routes (/settings/profile)", async () => {
		renderBar("/settings/profile");
		expect(await screen.findByRole("link", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
	});
});

describe("BottomTabBar visibility", () => {
	test("container has mobile-only visibility classes (hidden on desktop)", () => {
		renderBar();
		const bar = screen.getByTestId("bottom-tab-bar");
		expect(bar.className).toContain("md:hidden");
	});
});

describe("BottomTabBar navigation", () => {
	test("clicking an item navigates", async () => {
		const queryClient = createTestQueryClient();
		render(
			<TestClientsProvider
				queryClient={queryClient}
				clients={{
					tasks: createInMemoryTasksClient({ seed: [] }),
					profile: createInMemoryProfileClient({ me: makeMe() }),
				}}
			>
				<MemoryRouter initialEntries={["/positions"]}>
					<BottomTabBar />
					<Routes>
						<Route path="/positions" element={<div>procurement-page</div>} />
						<Route path="/settings" element={<div>settings-page</div>} />
					</Routes>
				</MemoryRouter>
			</TestClientsProvider>,
		);
		await userEvent.setup().click(await screen.findByRole("link", { name: "Настройки" }));
		expect(screen.getByText("settings-page")).toBeInTheDocument();
	});
});

describe("BottomTabBar task count badge", () => {
	test("shows count of active tasks (assigned + in_progress) on Вопросы", async () => {
		renderBar("/positions", [
			makeTask("t-1", { status: "assigned" }),
			makeTask("t-2", { status: "in_progress" }),
			makeTask("t-3", { status: "completed" }),
			makeTask("t-4", { status: "archived" }),
		]);
		const tasksLink = await screen.findByRole("link", { name: "Вопросы" });
		expect(await within(tasksLink).findByTestId("nav-tasks-count")).toHaveTextContent("2");
	});

	test("hides badge when there are no active tasks", async () => {
		renderBar("/positions", [makeTask("t-1", { status: "completed" })]);
		expect(await screen.findByRole("link", { name: "Вопросы" })).toBeInTheDocument();
		expect(screen.queryByTestId("nav-tasks-count")).not.toBeInTheDocument();
	});
});

describe("BottomTabBar permission filtering", () => {
	test("user with positions:none and tasks:view sees only Вопросы + Настройки", async () => {
		const me = makeMe({
			role: "user",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "none",
				positions: "none",
				tasks: "view",
				workspaceSettings: "none",
				companies: "none",
				employees: "none",
				emails: "none",
			},
		});
		renderBar("/tasks", [], me);
		expect(await screen.findByRole("link", { name: "Вопросы" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Настройки" })).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Позиции" })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Запросы" })).not.toBeInTheDocument();
	});

	test("archived-only user (role/permissions null) sees only Настройки", async () => {
		const me = makeMe({ role: null, permissions: null, isWorkspaceOwner: false });
		renderBar("/settings/profile", [], me);
		await waitFor(() => {
			expect(screen.queryByRole("link", { name: "Позиции" })).not.toBeInTheDocument();
		});
		expect(screen.queryByRole("link", { name: "Запросы" })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Вопросы" })).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Настройки" })).toBeInTheDocument();
	});
});
