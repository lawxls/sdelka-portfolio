import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test } from "vitest";
import { MobileBottomNav } from "./mobile-bottom-nav";

function renderNav(initialEntry = "/procurement") {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route path="/procurement" element={<div>procurement</div>} />
				<Route path="/analytics" element={<div>analytics</div>} />
				<Route path="/companies" element={<div>companies</div>} />
				<Route path="/tasks" element={<div>tasks</div>} />
			</Routes>
			<MobileBottomNav />
		</MemoryRouter>,
	);
}

describe("MobileBottomNav", () => {
	test("renders 4 tab links", () => {
		renderNav();
		expect(screen.getByRole("link", { name: "Аналитика" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Закупки" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Компании" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Задачи" })).toBeInTheDocument();
	});

	test("active tab has primary styling", () => {
		renderNav("/procurement");
		const link = screen.getByRole("link", { name: "Закупки" });
		expect(link.className).toContain("text-primary");
	});

	test("inactive tab has muted styling", () => {
		renderNav("/procurement");
		const link = screen.getByRole("link", { name: "Аналитика" });
		expect(link.className).toContain("text-muted-foreground");
	});

	test("tapping tab navigates to route", async () => {
		renderNav("/procurement");
		const user = userEvent.setup();
		await user.click(screen.getByRole("link", { name: "Компании" }));
		expect(screen.getByText("companies")).toBeInTheDocument();
	});

	test("active state follows navigation", async () => {
		renderNav("/procurement");
		const user = userEvent.setup();
		await user.click(screen.getByRole("link", { name: "Задачи" }));
		expect(screen.getByRole("link", { name: "Задачи" }).className).toContain("text-primary");
		expect(screen.getByRole("link", { name: "Закупки" }).className).toContain("text-muted-foreground");
	});
});
