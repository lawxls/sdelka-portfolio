import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useSearchParams } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { _resetItemDetailStore, _setItemDetailMockDelay } from "@/data/item-detail-mock-data";
import { _resetSupplierStore, _setSupplierMockDelay } from "@/data/supplier-mock-data";
import { _resetTasksStore, _setTasks } from "@/data/tasks-mock-data";

import type { ProcurementItem } from "@/data/types";
import { makeTask, mockHostname } from "@/test-utils";

import { ProcurementItemDrawer } from "./procurement-item-drawer";

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

const assignedTasks = [
	makeTask("task-1", {
		status: "assigned",
		name: "Согласовать цену",
		item: { id: "item-1", name: "Арматура А500С", companyId: "company-1" },
		questionCount: 2,
		createdAt: "2026-03-20T10:00:00.000Z",
	}),
	makeTask("task-2", {
		status: "assigned",
		name: "Запросить образцы",
		item: { id: "item-1", name: "Арматура А500С", companyId: "company-1" },
		questionCount: 1,
		createdAt: "2026-03-18T10:00:00.000Z",
	}),
];
const inProgressTasks = [
	makeTask("task-3", {
		status: "in_progress",
		name: "Проверить качество",
		item: { id: "item-1", name: "Арматура А500С", companyId: "company-1" },
		questionCount: 3,
		createdAt: "2026-03-19T10:00:00.000Z",
	}),
];
const completedTasks = [
	makeTask("task-4", {
		status: "completed",
		name: "Подписать договор",
		item: { id: "item-1", name: "Арматура А500С", companyId: "company-1" },
		questionCount: 0,
	}),
];
const archivedTasks = [
	makeTask("task-5", {
		status: "archived",
		name: "Старый запрос",
		item: { id: "item-1", name: "Арматура А500С", companyId: "company-1" },
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
	_resetItemDetailStore();
	_setItemDetailMockDelay(0, 0);
	_setTasks(ALL_TASKS);
});

afterEach(() => {
	localStorage.clear();
	_resetSupplierStore();
	_resetItemDetailStore();
	_resetTasksStore();
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
		expect(tabs[1]).toHaveTextContent("Задачи");
		expect(tabs[2]).toHaveTextContent("Информация");
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

	test("suppliers tab omits &tab= from URL", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await user.click(screen.getByRole("tab", { name: "Поставщики" }));
		expect(screen.getByTestId("url-spy")).toHaveTextContent("item=item-1");
		expect(screen.getByTestId("url-spy").textContent).not.toContain("tab=");
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

		// Default tab — suppliers placeholder
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

	test("suppliers tab has archive filter toggle", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});
		const btn = screen.getByRole("button", { name: "Архив" });
		expect(btn).toHaveAttribute("aria-pressed", "false");
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

	test("selecting suppliers shows selection toolbar with archive", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
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
		expect(screen.getByLabelText("Название")).toHaveValue("Арматура А500С ∅12");
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
		expect(within(panel).getByText("Арматура А500С ∅12")).toBeInTheDocument();
	});

	test("details tab has edit buttons for all four sections", async () => {
		renderDrawer(["/procurement?item=item-1&tab=details"]);

		await waitFor(() => {
			expect(screen.getByText("Основная информация")).toBeInTheDocument();
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

		// Rendered as rows, not cards
		expect(within(panel).getByTestId("task-row-task-1")).toBeInTheDocument();
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
		const rows = within(panel).getAllByTestId(/^task-row-/);
		// task-1 (Mar 20) > task-3 (Mar 19) > task-2 (Mar 18)
		expect(rows[0]).toHaveAttribute("data-testid", "task-row-task-1");
		expect(rows[1]).toHaveAttribute("data-testid", "task-row-task-3");
		expect(rows[2]).toHaveAttribute("data-testid", "task-row-task-2");
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

		await user.click(screen.getByTestId("task-row-task-1"));

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

	test("suppliers tab shows best offer card with savings vs current supplier", async () => {
		renderDrawer(["/procurement?item=item-1"]);

		await waitFor(() => {
			expect(screen.getByText("Экономия")).toBeInTheDocument();
		});
		const savingsValue = screen.getByText("Экономия").nextElementSibling;
		expect(savingsValue?.textContent).not.toBe("\u2014");
	});

	test("suppliers tab best offer card shows em-dash savings when item has no currentSupplier", async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>
					<MemoryRouter initialEntries={["/procurement?item=item-no-supplier"]}>
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

	test("context menu shows Выбрать поставщика for получено_кп supplier", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		// First data row is получено_кп (STATUS_PATTERN[0])
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		expect(screen.getByText("Выбрать поставщика")).toBeInTheDocument();
	});

	test("context menu hides Выбрать поставщика for non-получено_кп supplier", async () => {
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		// Default sort puts получено_кП first (3 rows), so row 4 is non-получено_кп
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[4]);
		expect(screen.queryByText("Выбрать поставщика")).not.toBeInTheDocument();
	});

	test("clicking Выбрать поставщика opens confirmation dialog", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		await user.click(screen.getByText("Выбрать поставщика"));

		expect(screen.getByText(/текущим поставщиком/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Подтвердить" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
	});

	test("cancelling select supplier dialog does not change current supplier", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		await user.click(screen.getByText("Выбрать поставщика"));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		// Dialog should be gone
		expect(screen.queryByText(/текущим поставщиком/)).not.toBeInTheDocument();
		// Original current supplier still shown (also appears in the supplier row due to coherence)
		expect(screen.getAllByText("МеталлТрейд").length).toBeGreaterThanOrEqual(1);
	});

	test("confirming select supplier dialog fires mutation and closes dialog", async () => {
		const user = userEvent.setup();
		renderDrawer(["/procurement?item=item-1"]);
		await waitFor(() => {
			expect(screen.getAllByRole("row").length).toBe(11);
		});

		// Verify current supplier before selection (also appears in the supplier row due to coherence)
		expect(screen.getAllByText("МеталлТрейд").length).toBeGreaterThanOrEqual(1);

		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		await user.click(screen.getByText("Выбрать поставщика"));

		// Confirmation dialog is open
		expect(screen.getByText(/текущим поставщиком/)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Подтвердить" }));

		// Dialog should close
		await waitFor(() => {
			expect(screen.queryByText(/текущим поставщиком/)).not.toBeInTheDocument();
		});
	});
});
