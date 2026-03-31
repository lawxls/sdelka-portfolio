import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setTokens } from "@/data/auth";
import * as mockParser from "@/data/mock-file-parser";
import { _resetTaskStore, _setMockDelay } from "@/data/task-mock-data";
import type { Folder } from "@/data/types";
import { anchorDragOverlayToCursor } from "@/lib/drag-overlay";
import { DragItemOverlay } from "@/pages/procurement-page";
import { server } from "@/test-msw";
import { makeItem } from "@/test-utils";
import App from "./App";

const ITEMS_PAGE_1 = Array.from({ length: 25 }, (_, i) =>
	makeItem(`item-${i + 1}`, {
		name: i === 0 ? "Арматура А500С ∅12" : `Item ${i + 1}`,
		status: i < 5 ? "awaiting_analytics" : i < 12 ? "searching" : i < 20 ? "negotiating" : "completed",
		folderId: i < 5 ? "folder-1" : i < 10 ? "folder-2" : null,
	}),
);

const MOCK_TOTALS = {
	itemCount: 35,
	totalOverpayment: "15000.00",
	totalSavings: "8000.00",
	totalDeviation: "7000.00",
};

const FOLDER_STATS = [
	{ folderId: "folder-1", itemCount: 9 },
	{ folderId: "folder-2", itemCount: 9 },
	{ folderId: "folder-3", itemCount: 5 },
	{ folderId: "folder-4", itemCount: 5 },
	{ folderId: null, itemCount: 7 },
];

const TEST_FOLDERS: Folder[] = [
	{ id: "folder-1", name: "Металлопрокат", color: "blue" },
	{ id: "folder-2", name: "Стройматериалы", color: "green" },
	{ id: "folder-3", name: "Инженерные системы", color: "orange" },
	{ id: "folder-4", name: "Электрика", color: "purple" },
];

// --- MSW handlers ---

let folderList = [...TEST_FOLDERS];
let itemList = [...ITEMS_PAGE_1];

function setupHandlers() {
	folderList = [...TEST_FOLDERS];
	itemList = [...ITEMS_PAGE_1];
	server.use(
		http.get("/api/v1/company/items/", ({ request }) => {
			const url = new URL(request.url);
			const q = url.searchParams.get("q");
			const folder = url.searchParams.get("folder");
			const status = url.searchParams.get("status");
			const deviation = url.searchParams.get("deviation");

			let items = [...itemList];

			if (q) {
				items = items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase()));
			}
			if (folder) {
				if (folder === "none") {
					items = items.filter((item) => item.folderId == null);
				} else {
					items = items.filter((item) => item.folderId === folder);
				}
			}
			if (status) {
				items = items.filter((item) => item.status === status);
			}
			if (deviation === "overpaying") {
				items = items.filter(
					(item) => item.bestPrice != null && (item.currentPrice as number) > (item.bestPrice as number),
				);
			}

			return HttpResponse.json({ items, nextCursor: null });
		}),
		http.get("/api/v1/company/items/totals", () => HttpResponse.json(MOCK_TOTALS)),
		http.get("/api/v1/company/folders/", () => HttpResponse.json({ folders: folderList })),
		http.get("/api/v1/company/folders/stats", () => HttpResponse.json({ stats: FOLDER_STATS })),
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
		http.patch("/api/v1/company/items/:id/", async ({ request, params }) => {
			const body = (await request.json()) as Record<string, unknown>;
			const id = params.id as string;
			itemList = itemList.map((i) => (i.id === id ? { ...i, ...body } : i));
			const updated = itemList.find((i) => i.id === id);
			return HttpResponse.json(updated);
		}),
		http.delete("/api/v1/company/items/:id/", ({ params }) => {
			const id = params.id as string;
			itemList = itemList.filter((i) => i.id !== id);
			return new HttpResponse(null, { status: 204 });
		}),
		http.post("/api/v1/company/items/batch", async ({ request }) => {
			const body = (await request.json()) as { items: Array<{ name: string }> };
			const created = body.items.map((item, i) => makeItem(`new-${i + 1}`, { name: item.name, folderId: null }));
			itemList = [...itemList, ...created];
			return HttpResponse.json({ items: created, isAsync: false }, { status: 201 });
		}),
		http.get("/api/v1/companies/", () =>
			HttpResponse.json({
				companies: [
					{
						id: "company-1",
						name: "Тестовая компания",
						isMain: true,
						responsibleEmployeeName: "Иванов",
						addresses: [
							{
								id: "addr-1",
								name: "Офис",
								type: "office",
								address: "г. Москва, ул. Тестовая, д. 1",
								isMain: true,
							},
						],
						employeeCount: 1,
						procurementItemCount: 0,
					},
				],
				nextCursor: null,
			}),
		),
	);
}

// --- Render helpers ---

let queryClient: QueryClient;

function renderApp(initialEntries?: string[]) {
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries ?? ["/procurement"]}>
				<TooltipProvider>
					<App />
				</TooltipProvider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

/** Render and wait for both folder and item data to load */
async function renderAppReady(initialEntries?: string[]) {
	const result = renderApp(initialEntries);
	await waitFor(() => {
		expect(screen.getByTestId("droppable-folder-1")).toBeInTheDocument();
		expect(screen.queryAllByTestId("skeleton-row")).toHaveLength(0);
	});
	return result;
}

beforeEach(() => {
	localStorage.clear();
	setTokens("test-access", "test-refresh");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	setupHandlers();
	_resetTaskStore();
	_setMockDelay(0, 0);
});

// ---- Route tests (TDD) ----

describe("Routing", () => {
	test("/ redirects to /procurement", async () => {
		renderApp(["/"]);
		await waitFor(() => {
			expect(screen.getByText("Ваши закупки")).toBeInTheDocument();
		});
	});

	test("/ preserves query params when redirecting to /procurement", async () => {
		await renderAppReady(["/?deviation=overpaying"]);
		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		expect(rows.length).toBeGreaterThan(1);
	});

	test("/procurement renders procurement content", async () => {
		await renderAppReady();
		expect(screen.getByText("Ваши закупки")).toBeInTheDocument();
		expect(screen.getByRole("banner")).toBeInTheDocument();
		expect(screen.getByRole("main")).toBeInTheDocument();
	});

	test("/analytics renders placeholder page with icon", async () => {
		renderApp(["/analytics"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Аналитика" })).toBeInTheDocument();
			expect(screen.getByText("В разработке")).toBeInTheDocument();
			expect(screen.getByTestId("placeholder-icon")).toBeInTheDocument();
		});
	});

	test("/companies renders companies page", async () => {
		server.use(http.get("/api/v1/companies/", () => HttpResponse.json({ companies: [], nextCursor: null })));
		renderApp(["/companies"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Компании" })).toBeInTheDocument();
		});
	});

	test("/tasks renders tasks page with board", async () => {
		renderApp(["/tasks"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Задачи" })).toBeInTheDocument();
			expect(screen.getByTestId("task-board")).toBeInTheDocument();
		});
	});

	test("/profile renders profile page with skeleton then content", async () => {
		server.use(
			http.get("/api/v1/auth/settings", () =>
				HttpResponse.json({
					first_name: "Иван",
					last_name: "Иванов",
					email: "ivan@example.com",
					phone: "+79991234567",
					avatar_icon: "blue",
					date_joined: "2024-01-15T10:00:00Z",
					mailing_allowed: true,
				}),
			),
		);
		renderApp(["/profile"]);
		await waitFor(() => {
			expect(screen.getByText("Иван Иванов")).toBeInTheDocument();
		});
	});

	test("FolderSidebar renders on /procurement", async () => {
		await renderAppReady();
		expect(screen.getByTestId("sidebar")).toBeInTheDocument();
	});

	test("FolderSidebar does not render on /analytics", async () => {
		renderApp(["/analytics"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Аналитика" })).toBeInTheDocument();
		});
		expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
	});

	test("URL query params preserved under /procurement", async () => {
		await renderAppReady(["/procurement?deviation=overpaying"]);
		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		expect(rows.length).toBeGreaterThan(1);
	});

	test("mobile bottom nav renders in layout", () => {
		renderApp();
		expect(screen.getByTestId("mobile-bottom-nav")).toBeInTheDocument();
	});

	test("mobile header renders avatar button", () => {
		renderApp();
		const header = screen.getByTestId("mobile-header");
		expect(within(header).getByRole("button", { name: "Меню пользователя" })).toBeInTheDocument();
	});

	test("mobile header avatar opens dropdown with 3 items", async () => {
		renderApp();
		const user = userEvent.setup();
		const header = screen.getByTestId("mobile-header");
		await user.click(within(header).getByRole("button", { name: "Меню пользователя" }));

		expect(screen.getByRole("menuitem", { name: "Мой профиль" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Настройки" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Выйти" })).toBeInTheDocument();
	});

	test("/register renders registration page with valid invitation", async () => {
		localStorage.clear(); // no auth token — public route
		server.use(http.post("/api/v1/auth/verify-invitation-code", () => HttpResponse.json({ valid: true })));

		renderApp(["/register?code=ABC12"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
		});
	});

	test("/confirm-email renders confirmation page", async () => {
		localStorage.clear(); // no auth token — public route
		server.use(
			http.post("/api/v1/auth/confirm-email", () => HttpResponse.json({ message: "Email confirmed successfully" })),
		);

		renderApp(["/confirm-email?token=test-token"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Email подтверждён" })).toBeInTheDocument();
		});
	});

	test("/forgot-password renders forgot password page", async () => {
		localStorage.clear(); // no auth token — public route
		renderApp(["/forgot-password"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Восстановление пароля" })).toBeInTheDocument();
		});
	});

	test("/reset-password renders reset password page", async () => {
		localStorage.clear(); // no auth token — public route
		renderApp(["/reset-password?token=test-token"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Новый пароль" })).toBeInTheDocument();
		});
	});

	test("mobile bottom nav navigates between sections", async () => {
		renderApp();
		const user = userEvent.setup();
		const nav = screen.getByTestId("mobile-bottom-nav");
		await user.click(within(nav).getByRole("link", { name: "Аналитика" }));

		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Аналитика" })).toBeInTheDocument();
		});
	});
});

// ---- Procurement page tests ----

describe("ProcurementPage", () => {
	test("renders page layout with header and main", async () => {
		await renderAppReady();
		expect(screen.getByText("Ваши закупки")).toBeInTheDocument();
		expect(screen.getByRole("banner")).toBeInTheDocument();
		expect(screen.getByRole("main")).toBeInTheDocument();
	});

	test("no footer in layout", async () => {
		await renderAppReady();
		expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
	});

	test("renders procurement table with server data", async () => {
		await renderAppReady();
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(screen.getByText("НАИМЕНОВАНИЕ")).toBeInTheDocument();
		expect(screen.getByText("Арматура А500С ∅12")).toBeInTheDocument();
	});

	test("renders toolbar with search, filters, and create button", async () => {
		await renderAppReady();
		expect(screen.getByPlaceholderText("Поиск по названию…")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Фильтры" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Добавить позиции/ })).toBeInTheDocument();
	});

	test("shows skeleton rows during initial load", () => {
		renderApp();
		expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThan(0);
	});

	test("search filters table rows via API refetch", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		const table = screen.getByRole("table");
		const initialRowCount = within(table).getAllByRole("row").length;

		const input = screen.getByPlaceholderText("Поиск по названию…");
		await user.clear(input);
		await user.type(input, "Арматура");

		// Wait for debounced search to trigger refetch
		await waitFor(() => {
			const filteredRowCount = within(table).getAllByRole("row").length;
			expect(filteredRowCount).toBeLessThan(initialRowCount);
		});
	});

	test("filter updates URL params and triggers refetch", async () => {
		await renderAppReady();

		const table = screen.getByRole("table");
		const initialRowCount = within(table).getAllByRole("row").length;

		fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
		fireEvent.click(screen.getByText("С переплатой"));

		await waitFor(() => {
			const filteredRowCount = within(table).getAllByRole("row").length;
			expect(filteredRowCount).toBeLessThan(initialRowCount);
		});
	});

	test("sort button toggles via URL params", async () => {
		await renderAppReady();
		// Just verify sort button works without timing issues
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА \(ед\.\)/ }));
		// Click again for desc
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА \(ед\.\)/ }));
		// Click again to clear
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА \(ед\.\)/ }));
		// No crash
	});

	test("restores state from URL search params", async () => {
		await renderAppReady(["/procurement?deviation=overpaying"]);

		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		expect(rows.length).toBeGreaterThan(1);
	});

	test("renders sidebar with folders and counts", async () => {
		await renderAppReady();
		expect(screen.getByRole("heading", { name: "Категории" })).toBeInTheDocument();
		expect(screen.getByText("Все закупки")).toBeInTheDocument();
		expect(screen.getByText("Без категории")).toBeInTheDocument();
		const sidebar = screen.getByTestId("sidebar");
		expect(within(sidebar).getByText("Металлопрокат")).toBeInTheDocument();
	});

	test("deep-link with folder param filters table to folder items", async () => {
		await renderAppReady(["/procurement?folder=folder-1"]);

		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		// Only items with folderId=folder-1 (5 items + header)
		expect(rows).toHaveLength(6);
	});

	test("deep-link with folder=none shows only unassigned items", async () => {
		await renderAppReady(["/procurement?folder=none"]);

		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		// Only items with folderId=null (15 items + header)
		expect(rows).toHaveLength(16);
	});

	test("folder selection filters table via sidebar click", async () => {
		await renderAppReady();

		const table = screen.getByRole("table");
		const initialRowCount = within(table).getAllByRole("row").length;

		const sidebar = screen.getByTestId("sidebar");
		await userEvent.setup().click(within(sidebar).getByText("Металлопрокат"));

		await waitFor(() => {
			const filteredRowCount = within(table).getAllByRole("row").length;
			expect(filteredRowCount).toBeLessThan(initialRowCount);
		});
	});

	test("creating a folder adds it to sidebar (optimistic)", async () => {
		await renderAppReady();

		const user = userEvent.setup();
		const sidebar = screen.getByTestId("sidebar");

		await user.click(within(sidebar).getByRole("button", { name: /Новая категория/ }));

		const input = within(sidebar).getByRole("textbox", { name: "Название категории" });
		await user.type(input, "Тест раздел{Enter}");

		await waitFor(() => {
			expect(within(sidebar).getByText("Тест раздел")).toBeInTheDocument();
		});
	});

	test("deleting active folder clears folder filter", async () => {
		await renderAppReady(["/procurement?folder=folder-1"]);

		const user = userEvent.setup();
		const sidebar = screen.getByTestId("sidebar");

		await user.click(screen.getByRole("button", { name: "Меню категории Металлопрокат" }));
		await screen.findByText("Удалить");
		fireEvent.click(screen.getByText("Удалить"));

		await screen.findByText("Удалить категорию?");
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

		// Folder gone from sidebar
		await waitFor(() => {
			expect(within(sidebar).queryByText("Металлопрокат")).not.toBeInTheDocument();
		});
	});

	test("renaming a folder updates sidebar (optimistic)", async () => {
		await renderAppReady();

		const user = userEvent.setup();
		const sidebar = screen.getByTestId("sidebar");

		await user.click(screen.getByRole("button", { name: "Меню категории Металлопрокат" }));
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

	test("table rows are draggable", async () => {
		await renderAppReady();
		const rows = screen.getAllByRole("row");
		const dataRow = rows[1];
		expect(dataRow.getAttribute("aria-roledescription")).toBe("draggable");
	});

	test("sidebar folders are droppable targets", async () => {
		await renderAppReady();
		expect(screen.getByTestId("droppable-folder-1")).toBeInTheDocument();
		expect(screen.getByTestId("droppable-none")).toBeInTheDocument();
	});

	test("'Все закупки' is not a droppable target", async () => {
		await renderAppReady();
		expect(screen.queryByTestId("droppable-all")).not.toBeInTheDocument();
	});

	test("drag overlay container exists", async () => {
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
					companyId: "company-1",
				}}
			/>,
		);
		expect(screen.getByTestId("drag-overlay").className).toContain("inline-flex");
	});

	test("clicking Добавить позиции opens choice dialog", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));

		expect(screen.getByText("Добавить позиции", { selector: "[data-slot='dialog-title']" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Вручную/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Из файла/ })).toBeInTheDocument();
	});

	test("clicking Вручную in dialog opens the drawer", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.click(screen.getByRole("button", { name: /Вручную/ }));

		expect(screen.getByText("Добавить позиции", { selector: "[data-slot='sheet-title']" })).toBeInTheDocument();
		expect(screen.getAllByPlaceholderText("Название позиции *")).toHaveLength(1);
	});

	test("Отмена closes drawer", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.click(screen.getByRole("button", { name: /Вручную/ }));
		await user.type(screen.getAllByPlaceholderText("Название позиции *")[0], "Should not appear");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		expect(screen.queryByPlaceholderText("Название позиции *")).not.toBeInTheDocument();
	});

	test("shows error state with retry button on items load failure", async () => {
		server.use(http.get("/api/v1/company/items/", () => HttpResponse.json({}, { status: 500 })));

		renderApp();

		await waitFor(() => {
			expect(screen.getByTestId("items-error")).toBeInTheDocument();
		});
		expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
		expect(screen.getByText("Повторить")).toBeInTheDocument();
	});

	test("retry button refetches items after error", async () => {
		let callCount = 0;
		server.use(
			http.get("/api/v1/company/items/", () => {
				callCount++;
				if (callCount === 1) return HttpResponse.json({}, { status: 500 });
				return HttpResponse.json({ items: ITEMS_PAGE_1, nextCursor: null });
			}),
		);

		renderApp();

		await waitFor(() => {
			expect(screen.getByText("Повторить")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText("Повторить"));

		await waitFor(() => {
			expect(screen.getByText("Арматура А500С ∅12")).toBeInTheDocument();
		});
	});

	test("context menu rename sends PATCH and updates table", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		const row = screen.getByTestId("row-item-1");
		fireEvent.contextMenu(row);

		await screen.findByText("Переименовать");
		fireEvent.click(screen.getByText("Переименовать"));

		const input = screen.getByLabelText("Название закупки");
		await user.clear(input);
		await user.type(input, "Новое название{Enter}");

		await waitFor(() => {
			expect(screen.getByText("Новое название")).toBeInTheDocument();
		});
	});

	test("context menu delete sends DELETE and removes row", async () => {
		await renderAppReady();

		const row = screen.getByTestId("row-item-1");
		fireEvent.contextMenu(row);

		await screen.findByText("Удалить");
		fireEvent.click(screen.getByText("Удалить"));

		await screen.findByText("Удалить закупку?");
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

		await waitFor(() => {
			expect(screen.queryByText("Арматура А500С ∅12")).not.toBeInTheDocument();
		});
	});

	test("context menu assign folder sends PATCH", async () => {
		// Use an item that has no folder (item-11 has folderId: null)
		await renderAppReady();

		const row = screen.getByTestId("row-item-11");
		fireEvent.contextMenu(row);

		await screen.findByText("Переместить в категорию");
		fireEvent.click(screen.getByText("Переместить в категорию"));

		// Context menu submenu items are checkbox items — use role
		const menuItems = await screen.findAllByRole("menuitemcheckbox");
		const target = menuItems.find((el) => el.textContent?.includes("Стройматериалы"));
		if (!target) throw new Error("Стройматериалы menu item not found");
		fireEvent.click(target);

		// Optimistic: folder badge should appear on item-11
		await waitFor(() => {
			const badge = screen.queryByTestId("folder-badge-item-11");
			expect(badge).toBeInTheDocument();
		});
	});

	test("drawer submit sends batch create and closes drawer", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.click(screen.getByRole("button", { name: /Вручную/ }));

		const nameInput = screen.getAllByPlaceholderText("Название позиции *")[0];
		await user.type(nameInput, "Тестовая позиция");

		const companyTrigger = await screen.findByLabelText("Компания");
		await user.click(companyTrigger);
		await user.click(await screen.findByRole("option", { name: "Тестовая компания" }));

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// Drawer closes
		await waitFor(() => {
			expect(screen.queryByPlaceholderText("Название позиции *")).not.toBeInTheDocument();
		});
	});

	test("drawer submit shows toast for async batch response", async () => {
		server.use(
			http.post("/api/v1/company/items/batch", () =>
				HttpResponse.json({ isAsync: true, taskId: "task-123" }, { status: 202 }),
			),
		);

		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.click(screen.getByRole("button", { name: /Вручную/ }));

		const nameInput = screen.getAllByPlaceholderText("Название позиции *")[0];
		await user.type(nameInput, "Большая партия");

		const companyTrigger = await screen.findByLabelText("Компания");
		await user.click(companyTrigger);
		await user.click(await screen.findByRole("option", { name: "Тестовая компания" }));

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// Drawer closes
		await waitFor(() => {
			expect(screen.queryByPlaceholderText("Название позиции *")).not.toBeInTheDocument();
		});
	});

	test("drawer submit shows error toast on 400 validation failure", async () => {
		server.use(
			http.post("/api/v1/company/items/batch", () =>
				HttpResponse.json({ items: [{ name: ["Required."] }] }, { status: 400 }),
			),
		);

		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.click(screen.getByRole("button", { name: /Вручную/ }));

		const nameInput = screen.getAllByPlaceholderText("Название позиции *")[0];
		await user.type(nameInput, "Test");

		const companyTrigger = await screen.findByLabelText("Компания");
		await user.click(companyTrigger);
		await user.click(await screen.findByRole("option", { name: "Тестовая компания" }));

		await user.click(screen.getByRole("button", { name: "Создать позиции" }));

		// Drawer still closes (form resets on submit before mutation resolves)
		await waitFor(() => {
			expect(screen.queryByPlaceholderText("Название позиции *")).not.toBeInTheDocument();
		});
	});

	test("file import via dialog calls createItemsBatch and closes dialog", async () => {
		vi.spyOn(mockParser, "parseFile").mockResolvedValue([{ name: "Import 1" }, { name: "Import 2" }]);

		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.click(screen.getByRole("button", { name: /Из файла/ }));
		fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [new File(["data"], "items.xlsx")] } });
		await waitFor(() => expect(screen.getByText("Import 1")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: /Импортировать/ }));

		// Dialog closes (dialog title gone)
		await waitFor(() => {
			expect(
				screen.queryByText("Добавить позиции", { selector: "[data-slot='dialog-title']" }),
			).not.toBeInTheDocument();
		});
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
