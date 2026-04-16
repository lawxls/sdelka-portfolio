import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test } from "vitest";
import { TooltipWrapper } from "@/test-utils";
import { AppRail } from "./app-rail";

function renderRail(initialPath = "/procurement") {
	return render(
		<TooltipWrapper>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="*" element={<AppRail />} />
				</Routes>
			</MemoryRouter>
		</TooltipWrapper>,
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
		render(
			<TooltipWrapper>
				<MemoryRouter initialEntries={["/procurement"]}>
					<AppRail />
					<Routes>
						<Route path="/procurement" element={<div>procurement-page</div>} />
						<Route path="/tasks" element={<div>tasks-page</div>} />
					</Routes>
				</MemoryRouter>
			</TooltipWrapper>,
		);
		await userEvent.setup().click(screen.getByRole("link", { name: "Задачи" }));
		expect(screen.getByText("tasks-page")).toBeInTheDocument();
	});
});
