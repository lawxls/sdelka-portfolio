import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test } from "vitest";
import { BottomTabBar } from "./bottom-tab-bar";

function renderBar(initialPath = "/procurement") {
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route path="*" element={<BottomTabBar />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("BottomTabBar items", () => {
	test("renders Закупки, Задачи, and Настройки with aria-labels", () => {
		renderBar();
		expect(screen.getByRole("link", { name: "Закупки" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Задачи" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Настройки" })).toBeInTheDocument();
	});

	test("items link to /procurement, /tasks, and /settings", () => {
		renderBar();
		expect(screen.getByRole("link", { name: "Закупки" })).toHaveAttribute("href", "/procurement");
		expect(screen.getByRole("link", { name: "Задачи" })).toHaveAttribute("href", "/tasks");
		expect(screen.getByRole("link", { name: "Настройки" })).toHaveAttribute("href", "/settings");
	});

	test("nav has aria-label", () => {
		renderBar();
		expect(screen.getByRole("navigation", { name: "Основная навигация" })).toBeInTheDocument();
	});
});

describe("BottomTabBar active state", () => {
	test("marks Закупки active at /procurement", () => {
		renderBar("/procurement");
		expect(screen.getByRole("link", { name: "Закупки" })).toHaveAttribute("aria-current", "page");
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
		render(
			<MemoryRouter initialEntries={["/procurement"]}>
				<BottomTabBar />
				<Routes>
					<Route path="/procurement" element={<div>procurement-page</div>} />
					<Route path="/settings" element={<div>settings-page</div>} />
				</Routes>
			</MemoryRouter>,
		);
		await userEvent.setup().click(screen.getByRole("link", { name: "Настройки" }));
		expect(screen.getByText("settings-page")).toBeInTheDocument();
	});
});
