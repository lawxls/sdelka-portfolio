import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test } from "vitest";
import { createInMemoryTasksClient } from "@/data/clients/tasks-in-memory";
import type { Task } from "@/data/task-types";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeTask } from "@/test-utils";
import { BottomTabBar } from "./bottom-tab-bar";

function renderBar(initialPath = "/positions", tasksSeed: Task[] = []) {
	const queryClient = createTestQueryClient();
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ tasks: createInMemoryTasksClient({ seed: tasksSeed }) }}>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="*" element={<BottomTabBar />} />
				</Routes>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

describe("BottomTabBar items", () => {
	test("renders Позиции, Задачи, and Настройки with aria-labels", () => {
		renderBar();
		expect(screen.getByRole("link", { name: "Позиции" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Задачи" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Настройки" })).toBeInTheDocument();
	});

	test("items link to /positions, /tasks, and /settings/workspace", () => {
		renderBar();
		expect(screen.getByRole("link", { name: "Позиции" })).toHaveAttribute("href", "/positions");
		expect(screen.getByRole("link", { name: "Задачи" })).toHaveAttribute("href", "/tasks");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("href", "/settings/workspace");
	});

	test("nav has aria-label", () => {
		renderBar();
		expect(screen.getByRole("navigation", { name: "Основная навигация" })).toBeInTheDocument();
	});
});

describe("BottomTabBar active state", () => {
	test("marks Позиции active at /positions", () => {
		renderBar("/positions");
		expect(screen.getByRole("link", { name: "Позиции" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "Задачи" })).not.toHaveAttribute("aria-current");
	});

	test("marks Задачи active at /tasks", () => {
		renderBar("/tasks");
		expect(screen.getByRole("link", { name: "Задачи" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active at /settings", () => {
		renderBar("/settings");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active for deep routes (/settings/profile)", () => {
		renderBar("/settings/profile");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
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
			<TestClientsProvider queryClient={queryClient} clients={{ tasks: createInMemoryTasksClient({ seed: [] }) }}>
				<MemoryRouter initialEntries={["/positions"]}>
					<BottomTabBar />
					<Routes>
						<Route path="/positions" element={<div>procurement-page</div>} />
						<Route path="/settings/workspace" element={<div>settings-page</div>} />
					</Routes>
				</MemoryRouter>
			</TestClientsProvider>,
		);
		await userEvent.setup().click(screen.getByRole("link", { name: "Настройки" }));
		expect(screen.getByText("settings-page")).toBeInTheDocument();
	});
});

describe("BottomTabBar task count badge", () => {
	test("shows count of active tasks (assigned + in_progress) on Задачи", async () => {
		renderBar("/positions", [
			makeTask("t-1", { status: "assigned" }),
			makeTask("t-2", { status: "in_progress" }),
			makeTask("t-3", { status: "completed" }),
			makeTask("t-4", { status: "archived" }),
		]);
		const tasksLink = screen.getByRole("link", { name: "Задачи" });
		expect(await within(tasksLink).findByTestId("nav-tasks-count")).toHaveTextContent("2");
	});

	test("hides badge when there are no active tasks", async () => {
		renderBar("/positions", [makeTask("t-1", { status: "completed" })]);
		expect(await screen.findByRole("link", { name: "Задачи" })).toBeInTheDocument();
		expect(screen.queryByTestId("nav-tasks-count")).not.toBeInTheDocument();
	});
});
