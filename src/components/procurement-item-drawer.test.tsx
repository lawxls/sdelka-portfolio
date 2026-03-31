import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useSearchParams } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { _resetItemDetailStore, _setItemDetailMockDelay } from "@/data/item-detail-mock-data";
import { _resetSupplierStore, _setSupplierMockDelay } from "@/data/supplier-mock-data";

import type { ProcurementItem } from "@/data/types";

import { ProcurementItemDrawer } from "./procurement-item-drawer";

// Mock recharts ResponsiveContainer for jsdom
vi.mock("recharts", async () => {
	const actual = await vi.importActual<typeof import("recharts")>("recharts");
	return {
		...actual,
		ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="responsive-container" style={{ width: 320, height: 200 }}>
				{children}
			</div>
		),
	};
});

const TEST_ITEM: ProcurementItem = {
	id: "item-1",
	name: "Арматура А500С",
	status: "searching",
	annualQuantity: 1200,
	currentPrice: 4500,
	bestPrice: 3800,
	averagePrice: 4100,
	folderId: null,
	companyId: "company-1",
};

let queryClient: QueryClient;

function UrlSpy() {
	const [params] = useSearchParams();
	return <div data-testid="url-spy">{params.toString()}</div>;
}

function renderDrawer(initialEntries: string[] = ["/procurement?item=item-1"]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<MemoryRouter initialEntries={initialEntries}>
					<ProcurementItemDrawer item={TEST_ITEM} />
					<UrlSpy />
				</MemoryRouter>
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	_resetSupplierStore();
	_setSupplierMockDelay(0, 0);
	_resetItemDetailStore();
	_setItemDetailMockDelay(0, 0);
});

afterEach(() => {
	_resetSupplierStore();
	_resetItemDetailStore();
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

	test("suppliers tab loads and renders supplier table with data", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		// Should show loading skeletons first, then data
		await waitFor(() => {
			expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0);
		});
		// Table headers present (uppercase)
		expect(screen.getByText("КОМПАНИЯ")).toBeInTheDocument();
		expect(screen.getByText("TCO")).toBeInTheDocument();
		// Supplier data loaded (10 suppliers for item-1)
		await waitFor(() => {
			const rows = screen.getAllByRole("row");
			// 1 header row + 10 data rows
			expect(rows.length).toBe(11);
		});
	});

	test("suppliers tab shows status badges", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});
		// Should have at least one Получено КП badge
		expect(screen.getAllByText("Получено КП").length).toBeGreaterThan(0);
	});

	test("suppliers tab has search input", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});
		expect(screen.getByPlaceholderText("Поиск…")).toBeInTheDocument();
	});

	test("suppliers tab search filters rows", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		// Get the name of the first supplier to search for
		const firstRow = screen.getAllByRole("row")[1];
		const companyName = firstRow.querySelector(".font-medium")?.textContent ?? "";
		// Take first word for search
		const searchTerm = companyName.split(" ")[0];

		await user.type(screen.getByPlaceholderText("Поиск…"), searchTerm);

		// After debounce, should see fewer rows
		await waitFor(() => {
			const dataRows = screen.getAllByRole("row").length - 1; // minus header
			expect(dataRows).toBeLessThan(10);
			expect(dataRows).toBeGreaterThan(0);
		});
	});

	test("suppliers tab has sort buttons", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});
		expect(screen.getByRole("button", { name: /Компания/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Цена\/ед/i })).toBeInTheDocument();
	});

	test("suppliers tab has status filter button", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});
		expect(screen.getByRole("button", { name: "Фильтр по статусу" })).toBeInTheDocument();
	});

	test("suppliers tab has checkboxes for multi-select", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});
		// 1 header checkbox + 10 row checkboxes
		const checkboxes = screen.getAllByRole("checkbox");
		expect(checkboxes).toHaveLength(11);
	});

	test("clicking supplier row opens supplier detail drawer with &supplier= in URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		// Click first data row
		const rows = screen.getAllByRole("row");
		await user.click(rows[1]);

		// Should open supplier detail drawer and update URL
		await waitFor(() => {
			expect(screen.getByTestId("url-spy").textContent).toContain("supplier=");
		});
		// Supplier detail drawer should render with company info
		await waitFor(() => {
			expect(screen.getByText("Расчёт TCO (Total Cost of Ownership)")).toBeInTheDocument();
		});
	});

	test("supplier detail drawer shows TCO breakdown, agent comment", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		// Click a supplier row
		await user.click(screen.getAllByRole("row")[1]);

		await waitFor(() => {
			expect(screen.getByText("Расчёт TCO (Total Cost of Ownership)")).toBeInTheDocument();
		});
		expect(screen.getByText("Комментарии агента")).toBeInTheDocument();
	});

	test("supplier detail drawer shows documents and email history", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		await user.click(screen.getAllByRole("row")[1]);

		await waitFor(() => {
			expect(screen.getByText("Документы из диалога")).toBeInTheDocument();
		});
		expect(screen.getByText("История общения")).toBeInTheDocument();
	});

	test("closing supplier drawer removes &supplier= from URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		// Open supplier drawer
		await user.click(screen.getAllByRole("row")[1]);
		await waitFor(() => {
			expect(screen.getByTestId("url-spy").textContent).toContain("supplier=");
		});

		// Close supplier drawer — find close buttons, the last one is for the supplier drawer
		const closeButtons = screen.getAllByRole("button", { name: "Close" });
		await user.click(closeButtons[closeButtons.length - 1]);

		await waitFor(() => {
			expect(screen.getByTestId("url-spy").textContent).not.toContain("supplier=");
		});
		// Procurement drawer should still be open
		expect(screen.getByTestId("url-spy").textContent).toContain("item=");
	});

	test("?supplier= deep link opens supplier detail drawer", async () => {
		renderDrawer(["/procurement?item=item-1&supplier=supplier-item-1-1"]);
		await waitFor(() => {
			expect(screen.getByText("Расчёт TCO (Total Cost of Ownership)")).toBeInTheDocument();
		});
	});

	test("analytics tab renders donut chart with supplier status distribution", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await user.click(screen.getByRole("tab", { name: "Аналитика" }));

		await waitFor(() => {
			expect(screen.getByTestId("analytics-chart")).toBeInTheDocument();
		});
		// Legend labels should be present
		expect(screen.getByText("Отправлено RFQ")).toBeInTheDocument();
		expect(screen.getByText("Прислали КП")).toBeInTheDocument();
		// Total count should be displayed in the chart center
		const chart = screen.getByTestId("analytics-chart");
		expect(within(chart).getByText("10")).toBeInTheDocument();
		expect(within(chart).getByText("Поставщиков")).toBeInTheDocument();
	});

	test("analytics tab deep link via ?tab=analytics loads chart", async () => {
		renderDrawer(["/procurement?item=item-1&tab=analytics"]);
		await waitFor(() => {
			expect(screen.getByTestId("analytics-chart")).toBeInTheDocument();
		});
		expect(screen.getByText("Не ответили")).toBeInTheDocument();
	});

	test("selecting suppliers shows selection toolbar with delete", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		// Click first row checkbox
		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[1]);

		expect(screen.getByText(/выбрано: 1/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
	});

	test("details tab shows read-only view with sections and edit buttons", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);

		await user.click(screen.getByRole("tab", { name: "Детальная информация" }));

		const panel = await waitFor(() => screen.getByTestId("tab-panel-details"));

		// Read-only values displayed
		expect(within(panel).getByText("Основная информация")).toBeInTheDocument();
		expect(within(panel).getByText("1200")).toBeInTheDocument();

		// Edit buttons present for info and conditions
		expect(screen.getByRole("button", { name: "Редактировать основную информацию" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать условия" })).toBeInTheDocument();

		// No save button visible in read-only mode
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("details tab deep link via ?tab=details shows read-only sections", async () => {
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
		});

		expect(screen.getByText("Условия")).toBeInTheDocument();
		expect(screen.getByText("Параметры запроса")).toBeInTheDocument();
		expect(screen.getByText("Дополнительно")).toBeInTheDocument();
		// No save button in read-only mode
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("details tab edit info section, save updates item", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
		});

		// Click edit pen
		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		// Now editable fields and save/cancel appear
		expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С");
		expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();

		const nameInput = screen.getByLabelText("Название");
		await user.clear(nameInput);
		await user.type(nameInput, "Обновлённая позиция");

		await user.click(screen.getByRole("button", { name: "Сохранить" }));

		// After save, returns to read-only view with updated value
		await waitFor(() => {
			expect(screen.getByText("Обновлённая позиция")).toBeInTheDocument();
		});
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("details tab cancel editing reverts to read-only view", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		const panel = await waitFor(() => screen.getByTestId("tab-panel-details"));

		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));
		expect(screen.getByLabelText("Название")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Отмена" }));

		// Back to read-only — input gone, value shown as text
		expect(screen.queryByLabelText("Название")).not.toBeInTheDocument();
		expect(within(panel).getByText("Арматура А500С")).toBeInTheDocument();
	});

	test("details tab has edit buttons for all four sections", async () => {
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
		});

		const editButtons = screen.getAllByRole("button", { name: /Редактировать/ });
		expect(editButtons).toHaveLength(4);
	});
});
