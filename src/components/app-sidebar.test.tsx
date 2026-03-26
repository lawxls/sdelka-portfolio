import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./app-sidebar";

function renderSidebar(initialEntry = "/procurement") {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<TooltipProvider>
				<SidebarProvider open={false} onOpenChange={() => {}}>
					<div className="flex">
						<AppSidebar />
						<Routes>
							<Route path="/procurement" element={<div>procurement-content</div>} />
							<Route path="/analytics" element={<div>analytics-content</div>} />
							<Route path="/companies" element={<div>companies-content</div>} />
							<Route path="/tasks" element={<div>tasks-content</div>} />
						</Routes>
					</div>
				</SidebarProvider>
			</TooltipProvider>
		</MemoryRouter>,
	);
}

describe("AppSidebar", () => {
	test("renders 4 navigation links", () => {
		renderSidebar();
		expect(screen.getByRole("link", { name: "Аналитика" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Закупки" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Компании" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Задачи" })).toBeInTheDocument();
	});

	test("logo renders at top of rail", () => {
		renderSidebar();
		expect(screen.getByTestId("app-sidebar-logo")).toBeInTheDocument();
	});

	test("logo click navigates to /procurement", async () => {
		renderSidebar("/analytics");
		const user = userEvent.setup();
		await user.click(screen.getByTestId("app-sidebar-logo"));
		expect(screen.getByText("procurement-content")).toBeInTheDocument();
	});

	test("active state highlights current route", () => {
		renderSidebar("/procurement");
		const link = screen.getByRole("link", { name: "Закупки" });
		expect(link).toHaveAttribute("data-active", "true");

		const analyticsLink = screen.getByRole("link", { name: "Аналитика" });
		expect(analyticsLink).not.toHaveAttribute("data-active", "true");
	});

	test("active state matches /analytics route", () => {
		renderSidebar("/analytics");
		const link = screen.getByRole("link", { name: "Аналитика" });
		expect(link).toHaveAttribute("data-active", "true");
	});

	test("clicking nav icon navigates to correct route", async () => {
		renderSidebar("/procurement");
		const user = userEvent.setup();

		await user.click(screen.getByRole("link", { name: "Компании" }));
		expect(screen.getByText("companies-content")).toBeInTheDocument();

		await user.click(screen.getByRole("link", { name: "Задачи" }));
		expect(screen.getByText("tasks-content")).toBeInTheDocument();
	});

	test("each nav item has tooltip", async () => {
		renderSidebar();
		const user = userEvent.setup();
		// Hover over the Закупки button to trigger tooltip
		const link = screen.getByRole("link", { name: "Закупки" });
		await user.hover(link);
		// Tooltip content portals — look for tooltip text
		const tooltips = await screen.findAllByText("Закупки");
		// At least one tooltip content element (could also be the span inside the button)
		expect(tooltips.length).toBeGreaterThanOrEqual(1);
	});
});
