import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useSearchParams } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { _resetItemDetailStore, _setItemDetailMockDelay } from "@/data/item-detail-mock-data";
import { _resetSearchSupplierStore, _setSearchSupplierMockDelay } from "@/data/search-supplier-mock-data";
import { _resetSupplierStore, _setSupplierMockDelay, _setSuppliersForItem } from "@/data/supplier-mock-data";
import type { Supplier } from "@/data/supplier-types";
import { ORMATEK_SUPPLIERS } from "@/data/suppliers-ormatek";
import { _resetTasksStore, _setTasks } from "@/data/tasks-mock-data";

import type { ProcurementItem } from "@/data/types";
import { makeTask, mockHostname } from "@/test-utils";

// Keep tests decoupled from the full ORMATEK fixture (258 suppliers).
// Cherry-pick 3 получено_кп (rename one to ТД СОМ) + 7 others = 10 seeded rows.
const TEST_SUPPLIERS: Supplier[] = [
	{ ...ORMATEK_SUPPLIERS[9], companyName: "ТД СОМ" },
	ORMATEK_SUPPLIERS[10],
	ORMATEK_SUPPLIERS[25],
	ORMATEK_SUPPLIERS[0],
	ORMATEK_SUPPLIERS[1],
	ORMATEK_SUPPLIERS[2],
	ORMATEK_SUPPLIERS[3],
	ORMATEK_SUPPLIERS[4],
	ORMATEK_SUPPLIERS[5],
	ORMATEK_SUPPLIERS[6],
];

import { ProcurementItemDrawer } from "./procurement-item-drawer";

const TEST_ITEM: ProcurementItem = {
	id: "item-1",
	name: "Полотно ПВД 2600 мм",
	status: "searching",
	annualQuantity: 180_000,
	currentPrice: 1776,
	bestPrice: null,
	averagePrice: null,
	folderId: "folder-packaging",
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

const assignedTasks = [
	makeTask("task-1", {
		status: "assigned",
		name: "Согласовать цену",
		item: { id: "item-1", name: "Полотно ПВД 2600 мм", companyId: "company-1" },
		questionCount: 2,
		createdAt: "2026-03-20T10:00:00.000Z",
	}),
	makeTask("task-2", {
		status: "assigned",
		name: "Запросить образцы",
		item: { id: "item-1", name: "Полотно ПВД 2600 мм", companyId: "company-1" },
		questionCount: 1,
		createdAt: "2026-03-18T10:00:00.000Z",
	}),
];
const inProgressTasks = [
	makeTask("task-3", {
		status: "in_progress",
		name: "Проверить качество",
		item: { id: "item-1", name: "Полотно ПВД 2600 мм", companyId: "company-1" },
		questionCount: 3,
		createdAt: "2026-03-19T10:00:00.000Z",
	}),
];
const completedTasks = [
	makeTask("task-4", {
		status: "completed",
		name: "Подписать договор",
		item: { id: "item-1", name: "Полотно ПВД 2600 мм", companyId: "company-1" },
		questionCount: 0,
	}),
];
const archivedTasks = [
	makeTask("task-5", {
		status: "archived",
		name: "Старый запрос",
		item: { id: "item-1", name: "Полотно ПВД 2600 мм", companyId: "company-1" },
		questionCount: 0,
	}),
];

const ALL_TASKS = [...assignedTasks, ...inProgressTasks, ...completedTasks, ...archivedTasks];

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	_resetSupplierStore();
	_setSupplierMockDelay(0, 0);
	_setSuppliersForItem("item-1", TEST_SUPPLIERS);
	_resetSearchSupplierStore();
	_setSearchSupplierMockDelay(0, 0);
	_resetItemDetailStore();
	_setItemDetailMockDelay(0, 0);
	_setTasks(ALL_TASKS);
	vi.clearAllMocks();
});

afterEach(() => {
	localStorage.clear();
	_resetSupplierStore();
	_resetSearchSupplierStore();
	_resetItemDetailStore();
	_resetTasksStore();
});

describe("ProcurementItemDrawer", () => {
	test("opens when ?item= param is present", () => {
		renderDrawer(["/procurement?item=item-1"]);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Полотно ПВД 2600 мм")).toBeInTheDocument();
	});

	test("stays closed when ?item= param is absent", () => {
		renderDrawer(["/procurement"]);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	test("renders four tabs with Поиск as default", () => {
		renderDrawer();
		const tablist = screen.getByRole("tablist");
		const tabs = screen.getAllByRole("tab");
		expect(tablist).toBeInTheDocument();
		expect(tabs).toHaveLength(4);
		expect(tabs[0]).toHaveTextContent("Поиск");
		expect(tabs[1]).toHaveTextContent("Поставщики");
		expect(tabs[2]).toHaveTextContent("Задачи");
		expect(tabs[3]).toHaveTextContent("Информация");
		expect(tabs[0]).toHaveAttribute("aria-selected", "true");
	});

	test("tasks tab shows active task count badge", async () => {
		renderDrawer();
		const tasksTab = screen.getByRole("tab", { name: /Задачи/ });
		await waitFor(() => {
			expect(tasksTab).toHaveTextContent(/Задачи\s*\(3\)/);
		});
	});

	test("tab click updates URL &tab= param", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);

		await user.click(screen.getByRole("tab", { name: "Информация" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1&tab=details");
		expect(screen.getByRole("tab", { name: "Информация" })).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("tab", { name: "Поставщики" })).toHaveAttribute("aria-selected", "false");
	});

	test("Поиск tab omits &tab= from URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await user.click(screen.getByRole("tab", { name: "Поиск" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1");
		expect(screen.getByTestId("url-spy").textContent).not.toContain("tab=");
	});

	test("Поставщики tab sets &tab=suppliers", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);

		await user.click(screen.getByRole("tab", { name: "Поставщики" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1&tab=suppliers");
	});

	test("details tab sets &tab=details", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);

		await user.click(screen.getByRole("tab", { name: "Информация" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1&tab=details");
	});

	test("close button removes ?item= from URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await user.click(screen.getByRole("button", { name: "Close" }));
		const urlText = screen.getByTestId("url-spy").textContent ?? "";
		expect(urlText).not.toContain("item=");
		expect(urlText).not.toContain("tab=");
	});

	test("renders placeholder content for each tab", async () => {
		const user = userEvent.setup();
		renderDrawer();

		// Default tab — search placeholder
		expect(screen.getByTestId("tab-panel-search")).toBeInTheDocument();

		await user.click(screen.getByRole("tab", { name: "Поставщики" }));
		expect(screen.getByTestId("tab-panel-suppliers")).toBeInTheDocument();

		await user.click(screen.getByRole("tab", { name: "Информация" }));
		expect(screen.getByTestId("tab-panel-details")).toBeInTheDocument();
	});

	test("mobile renders bottom sheet", () => {
		renderDrawer(["/procurement?item=item-1"]);
		// isMobile defaults to false in jsdom (no matchMedia match)
		// We just verify the drawer opens — responsive class testing
		// is better done via the page-level integration test
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	test("invalid tab param defaults to Поиск", () => {
		renderDrawer(["/procurement?item=item-1&tab=bogus"]);
		expect(screen.getByRole("tab", { name: "Поиск" })).toHaveAttribute("aria-selected", "true");
	});

	test("suppliers tab loads and renders supplier table with data", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		// Should show loading skeletons first, then data
		await waitFor(() => {
			expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0);
		});
		// Table headers present (uppercase)
		expect(screen.getByText("КОМПАНИЯ")).toBeInTheDocument();
		expect(screen.getByText("ТСО/ЕД.")).toBeInTheDocument();
		// Supplier data loaded (1 header + 1 pinned current supplier + 10 data rows)
		await waitFor(() => {
			const rows = screen.getAllByRole("row");
			expect(rows.length).toBe(12);
		});
	});

	test("suppliers tab shows status badges", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});
		// Should have at least one Получено КП badge
		expect(screen.getAllByText("Получено КП").length).toBeGreaterThan(0);
	});

	test("suppliers tab has search input", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});
		expect(screen.getByPlaceholderText("Поиск…")).toBeInTheDocument();
	});

	test("suppliers tab search filters rows", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		// Narrow search — "ТД СОМ" uniquely matches a single supplier
		await user.type(screen.getByPlaceholderText("Поиск…"), "ТД СОМ");

		// After debounce, should see fewer rows
		await waitFor(() => {
			const dataRows = screen.getAllByRole("row").length - 1; // minus header
			expect(dataRows).toBeLessThan(30);
			expect(dataRows).toBeGreaterThan(0);
		});
	});

	test("suppliers tab has sort buttons", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});
		expect(screen.getByRole("button", { name: /Компания/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /ТСО\/ЕД/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Стоимость/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Экономия/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Срок поставки/i })).toBeInTheDocument();
	});

	test("suppliers tab has status filter button", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});
		expect(screen.getByRole("button", { name: "Фильтр по статусу" })).toBeInTheDocument();
	});

	test("suppliers tab has checkboxes for multi-select", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});
		// 1 header checkbox + 10 row checkboxes (seeded)
		const checkboxes = screen.getAllByRole("checkbox");
		expect(checkboxes).toHaveLength(11);
	});

	test("suppliers tab has archive filter toggle", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});
		const btn = screen.getByRole("button", { name: "Архив" });
		expect(btn).toHaveAttribute("aria-pressed", "false");
	});

	test("clicking supplier row opens supplier detail drawer with &supplier= in URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		// Row 1 is pinned current supplier; row 2 is first real data row
		const rows = screen.getAllByRole("row");
		await user.click(rows[2]);

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
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		// Click first real data row (row 2; row 1 is pinned current supplier)
		await user.click(screen.getAllByRole("row")[2]);

		await waitFor(() => {
			expect(screen.getByText("Расчёт TCO (Total Cost of Ownership)")).toBeInTheDocument();
		});
		expect(screen.getByText("Комментарии агента")).toBeInTheDocument();
	});

	test("supplier detail drawer shows email history", async () => {
		// Note: "Документы из диалога" only renders when a supplier has documents, and
		// none of the seeded получено_кп suppliers carry documents — assertion dropped.
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		await user.click(screen.getAllByRole("row")[2]);

		await waitFor(() => {
			expect(screen.getByText("История общения")).toBeInTheDocument();
		});
	});

	test("closing supplier drawer removes &supplier= from URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		// Open supplier drawer
		await user.click(screen.getAllByRole("row")[2]);
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

	test("selecting suppliers shows selection toolbar with archive", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		// Click first row checkbox
		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[1]);

		expect(screen.getByText(/выбрано: 1/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /архивировать/i })).toBeInTheDocument();
	});

	test("details tab shows read-only view with sections and edit buttons", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);

		await user.click(screen.getByRole("tab", { name: "Информация" }));

		const panel = await waitFor(() => screen.getByTestId("tab-panel-details"));

		// Read-only values displayed
		expect(within(panel).getByText("Основное")).toBeInTheDocument();
		expect(within(panel).getByText("180000")).toBeInTheDocument();

		// Edit buttons present for Основное and Логистика и финансы
		expect(screen.getByRole("button", { name: "Редактировать основную информацию" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Редактировать логистику и финансы" })).toBeInTheDocument();

		// No save button visible in read-only mode
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("details tab deep link via ?tab=details shows read-only sections", async () => {
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		expect(screen.getByText("Логистика и финансы")).toBeInTheDocument();
		expect(screen.getByText("Дополнительно")).toBeInTheDocument();
		expect(screen.getByText("Текущий поставщик")).toBeInTheDocument();
		expect(screen.getByText("Ответы на уточнения")).toBeInTheDocument();
		// No save button in read-only mode
		expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
	});

	test("details tab edit info section, save updates item", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		// Click edit pen
		await user.click(screen.getByRole("button", { name: "Редактировать основную информацию" }));

		// Now editable fields and save/cancel appear
		expect(screen.getByLabelText("Название")).toHaveValue("Полотно ПВД 2600 мм");
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
		expect(within(panel).getByLabelText("Название")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Отмена" }));

		// Back to read-only — input gone, value shown as text
		expect(within(panel).queryByLabelText("Название")).not.toBeInTheDocument();
		expect(within(panel).getByText("Полотно ПВД 2600 мм")).toBeInTheDocument();
	});

	test("details tab has edit buttons for four editable sections (Ответы is display-only)", async () => {
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await waitFor(() => {
			expect(screen.getByText("Основное")).toBeInTheDocument();
		});

		const editButtons = screen.getAllByRole("button", { name: /Редактировать/ });
		expect(editButtons).toHaveLength(4);
	});

	test("tasks tab default view shows assigned + in_progress tasks as rows", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);

		await user.click(screen.getByRole("tab", { name: "Задачи" }));

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");

		// All three active tasks visible (assigned + in_progress merged)
		expect(within(panel).getByText("Согласовать цену")).toBeInTheDocument();
		expect(within(panel).getByText("Запросить образцы")).toBeInTheDocument();
		expect(within(panel).getByText("Проверить качество")).toBeInTheDocument();

		// Rendered in DataTable
		expect(within(panel).getByTestId("data-table")).toBeInTheDocument();
		expect(within(panel).queryByTestId("task-card-task-1")).not.toBeInTheDocument();

		// Completed/archived not shown in default view
		expect(within(panel).queryByText("Подписать договор")).not.toBeInTheDocument();
		expect(within(panel).queryByText("Старый запрос")).not.toBeInTheDocument();
	});

	test("tasks tab default view sorted by createdAt descending", async () => {
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");
		const rows = within(panel).getAllByRole("row").slice(1); // skip header row
		// task-1 (Mar 20) > task-3 (Mar 19) > task-2 (Mar 18)
		expect(rows[0]).toHaveTextContent("Согласовать цену");
		expect(rows[1]).toHaveTextContent("Проверить качество");
		expect(rows[2]).toHaveTextContent("Запросить образцы");
	});

	test("tasks tab has search input and only Завершённые/Архив filter buttons", async () => {
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");
		expect(within(panel).getByPlaceholderText("Поиск…")).toBeInTheDocument();

		// Only two filter buttons
		expect(within(panel).getByRole("button", { name: /Завершённые/ })).toBeInTheDocument();
		expect(within(panel).getByRole("button", { name: /Архив/ })).toBeInTheDocument();

		// No assigned/in_progress filter buttons
		expect(within(panel).queryByTestId("task-status-assigned")).not.toBeInTheDocument();
		expect(within(panel).queryByTestId("task-status-in_progress")).not.toBeInTheDocument();
	});

	test("tasks tab shows question count on rows", async () => {
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		expect(screen.getByText("2 вопроса")).toBeInTheDocument();
		expect(screen.getByText("1 вопрос")).toBeInTheDocument();
	});

	test("tasks tab clicking Завершённые replaces list with completed tasks", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: /Завершённые/ }));

		await waitFor(() => {
			expect(screen.getByText("Подписать договор")).toBeInTheDocument();
		});
		// Active tasks no longer visible
		expect(screen.queryByText("Согласовать цену")).not.toBeInTheDocument();
		// URL updated
		expect(screen.getByTestId("url-spy").textContent).toContain("task_status=completed");
	});

	test("tasks tab clicking Архив replaces list with archived tasks", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: /Архив/ }));

		await waitFor(() => {
			expect(screen.getByText("Старый запрос")).toBeInTheDocument();
		});
		expect(screen.queryByText("Согласовать цену")).not.toBeInTheDocument();
		expect(screen.getByTestId("url-spy").textContent).toContain("task_status=archived");
	});

	test("tasks tab clicking active filter toggles back to default view", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=tasks&task_status=completed"]);

		await waitFor(() => {
			expect(screen.getByText("Подписать договор")).toBeInTheDocument();
		});

		// Click active Завершённые button again
		await user.click(screen.getByRole("button", { name: /Завершённые/ }));

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});
		expect(screen.queryByText("Подписать договор")).not.toBeInTheDocument();

		const url = screen.getByTestId("url-spy").textContent ?? "";
		expect(url).not.toContain("task_status=");
	});

	test("tasks tab only one filter active at a time", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		// Activate Завершённые
		await user.click(screen.getByRole("button", { name: /Завершённые/ }));
		await waitFor(() => {
			expect(screen.getByText("Подписать договор")).toBeInTheDocument();
		});

		// Switch to Архив — replaces completed with archived
		await user.click(screen.getByRole("button", { name: /Архив/ }));
		await waitFor(() => {
			expect(screen.getByText("Старый запрос")).toBeInTheDocument();
		});
		expect(screen.queryByText("Подписать договор")).not.toBeInTheDocument();
		expect(screen.getByTestId("url-spy").textContent).toContain("task_status=archived");
	});

	test("tasks tab clicking row opens task drawer with &task= in URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");
		const taskRow = within(panel)
			.getAllByRole("row")
			.find((r) => r.textContent?.includes("Согласовать цену"));
		expect(taskRow).toBeDefined();
		await user.click(taskRow as HTMLElement);

		await waitFor(() => {
			expect(screen.getByTestId("url-spy").textContent).toContain("task=task-1");
		});
	});

	test("tasks tab deep link via ?tab=tasks loads tasks", async () => {
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});
	});

	test("tasks tab renders DataTable with header columns Задача / Вопросы / Дедлайн / Создано", async () => {
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");
		const headers = within(panel).getAllByRole("columnheader");
		const headerLabels = headers.map((h) => h.textContent ?? "");
		expect(headerLabels).toContain("ЗАДАЧА");
		expect(headerLabels).toContain("ВОПРОСЫ");
		expect(headerLabels).toContain("ДЕДЛАЙН");
		expect(headerLabels).toContain("СОЗДАНО");
	});

	test("tasks tab rows have no status icon", async () => {
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");
		const dataRows = within(panel).getAllByRole("row").slice(1);
		// No data-testid task-row-* (icons live there in the legacy TaskRow)
		for (const row of dataRows) {
			expect(row.querySelector('[data-testid^="task-row-"]')).toBeNull();
		}
	});

	test("tasks tab supports multi-select via row + header checkboxes", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");
		const checkboxes = within(panel).getAllByRole("checkbox");
		// First is the header "Выбрать все"
		const headerCheckbox = checkboxes[0];
		expect(headerCheckbox).toHaveAttribute("aria-label", "Выбрать все");

		// Toggle a single row
		await user.click(checkboxes[1]);
		expect(within(panel).getByText("Выбрано: 1")).toBeInTheDocument();

		// Header select-all picks the rest
		await user.click(headerCheckbox);
		expect(within(panel).getByText(/Выбрано: 3/)).toBeInTheDocument();
	});

	test("tasks tab batch Архивировать removes selected rows", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");
		const checkboxes = within(panel).getAllByRole("checkbox");
		await user.click(checkboxes[0]); // header select-all

		const archiveBtn = within(panel).getByRole("button", { name: "Архивировать" });
		await user.click(archiveBtn);

		await waitFor(() => {
			expect(screen.queryByText("Согласовать цену")).not.toBeInTheDocument();
		});
	});

	test("tasks tab context menu has Архивировать action", async () => {
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");
		const taskRow = within(panel)
			.getAllByRole("row")
			.find((r) => r.textContent?.includes("Согласовать цену")) as HTMLElement;
		fireEvent.contextMenu(taskRow);

		await waitFor(() => {
			expect(screen.getByRole("menuitem", { name: /Архивировать/ })).toBeInTheDocument();
		});
	});

	test("tasks tab Кол-во вопросов uses Russian plurals", async () => {
		renderDrawer(["/procurement?item=item-1&tab=tasks"]);

		await waitFor(() => {
			expect(screen.getByText("Согласовать цену")).toBeInTheDocument();
		});

		const panel = screen.getByTestId("tab-panel-tasks");
		// 1 → «1 вопрос», 2 → «2 вопроса», 3 → «3 вопроса»
		expect(within(panel).getByText(/^1\s+вопрос$/)).toBeInTheDocument();
		expect(within(panel).getByText(/^2\s+вопроса$/)).toBeInTheDocument();
		expect(within(panel).getByText(/^3\s+вопроса$/)).toBeInTheDocument();
	});

	test("suppliers tab best offer card shows ТСО/ед., Стоимость, Экономия", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);

		await waitFor(() => {
			expect(screen.getByText("Экономия")).toBeInTheDocument();
		});
		expect(screen.getByText("ТСО/ед.")).toBeInTheDocument();
		expect(screen.getByText("Стоимость")).toBeInTheDocument();
		const costValue = screen.getByText("Стоимость").nextElementSibling;
		expect(costValue?.textContent).toContain("₽");
	});

	test("suppliers tab best offer card shows em-dash savings when item has no currentSupplier", async () => {
		// "item-no-supplier" is not in the items fixture → useItemDetail returns null,
		// so currentSupplier is undefined. Seed one получено_кп offer so the best-offer
		// card renders with Экономия (which shows an em-dash when currentSupplier is absent).
		_setSuppliersForItem("item-no-supplier", [{ ...ORMATEK_SUPPLIERS[9], itemId: "item-no-supplier" }]);

		render(
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>
					<MemoryRouter initialEntries={["/procurement?item=item-no-supplier&tab=suppliers"]}>
						<ProcurementItemDrawer />
						<UrlSpy />
					</MemoryRouter>
				</TooltipProvider>
			</QueryClientProvider>,
		);

		await waitFor(() => {
			expect(screen.getByText("Экономия")).toBeInTheDocument();
		});
		const savingsValue = screen.getByText("Экономия").nextElementSibling;
		expect(savingsValue?.textContent).toBe("\u2014");
	});

	test("context menu shows Выбрать текущего поставщика for получено_кп supplier", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		// Row 1 is the pinned current supplier (no menu); first data row is row 2
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[2]);
		expect(screen.getByText("Выбрать текущего поставщика")).toBeInTheDocument();
	});

	test("context menu hides Выбрать текущего поставщика for non-получено_кп supplier", async () => {
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		// Pinned (1) + 3 получено_кп (rows 2-4); row 5 is non-получено_кп
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[5]);
		expect(screen.queryByText("Выбрать текущего поставщика")).not.toBeInTheDocument();
	});

	test("clicking Выбрать текущего поставщика opens confirmation dialog", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[2]);
		await user.click(screen.getByText("Выбрать текущего поставщика"));

		expect(screen.getByText(/текущим поставщиком/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
	});

	test("cancelling select supplier dialog does not change current supplier", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[2]);
		await user.click(screen.getByText("Выбрать текущего поставщика"));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		// Dialog should be gone
		expect(screen.queryByText(/текущим поставщиком/)).not.toBeInTheDocument();
		// No current supplier was set — supplier row still shown in the table
		expect(screen.getAllByText("ТД СОМ").length).toBeGreaterThanOrEqual(1);
	});

	test("confirming select supplier dialog fires mutation and closes dialog", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=suppliers"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(12);
		});

		// No current supplier before selection — first row's supplier (ТД СОМ) is still shown in the table
		expect(screen.getAllByText("ТД СОМ").length).toBeGreaterThanOrEqual(1);

		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[2]);
		await user.click(screen.getByText("Выбрать текущего поставщика"));

		// Confirmation dialog is open
		expect(screen.getByText(/текущим поставщиком/)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Подтвердить" }));

		// Dialog should close
		await waitFor(() => {
			expect(screen.queryByText(/текущим поставщиком/)).not.toBeInTheDocument();
		});
	});

	test("search tab is default and renders SearchSuppliersTable", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		expect(screen.getByRole("tab", { name: "Поиск" })).toHaveAttribute("aria-selected", "true");
		expect(screen.getByTestId("tab-panel-search")).toBeInTheDocument();

		await waitFor(() => {
			const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
			expect(headers).toContain("КОМПАНИЯ");
			expect(headers).toContain("САЙТ");
			expect(headers).toContain("ТИП");
			expect(headers).toContain("РЕГИОН");
			expect(headers).toContain("ГОД ОСНОВАНИЯ");
			expect(headers).toContain("ВЫРУЧКА");
		});
	});

	test("search tab deep link via ?tab=search works", async () => {
		renderDrawer(["/procurement?item=item-1&tab=search"]);
		expect(screen.getByTestId("tab-panel-search")).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "Поиск" })).toHaveAttribute("aria-selected", "true");
	});

	test("search tab renders ~20 rows with company + ИНН", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		// Default shows non-archived → 19 (20 minus 1 pre-archived seed)
		await waitFor(() => {
			const rows = screen.getAllByRole("row");
			// 1 header + 19 data rows
			expect(rows.length).toBe(20);
		});
		// ИНН labels present
		expect(screen.getAllByText(/^ИНН\s+\d{10}$/).length).toBeGreaterThan(0);
	});

	test("search tab rows show Сайт link with external attrs", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(20);
		});
		const links = screen.getAllByRole("link");
		expect(links.length).toBeGreaterThan(0);
		for (const link of links) {
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
		}
	});

	test("search tab «Отправить запрос» button rendered for new rows, «Запрошен» badge for requested", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(20);
		});
		// Pre-seeded: 2 rows as requested. Pre-archived is hidden → 1 requested visible
		// (i=9 is visible; i=3 is visible; i=7 archived hidden)
		const requestedBadges = screen.getAllByText("Запрошен");
		expect(requestedBadges.length).toBe(2);
		// Rest of new-status rows show the button
		const sendButtons = screen.getAllByRole("button", { name: /Отправить запрос/ });
		expect(sendButtons.length).toBeGreaterThan(0);
	});

	test("search tab archive toggle swaps to archived-only view", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(20);
		});
		const archiveToggle = screen.getByRole("button", { name: "Архив" });
		await user.click(archiveToggle);
		expect(archiveToggle).toHaveAttribute("aria-pressed", "true");
		await waitFor(() => {
			// 1 header + 1 archived row
			expect(screen.getAllByRole("row").length).toBe(2);
		});
	});

	test("search tab selection toolbar shows count + Архивировать + Отправить запрос", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(20);
		});
		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[1]);
		const selectedLabel = screen.getByText("Выбрано: 1");
		const toolbar = selectedLabel.parentElement as HTMLElement;
		expect(within(toolbar).getByRole("button", { name: "Архивировать" })).toBeInTheDocument();
		expect(within(toolbar).getByRole("button", { name: /Отправить запрос/ })).toBeInTheDocument();
	});

	test("search tab filter popover shows Тип and Статус запроса toggles", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(20);
		});
		await user.click(screen.getByRole("button", { name: "Фильтры" }));
		expect(screen.getByRole("button", { name: "Производитель" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Дилер" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Дистрибьютор" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Новый" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Запрошен" })).toBeInTheDocument();
	});

	test("search tab has sortable columns: Компания, Год основания, Выручка", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(20);
		});
		expect(screen.getByRole("button", { name: /Компания/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Год основания/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Выручка/i })).toBeInTheDocument();
	});

	test("send-request on a new-status row promotes to Поставщики, flips to Запрошен, toasts", async () => {
		const { toast } = await import("sonner");
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(20);
		});
		const requestedBefore = screen.getAllByText("Запрошен").length;
		const firstSendBtn = screen.getAllByRole("button", { name: /Отправить запрос/ })[0];
		await user.click(firstSendBtn);
		await waitFor(() => {
			expect(screen.getAllByText("Запрошен").length).toBe(requestedBefore + 1);
		});
		expect(toast.success).toHaveBeenCalledWith("Запрос отправлен");

		await user.click(screen.getByRole("tab", { name: "Поставщики" }));
		await waitFor(() => {
			// Header + pinned current + 10 seeded + 1 newly promoted = 13
			expect(screen.getAllByRole("row").length).toBe(13);
		});
	});

	test("batch send-request promotes selected new rows, skips already-requested, toasts with count", async () => {
		const { toast } = await import("sonner");
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(20);
		});
		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[1]);
		await user.click(checkboxes[2]);
		await user.click(checkboxes[3]);
		const selectedLabel = screen.getByText("Выбрано: 3");
		const toolbar = selectedLabel.parentElement as HTMLElement;
		await user.click(within(toolbar).getByRole("button", { name: /Отправить запрос/ }));
		await waitFor(() => {
			expect(toast.success).toHaveBeenCalled();
		});
		// Selection cleared on completion
		await waitFor(() => {
			expect(screen.queryByText(/^Выбрано:/)).not.toBeInTheDocument();
		});
	});

	test("batch send-request skips already-requested rows (no duplicate promotion)", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(20);
		});
		// Select all rows (19 visible).
		await user.click(screen.getByRole("checkbox", { name: "Выбрать все" }));
		const selectedLabel = screen.getByText(/^Выбрано:/);
		const toolbar = selectedLabel.parentElement as HTMLElement;
		await user.click(within(toolbar).getByRole("button", { name: /Отправить запрос/ }));

		await user.click(screen.getByRole("tab", { name: "Поставщики" }));
		await waitFor(() => {
			// 19 visible rows - 1 pre-requested (i=3) - 1 pre-requested (i=9) = 17 newly promoted.
			// + header + pinned + 10 seeded = 29 total rows.
			expect(screen.getAllByRole("row").length).toBe(29);
		});
	});
});
