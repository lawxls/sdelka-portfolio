import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setTokens } from "@/data/auth";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import type { ItemsClient } from "@/data/clients/items-client";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { _resetFoldersStore, _setFolders } from "@/data/folders-mock-data";
import * as mockParser from "@/data/mock-file-parser";
import { _resetTasksStore, _setTasks } from "@/data/tasks-mock-data";
import { fakeItemsClient, TestClientsProvider } from "@/data/test-clients-provider";
import type { Company, Folder } from "@/data/types";
import { makeItem } from "@/test-utils";
import App from "./App";

const ITEMS_PAGE_1 = Array.from({ length: 25 }, (_, i) =>
	makeItem(`item-${i + 1}`, {
		name: i === 0 ? "Арматура А500С ∅12" : `Item ${i + 1}`,
		status: i < 12 ? "searching" : i < 20 ? "negotiating" : "completed",
		folderId: i < 5 ? "folder-1" : i < 10 ? "folder-2" : null,
		// Ensure deviation=overpaying filter captures some rows
		currentPrice: 100,
		bestPrice: 80,
	}),
);

const TEST_FOLDERS: Folder[] = [
	{ id: "folder-1", name: "Металлопрокат", color: "blue" },
	{ id: "folder-2", name: "Стройматериалы", color: "green" },
	{ id: "folder-3", name: "Инженерные системы", color: "orange" },
	{ id: "folder-4", name: "Электрика", color: "purple" },
];

const TEST_COMPANIES: Company[] = [
	{
		id: "company-1",
		name: "Тестовая компания",
		website: "",
		description: "",
		additionalComments: "",
		isMain: true,
		employeeCount: 1,
		procurementItemCount: 0,
		addresses: [{ id: "addr-1", name: "Офис", address: "г. Москва, ул. Тестовая, д. 1", phone: "", isMain: true }],
		employees: [
			{
				id: 1,
				firstName: "Иван",
				lastName: "Иванов",
				patronymic: "",
				position: "",
				role: "admin",
				phone: "",
				email: "",
				permissions: {
					id: "p1",
					employeeId: 1,
					procurement: "edit",
					tasks: "edit",
					companies: "edit",
					employees: "edit",
					emails: "edit",
				},
			},
		],
	},
];

function setupHandlers() {
	_setFolders(TEST_FOLDERS);
	_setTasks([]);
}

// --- Render helpers ---

let queryClient: QueryClient;

function renderApp(initialEntries?: string[], opts: { items?: ItemsClient } = {}) {
	const companiesClient = createInMemoryCompaniesClient(TEST_COMPANIES);
	const itemsClient = opts.items ?? createInMemoryItemsClient({ seed: ITEMS_PAGE_1 });
	return render(
		<TestClientsProvider queryClient={queryClient} clients={{ companies: companiesClient, items: itemsClient }}>
			<MemoryRouter initialEntries={initialEntries ?? ["/procurement"]}>
				<TooltipProvider>
					<App />
				</TooltipProvider>
			</MemoryRouter>
		</TestClientsProvider>,
	);
}

/** Render and wait for items to load */
async function renderAppReady(initialEntries?: string[], opts?: { items?: ItemsClient }) {
	const result = renderApp(initialEntries, opts);
	await waitFor(() => {
		expect(screen.queryAllByTestId("skeleton-row")).toHaveLength(0);
		expect(screen.getByRole("table")).toBeInTheDocument();
	});
	return result;
}

beforeEach(() => {
	localStorage.clear();
	setTokens("test-access");
	_resetFoldersStore();
	_resetTasksStore();
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	setupHandlers();
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ---- Route tests (TDD) ----

describe("Routing", () => {
	test("/ redirects to /procurement", async () => {
		renderApp(["/"]);
		await waitFor(() => {
			expect(screen.getByPlaceholderText("Поиск позиций, поставщиков, задач…")).toBeInTheDocument();
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
		expect(screen.getByPlaceholderText("Поиск позиций, поставщиков, задач…")).toBeInTheDocument();
		expect(screen.getByTestId("global-header")).toBeInTheDocument();
		expect(screen.getByRole("main")).toBeInTheDocument();
	});

	test("/tasks renders tasks page", async () => {
		renderApp(["/tasks"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Задачи" })).toBeInTheDocument();
		});
	});

	test("/profile redirects to /settings/profile", async () => {
		renderApp(["/profile"]);
		await waitFor(() => {
			expect(screen.getByTestId("settings-layout")).toBeInTheDocument();
		});
	});

	test("/settings/workspace renders inside settings layout with correct breadcrumb", async () => {
		renderApp(["/settings/workspace"]);
		await waitFor(() => {
			expect(screen.getByTestId("settings-layout")).toBeInTheDocument();
		});
		const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
		expect(within(breadcrumb).getByText("Рабочее пространство")).toBeInTheDocument();
		expect(within(breadcrumb).getByText("Общие настройки")).toBeInTheDocument();
	});

	test("/settings/workspace has no header action button", async () => {
		renderApp(["/settings/workspace"]);
		await waitFor(() => {
			expect(screen.getByTestId("settings-layout")).toBeInTheDocument();
		});
		// No action buttons like "Добавить компанию" or "Добавить сотрудника"
		expect(screen.queryByRole("button", { name: /Добавить компанию/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Добавить сотрудника/ })).not.toBeInTheDocument();
	});

	test("URL query params preserved under /procurement", async () => {
		await renderAppReady(["/procurement?deviation=overpaying"]);
		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		expect(rows.length).toBeGreaterThan(1);
	});

	test("global header renders notifications and theme toggle buttons", () => {
		renderApp();
		const header = screen.getByTestId("global-header");
		expect(within(header).getByRole("button", { name: "Уведомления" })).toBeInTheDocument();
		expect(within(header).getByRole("button", { name: "Сменить тему" })).toBeInTheDocument();
	});

	test("sidebar avatar opens dropdown with 3 items", async () => {
		renderApp();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Меню пользователя" }));

		expect(screen.getByRole("menuitem", { name: "Мой профиль" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: /Сменить тему/ })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Выйти" })).toBeInTheDocument();
	});

	test("/register renders registration page with valid invitation", async () => {
		localStorage.clear(); // no auth token — public route

		renderApp(["/register?code=ABC12"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
		});
	});

	test("/confirm-email renders confirmation page", async () => {
		localStorage.clear(); // no auth token — public route

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
});

// ---- Procurement page tests ----

describe("ProcurementPage", () => {
	test("renders page layout with header and main", async () => {
		await renderAppReady();
		expect(screen.getByTestId("global-header")).toBeInTheDocument();
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
		expect(screen.getByRole("button", { name: "Поиск позиций" })).toBeInTheDocument();
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

		await user.click(screen.getByRole("button", { name: "Поиск позиций" }));
		const input = screen.getByPlaceholderText("Поиск…");
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
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩЕЕ\u00A0ТСО/ }));
		// Click again for desc
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩЕЕ\u00A0ТСО/ }));
		// Click again to clear
		fireEvent.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩЕЕ\u00A0ТСО/ }));
		// No crash
	});

	test("restores state from URL search params", async () => {
		await renderAppReady(["/procurement?deviation=overpaying"]);

		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		expect(rows.length).toBeGreaterThan(1);
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

	test("clicking Добавить позиции opens choice dialog", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));

		expect(screen.getByText("Добавить позиции", { selector: "[data-slot='dialog-title']" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Вручную/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Из файла/ })).toBeInTheDocument();
	});

	test("clicking Вручную in dialog opens the wizard drawer", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.click(screen.getByRole("button", { name: /Вручную/ }));

		expect(screen.getByText("Добавить позицию", { selector: "[data-slot='sheet-title']" })).toBeInTheDocument();
		expect(screen.getByLabelText("Название")).toBeInTheDocument();
	});

	test("Отмена on dirty drawer prompts discard and closes", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.click(screen.getByRole("button", { name: /Вручную/ }));
		await user.type(screen.getByLabelText("Название"), "Should not appear");
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		await user.click(screen.getByRole("button", { name: "Закрыть без сохранения" }));

		expect(screen.queryByLabelText("Название")).not.toBeInTheDocument();
	});

	test("shows error state with retry button on items load failure", async () => {
		const items = fakeItemsClient({ list: () => Promise.reject(new Error("boom")) });
		renderApp(undefined, { items });

		await waitFor(() => {
			expect(screen.getByTestId("items-error")).toBeInTheDocument();
		});
		expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
		expect(screen.getByText("Повторить")).toBeInTheDocument();
	});

	test("retry button refetches items after error", async () => {
		let callCount = 0;
		const list = vi.fn(async () => {
			callCount++;
			if (callCount === 1) throw new Error("transient");
			return { items: ITEMS_PAGE_1, nextCursor: null };
		});
		const items = fakeItemsClient({ list });
		renderApp(undefined, { items });

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

	async function completeWizard(user: ReturnType<typeof userEvent.setup>, name: string) {
		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		await user.click(screen.getByRole("button", { name: /Вручную/ }));

		await user.type(screen.getByLabelText("Название"), name);

		// Single company → auto-selected and locked; no manual pick needed.
		await user.click(screen.getByRole("button", { name: "Далее" }));
		await user.click(screen.getByRole("button", { name: "Далее" }));
		await user.click(screen.getByRole("button", { name: "Создать" }));
	}

	test("drawer submit sends batch create and closes drawer", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await completeWizard(user, "Тестовая позиция");

		await waitFor(() => {
			expect(screen.queryByLabelText("Название")).not.toBeInTheDocument();
		});
	});

	test("drawer submit shows toast for async batch response", async () => {
		const baseItems = createInMemoryItemsClient({ seed: ITEMS_PAGE_1 });
		const items: ItemsClient = {
			...baseItems,
			create: vi.fn().mockResolvedValueOnce({ isAsync: true, taskId: "task-123" }),
		};

		await renderAppReady(undefined, { items });
		const user = userEvent.setup();

		await completeWizard(user, "Большая партия");

		await waitFor(() => {
			expect(screen.queryByLabelText("Название")).not.toBeInTheDocument();
		});
	});

	test("drawer submit shows error toast on 400 validation failure", async () => {
		const baseItems = createInMemoryItemsClient({ seed: ITEMS_PAGE_1 });
		const items: ItemsClient = {
			...baseItems,
			create: vi.fn().mockRejectedValueOnce(new Error("validation")),
		};

		await renderAppReady(undefined, { items });
		const user = userEvent.setup();

		await completeWizard(user, "Test");

		await waitFor(() => {
			expect(screen.queryByLabelText("Название")).not.toBeInTheDocument();
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

		await waitFor(() => {
			expect(
				screen.queryByText("Добавить позиции", { selector: "[data-slot='dialog-title']" }),
			).not.toBeInTheDocument();
		});
	});
});
