import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SEED_FOLDERS } from "@/data/mock-data";
import { anchorDragOverlayToCursor } from "@/lib/drag-overlay";
import { server } from "@/test-msw";
import App, { DragItemOverlay } from "./App";

// Seed stats matching SEED_FOLDER_ASSIGNMENTS counts
const SEED_STATS = [
	{ folderId: "folder-1", itemCount: 9 },
	{ folderId: "folder-2", itemCount: 9 },
	{ folderId: "folder-3", itemCount: 5 },
	{ folderId: "folder-4", itemCount: 5 },
	{ folderId: null, itemCount: 47 },
];

let queryClient: QueryClient;

/** Mutable folder list — mutations update it so refetches return correct data */
let folderList = [...SEED_FOLDERS];

function setupFolderHandlers() {
	folderList = [...SEED_FOLDERS];
	server.use(
		http.get("/api/v1/company/folders/", () => HttpResponse.json({ folders: folderList })),
		http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: SEED_STATS })),
		http.post("/api/v1/company/folders/", async ({ request }) => {
			const body = (await request.json()) as { name: string; color: string };
			const created = { id: `new-${Date.now()}`, ...body };
			folderList = [...folderList, created];
			return HttpResponse.json(created, { status: 201 });
		}),
		http.patch("/api/v1/company/folders/:id/", async ({ request, params }) => {
			const body = (await request.json()) as { name?: string; color?: string };
			const id = params.id as string;
			folderList = folderList.map((f) => (f.id === id ? { ...f, ...body } : f));
			const updated = folderList.find((f) => f.id === id);
			return HttpResponse.json(updated);
		}),
		http.delete("/api/v1/company/folders/:id/", ({ params }) => {
			const id = params.id as string;
			folderList = folderList.filter((f) => f.id !== id);
			return new HttpResponse(null, { status: 204 });
		}),
	);
}

function renderApp(initialEntries?: string[]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>
				<TooltipProvider>
					<App />
				</TooltipProvider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

/** Render and wait for folder data to load from MSW */
async function renderAppReady(initialEntries?: string[]) {
	const result = renderApp(initialEntries);
	// Wait for folder droppable targets — they only render after folder data loads
	await waitFor(() => {
		expect(screen.getByTestId("droppable-folder-1")).toBeInTheDocument();
	});
	return result;
}

beforeEach(() => {
	localStorage.clear();
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	setupFolderHandlers();
});

describe("App", () => {
	test("renders page layout with header, main, and footer", async () => {
		await renderAppReady();
		expect(screen.getByText("Ваши закупки")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Сменить тему" })).toBeInTheDocument();
		expect(screen.getByRole("banner")).toBeInTheDocument();
		expect(screen.getByRole("main")).toBeInTheDocument();
		expect(screen.getByRole("contentinfo")).toBeInTheDocument();
	});

	test("renders procurement table with data", async () => {
		await renderAppReady();
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(screen.getByText("НАИМЕНОВАНИЕ")).toBeInTheDocument();
	});

	test("renders toolbar with search, filters, and create button", async () => {
		await renderAppReady();
		expect(screen.getByPlaceholderText("Поиск по названию…")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Фильтры" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Добавить позиции/ })).toBeInTheDocument();
	});

	test("renders summary panel with SKU count and export button in toolbar", async () => {
		await renderAppReady();
		expect(screen.getByText(/SKU/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Скачать таблицу/ })).toBeInTheDocument();
	});

	test("search filters table rows and updates totals", async () => {
		vi.useFakeTimers();
		renderApp();

		// Wait for folder data to load (timers are fake, advance them)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});

		const table = screen.getByRole("table");
		const initialRowCount = within(table).getAllByRole("row").length;

		const input = screen.getByPlaceholderText("Поиск по названию…");
		fireEvent.change(input, { target: { value: "цемент" } });

		act(() => {
			vi.advanceTimersByTime(300);
		});

		const filteredRowCount = within(table).getAllByRole("row").length;
		expect(filteredRowCount).toBeLessThan(initialRowCount);

		vi.useRealTimers();
	});

	test("filter updates table and summary totals", async () => {
		await renderAppReady();

		const footer = screen.getByRole("contentinfo");
		const skuBefore = footer.textContent;

		fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
		fireEvent.click(screen.getByText("С переплатой"));

		// SKU count in summary panel should change after filtering
		const skuAfter = footer.textContent;
		expect(skuAfter).not.toBe(skuBefore);
	});

	test("sort reorders table rows", async () => {
		await renderAppReady();

		const table = screen.getByRole("table");
		const getFirstDataRowCells = () => {
			const rows = within(table).getAllByRole("row");
			return within(rows[1]).getAllByRole("cell");
		};

		const nameBefore = getFirstDataRowCells()[1].textContent;

		// Click sort on current price (asc)
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА \(ед\.\)/ }));
		const nameAfterAsc = getFirstDataRowCells()[1].textContent;

		// Click again for descending
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА \(ед\.\)/ }));
		const nameAfterDesc = getFirstDataRowCells()[1].textContent;

		// At least one sort direction should change the first row
		const changed = nameBefore !== nameAfterAsc || nameAfterAsc !== nameAfterDesc;
		expect(changed).toBe(true);
	});

	test("restores state from URL search params", async () => {
		await renderAppReady(["/?deviation=overpaying"]);

		const table = screen.getByRole("table");
		const rowCount = within(table).getAllByRole("row").length;
		// With overpaying filter active, we should have fewer rows than full dataset
		expect(rowCount).toBeLessThan(51); // 50 data rows + 1 header
	});

	test("renders sidebar with folders and counts", async () => {
		await renderAppReady();
		expect(screen.getByText("Разделы")).toBeInTheDocument();
		expect(screen.getByText("Все закупки")).toBeInTheDocument();
		expect(screen.getByText("Без раздела")).toBeInTheDocument();
		const sidebar = screen.getByTestId("sidebar");
		expect(within(sidebar).getByText("Металлопрокат")).toBeInTheDocument();
	});

	test("deep-link with folder param filters table to folder items", async () => {
		await renderAppReady(["/?folder=folder-1"]);

		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		// folder-1 has 9 items + 1 header
		expect(rows).toHaveLength(10);
	});

	test("deep-link with folder=none shows only unassigned items", async () => {
		await renderAppReady(["/?folder=none"]);

		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		// 47 unassigned items, batchSize 25 → first batch of 25 + 1 header
		expect(rows).toHaveLength(26);
	});

	test("folder selection filters table via sidebar click", async () => {
		await renderAppReady();

		const table = screen.getByRole("table");
		const initialRowCount = within(table).getAllByRole("row").length;

		const sidebar = screen.getByTestId("sidebar");
		await userEvent.setup().click(within(sidebar).getByText("Металлопрокат"));

		const filteredRowCount = within(table).getAllByRole("row").length;
		expect(filteredRowCount).toBeLessThan(initialRowCount);
	});

	test("folder filter stacks with search filter", async () => {
		vi.useFakeTimers();
		renderApp(["/?folder=folder-1"]);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});

		const table = screen.getByRole("table");
		const folderRowCount = within(table).getAllByRole("row").length;

		// Search within folder
		const input = screen.getByPlaceholderText("Поиск по названию…");
		fireEvent.change(input, { target: { value: "арматура" } });
		act(() => {
			vi.advanceTimersByTime(300);
		});

		const filteredRowCount = within(table).getAllByRole("row").length;
		expect(filteredRowCount).toBeLessThanOrEqual(folderRowCount);

		vi.useRealTimers();
	});

	test("folder badges appear on items with folder assignments", async () => {
		await renderAppReady();
		// Арматура А500С is in folder-1 (Металлопрокат) via localStorage assignments
		expect(screen.getByTestId("folder-badge-item-1")).toBeInTheDocument();
	});

	test("creating a folder adds it to sidebar (optimistic)", async () => {
		await renderAppReady();

		const user = userEvent.setup();
		const sidebar = screen.getByTestId("sidebar");

		// Click "Новый раздел"
		await user.click(within(sidebar).getByRole("button", { name: /Новый раздел/ }));

		// Type name and save
		const input = within(sidebar).getByRole("textbox", { name: "Название раздела" });
		await user.type(input, "Тестовый раздел{Enter}");

		// New folder appears in sidebar (optimistic update)
		await waitFor(() => {
			expect(within(sidebar).getByText("Тестовый раздел")).toBeInTheDocument();
		});
	});

	test("deleting active folder shows all items", async () => {
		await renderAppReady(["/?folder=folder-1"]);

		const user = userEvent.setup();
		const sidebar = screen.getByTestId("sidebar");
		const table = screen.getByRole("table");

		// folder-1 has 9 items + 1 header
		expect(within(table).getAllByRole("row")).toHaveLength(10);

		// Open folder menu and delete
		await user.click(screen.getByRole("button", { name: "Меню раздела Металлопрокат" }));
		await screen.findByText("Удалить");
		fireEvent.click(screen.getByText("Удалить"));

		await screen.findByText("Удалить раздел?");
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

		// Should switch to all items — more rows than folder-1's 9
		await waitFor(() => {
			const rowsAfter = within(table).getAllByRole("row").length;
			expect(rowsAfter).toBeGreaterThan(10);
		});

		// Folder should be gone from sidebar (optimistic delete)
		expect(within(sidebar).queryByText("Металлопрокат")).not.toBeInTheDocument();
	});

	test("renaming a folder updates sidebar (optimistic)", async () => {
		await renderAppReady();

		const user = userEvent.setup();
		const sidebar = screen.getByTestId("sidebar");

		// Open folder menu and rename
		await user.click(screen.getByRole("button", { name: "Меню раздела Металлопрокат" }));
		await screen.findByText("Переименовать");
		fireEvent.click(screen.getByText("Переименовать"));

		const input = within(sidebar).getByDisplayValue("Металлопрокат");
		await user.clear(input);
		await user.type(input, "Сталь{Enter}");

		await waitFor(() => {
			expect(within(sidebar).getByText("Сталь")).toBeInTheDocument();
		});
		expect(within(sidebar).queryByText("Металлопрокат")).not.toBeInTheDocument();
	});

	test("context menu opens on right-click with folder/rename/delete options", async () => {
		await renderAppReady();
		const row = screen.getByTestId("row-item-1");
		fireEvent.contextMenu(row);

		expect(screen.getByText("Переместить в раздел")).toBeInTheDocument();
		expect(screen.getByText("Переименовать")).toBeInTheDocument();
		const menuItems = screen.getAllByText("Удалить");
		expect(menuItems.length).toBeGreaterThanOrEqual(1);
	});

	test("deleting item via context menu removes it from table", async () => {
		await renderAppReady();

		expect(screen.getByTestId("row-item-1")).toBeInTheDocument();

		fireEvent.contextMenu(screen.getByTestId("row-item-1"));
		fireEvent.click(screen.getByRole("menuitem", { name: /Удалить/ }));

		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

		expect(screen.queryByTestId("row-item-1")).not.toBeInTheDocument();
	});

	test("deleted item persists in localStorage", async () => {
		await renderAppReady();

		fireEvent.contextMenu(screen.getByTestId("row-item-1"));
		fireEvent.click(screen.getByRole("menuitem", { name: /Удалить/ }));
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

		const stored = JSON.parse(localStorage.getItem("item-overrides") ?? "{}");
		expect(stored.deleted).toContain("item-1");
	});

	test("folder assignment via context menu updates badge", async () => {
		await renderAppReady();

		// item-16 is unassigned per seed
		const row = screen.getByTestId("row-item-16");
		fireEvent.contextMenu(row);

		fireEvent.click(screen.getByText("Переместить в раздел"));

		// Assign to Металлопрокат via menuitemcheckbox
		fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Металлопрокат/ }));

		expect(screen.getByTestId("folder-badge-item-16")).toBeInTheDocument();
	});

	test("table rows are draggable in app", async () => {
		await renderAppReady();
		const row = screen.getByTestId("row-item-1");
		expect(row.getAttribute("aria-roledescription")).toBe("draggable");
	});

	test("sidebar folders are droppable targets in app", async () => {
		await renderAppReady();
		expect(screen.getByTestId("droppable-folder-1")).toBeInTheDocument();
		expect(screen.getByTestId("droppable-none")).toBeInTheDocument();
	});

	test("'Все закупки' is not a droppable target in app", async () => {
		await renderAppReady();
		expect(screen.queryByTestId("droppable-all")).not.toBeInTheDocument();
	});

	test("drag overlay container exists in app", async () => {
		await renderAppReady();
		expect(screen.getByTestId("dnd-overlay-container")).toBeInTheDocument();
	});

	test("drag overlay shrink-wraps the item label", () => {
		render(
			<DragItemOverlay
				item={{
					id: "item-1",
					name: "Арматура А500С ∅12",
					status: "searching",
					annualQuantity: 1,
					currentPrice: 1,
					bestPrice: 1,
					averagePrice: 1,
					folderId: null,
				}}
			/>,
		);
		expect(screen.getByTestId("drag-overlay").className).toContain("inline-flex");
	});

	test("clicking Добавить позиции opens the drawer with position table", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));

		expect(screen.getByText("Добавить позиции", { selector: "[data-slot='sheet-title']" })).toBeInTheDocument();
		expect(screen.getAllByPlaceholderText("Название позиции")).toHaveLength(1);
		expect(screen.getByText("Позиция 1")).toBeInTheDocument();
	});

	test("creating a position through the drawer increases SKU count and persists", async () => {
		await renderAppReady();
		const user = userEvent.setup();
		const footer = screen.getByRole("contentinfo");

		// SKU count before
		expect(within(footer).getByText("75")).toBeInTheDocument();

		// Open drawer, create position
		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.type(screen.getAllByPlaceholderText("Название позиции")[0], "Тестовая позиция");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// Drawer should close
		expect(screen.queryByPlaceholderText("Название позиции")).not.toBeInTheDocument();

		// SKU count should increase
		expect(within(footer).getByText("76")).toBeInTheDocument();

		// Verify localStorage persistence
		const stored = JSON.parse(localStorage.getItem("custom-items") ?? "[]");
		expect(stored).toHaveLength(1);
		expect(stored[0].name).toBe("Тестовая позиция");
		expect(stored[0].status).toBe("searching");
		expect(stored[0].bestPrice).toBeNull();
		expect(stored[0].averagePrice).toBeNull();
	});

	test("created position survives remount via localStorage", async () => {
		const { unmount } = await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.type(screen.getAllByPlaceholderText("Название позиции")[0], "Persistent Item");
		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		unmount();
		await renderAppReady();

		// SKU count should still be 76 (75 mock + 1 custom)
		const footer = screen.getByRole("contentinfo");
		expect(within(footer).getByText("76")).toBeInTheDocument();
	});

	test("Отмена closes drawer without creating items", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		const table = screen.getByRole("table");
		const rowCountBefore = within(table).getAllByRole("row").length;

		// Open drawer
		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.type(screen.getAllByPlaceholderText("Название позиции")[0], "Should not appear");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		// Dirty form → confirmation dialog
		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		// Drawer should close
		expect(screen.queryByPlaceholderText("Название позиции")).not.toBeInTheDocument();

		// No new items
		const rowCountAfter = within(table).getAllByRole("row").length;
		expect(rowCountAfter).toBe(rowCountBefore);
	});

	test("drag overlay anchors to the cursor position", () => {
		const transform = anchorDragOverlayToCursor({
			activatorEvent: new MouseEvent("pointerdown", { clientX: 520, clientY: 140 }),
			activeNodeRect: {
				top: 100,
				left: 260,
				right: 560,
				bottom: 160,
				width: 300,
				height: 60,
			},
			overlayNodeRect: {
				top: 0,
				left: 0,
				right: 180,
				bottom: 36,
				width: 180,
				height: 36,
			},
			transform: { x: 40, y: 10, scaleX: 1, scaleY: 1 },
		});

		expect(transform.x).toBe(312);
		expect(transform.y).toBe(32);
	});
});
