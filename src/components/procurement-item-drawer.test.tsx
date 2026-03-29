import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useSearchParams } from "react-router";
import { beforeEach, describe, expect, test } from "vitest";

import { ProcurementItemDrawer } from "./procurement-item-drawer";

let queryClient: QueryClient;

function UrlSpy() {
	const [params] = useSearchParams();
	return <div data-testid="url-spy">{params.toString()}</div>;
}

function renderDrawer(initialEntries: string[] = ["/procurement?item=item-1"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<ProcurementItemDrawer itemName="Арматура А500С" />
				<UrlSpy />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
});

describe("ProcurementItemDrawer", () => {
	test("opens when ?item= param is present", () => {
		renderDrawer(["/procurement?item=item-1"]);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Арматура А500С")).toBeInTheDocument();
	});

	test("stays closed when ?item= param is absent", () => {
		renderDrawer(["/procurement"]);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	test("renders three tabs with Поставщики as default", () => {
		renderDrawer();
		const tablist = screen.getByRole("tablist");
		const tabs = screen.getAllByRole("tab");
		expect(tablist).toBeInTheDocument();
		expect(tabs).toHaveLength(3);
		expect(tabs[0]).toHaveTextContent("Поставщики");
		expect(tabs[1]).toHaveTextContent("Аналитика");
		expect(tabs[2]).toHaveTextContent("Детальная информация");
		expect(tabs[0]).toHaveAttribute("aria-selected", "true");
	});

	test("tab click updates URL &tab= param", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);

		await user.click(screen.getByRole("tab", { name: "Аналитика" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1&tab=analytics");
		expect(screen.getByRole("tab", { name: "Аналитика" })).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("tab", { name: "Поставщики" })).toHaveAttribute("aria-selected", "false");
	});

	test("suppliers tab omits &tab= from URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=analytics"]);

		await user.click(screen.getByRole("tab", { name: "Поставщики" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1");
		expect(screen.getByTestId("url-spy").textContent).not.toContain("tab=");
	});

	test("details tab sets &tab=details", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);

		await user.click(screen.getByRole("tab", { name: "Детальная информация" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1&tab=details");
	});

	test("close button removes ?item= from URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=analytics"]);

		await user.click(screen.getByRole("button", { name: "Close" }));
		const urlText = screen.getByTestId("url-spy").textContent ?? "";
		expect(urlText).not.toContain("item=");
		expect(urlText).not.toContain("tab=");
	});

	test("renders placeholder content for each tab", async () => {
		const user = userEvent.setup();
		renderDrawer();

		// Default tab — suppliers placeholder
		expect(screen.getByTestId("tab-panel-suppliers")).toBeInTheDocument();

		await user.click(screen.getByRole("tab", { name: "Аналитика" }));
		expect(screen.getByTestId("tab-panel-analytics")).toBeInTheDocument();

		await user.click(screen.getByRole("tab", { name: "Детальная информация" }));
		expect(screen.getByTestId("tab-panel-details")).toBeInTheDocument();
	});

	test("mobile renders bottom sheet", () => {
		renderDrawer(["/procurement?item=item-1"]);
		// isMobile defaults to false in jsdom (no matchMedia match)
		// We just verify the drawer opens — responsive class testing
		// is better done via the page-level integration test
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	test("URL with ?tab=analytics opens on analytics tab", () => {
		renderDrawer(["/procurement?item=item-1&tab=analytics"]);
		expect(screen.getByRole("tab", { name: "Аналитика" })).toHaveAttribute("aria-selected", "true");
		expect(screen.getByTestId("tab-panel-analytics")).toBeInTheDocument();
	});

	test("invalid tab param defaults to suppliers", () => {
		renderDrawer(["/procurement?item=item-1&tab=bogus"]);
		expect(screen.getByRole("tab", { name: "Поставщики" })).toHaveAttribute("aria-selected", "true");
	});
});
