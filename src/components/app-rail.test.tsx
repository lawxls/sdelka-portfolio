import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { _resetWorkspaceStore, _setUserSettings } from "@/data/workspace-mock-data";
import { createTestQueryClient, makeSettings, TooltipWrapper } from "@/test-utils";
import { AppRail } from "./app-rail";

beforeEach(() => {
	_setUserSettings(makeSettings());
});

afterEach(() => {
	_resetWorkspaceStore();
});

function renderRail(initialPath = "/procurement") {
	const queryClient = createTestQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<TooltipWrapper>
				<MemoryRouter initialEntries={[initialPath]}>
					<Routes>
						<Route path="*" element={<AppRail />} />
					</Routes>
				</MemoryRouter>
			</TooltipWrapper>
		</QueryClientProvider>,
	);
}

describe("AppRail items", () => {
	test("renders Закупки, Задачи, and Настройки with aria-labels", () => {
		renderRail();
		expect(screen.getByRole("link", { name: "Закупки" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Задачи" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Настройки" })).toBeInTheDocument();
	});

	test("items link to /procurement, /tasks, and /settings", () => {
		renderRail();
		expect(screen.getByRole("link", { name: "Закупки" })).toHaveAttribute("href", "/procurement");
		expect(screen.getByRole("link", { name: "Задачи" })).toHaveAttribute("href", "/tasks");
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

	test("avatar trigger lives at the bottom of the sidebar, separated from nav items", () => {
		renderRail();
		const bottom = screen.getByTestId("app-rail-bottom");
		expect(bottom).toContainElement(screen.getByRole("button", { name: "Меню пользователя" }));
	});
});

describe("AppRail active state", () => {
	test("marks Закупки active at /procurement", () => {
		renderRail("/procurement");
		expect(screen.getByRole("link", { name: "Закупки" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "Задачи" })).not.toHaveAttribute("aria-current");
	});

	test("marks Задачи active at /tasks", () => {
		renderRail("/tasks");
		expect(screen.getByRole("link", { name: "Задачи" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active at /settings", () => {
		renderRail("/settings");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Настройки active for deep settings routes (/settings/profile)", () => {
		renderRail("/settings/profile");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("aria-current", "page");
	});

	test("marks Закупки active when query params are present", () => {
		renderRail("/procurement?folder=archive");
		expect(screen.getByRole("link", { name: "Закупки" })).toHaveAttribute("aria-current", "page");
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

describe("AppRail navigation", () => {
	test("clicking an item navigates", async () => {
		const queryClient = createTestQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<TooltipWrapper>
					<MemoryRouter initialEntries={["/procurement"]}>
						<AppRail />
						<Routes>
							<Route path="/procurement" element={<div>procurement-page</div>} />
							<Route path="/tasks" element={<div>tasks-page</div>} />
						</Routes>
					</MemoryRouter>
				</TooltipWrapper>
			</QueryClientProvider>,
		);
		await userEvent.setup().click(screen.getByRole("link", { name: "Задачи" }));
		expect(screen.getByText("tasks-page")).toBeInTheDocument();
	});
});
