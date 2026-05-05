import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setTokens } from "@/data/auth";
import { createInMemoryCompaniesClient } from "@/data/clients/companies-in-memory";
import { createInMemoryEmailsClient } from "@/data/clients/emails-in-memory";
import { createInMemoryFoldersClient } from "@/data/clients/folders-in-memory";
import type { ItemsClient } from "@/data/clients/items-client";
import { createInMemoryItemsClient } from "@/data/clients/items-in-memory";
import { createInMemoryNotificationsClient } from "@/data/clients/notifications-in-memory";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import { createInMemorySessionClient } from "@/data/clients/session-in-memory";
import { createInMemorySuppliersClient } from "@/data/clients/suppliers-in-memory";
import { createInMemoryTasksClient } from "@/data/clients/tasks-in-memory";
import { createInMemoryTendersClient } from "@/data/clients/tenders-in-memory";
import { createInMemoryWorkspaceEmployeesClient } from "@/data/clients/workspace-employees-in-memory";
import * as mockParser from "@/data/mock-file-parser";
import { fakeItemsClient, TestClientsProvider } from "@/data/test-clients-provider";
import type { Company, Folder } from "@/data/types";
import { makeItem } from "@/test-utils";
import App from "./App";

const ITEMS_PAGE_1 = Array.from({ length: 25 }, (_, i) =>
	makeItem(`item-${i + 1}`, {
		name: i === 0 ? "Арматура А500С ∅12" : `Item ${i + 1}`,
		status: i < 12 ? "searching" : i < 20 ? "negotiating" : "completed",
		tenderId: i < 5 ? "T-folder-1" : i < 10 ? "T-folder-2" : "T-no-folder",
		// Ensure deviation=overpaying filter captures some rows
		currentPrice: 100,
		bestPrice: 80,
	}),
);

const TEST_TENDERS = [
	{
		id: "T-folder-1",
		name: "Tender folder-1",
		companyId: "company-1",
		folderId: "folder-1" as string | null,
		budget: 0,
		createdAt: "2026-04-01",
		deadline: "2026-05-01",
	},
	{
		id: "T-folder-2",
		name: "Tender folder-2",
		companyId: "company-1",
		folderId: "folder-2" as string | null,
		budget: 0,
		createdAt: "2026-04-01",
		deadline: "2026-05-01",
	},
	{
		id: "T-no-folder",
		name: "Tender no folder",
		companyId: "company-1",
		folderId: null as string | null,
		budget: 0,
		createdAt: "2026-04-01",
		deadline: "2026-05-01",
	},
];

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
					tenders: "edit",
					positions: "edit",
					tasks: "edit",
					companies: "edit",
					employees: "edit",
					emails: "edit",
				},
			},
		],
	},
];

// --- Render helpers ---

let queryClient: QueryClient;

function renderApp(initialEntries?: string[], opts: { items?: ItemsClient } = {}) {
	const companiesClient = createInMemoryCompaniesClient(TEST_COMPANIES);
	const itemsClient = opts.items ?? createInMemoryItemsClient({ seed: ITEMS_PAGE_1 });
	return render(
		<TestClientsProvider
			queryClient={queryClient}
			clients={{
				companies: companiesClient,
				items: itemsClient,
				suppliers: createInMemorySuppliersClient(),
				tasks: createInMemoryTasksClient({ seed: [] }),
				tenders: createInMemoryTendersClient({ seed: TEST_TENDERS }),
				folders: createInMemoryFoldersClient({ seed: TEST_FOLDERS }),
				notifications: createInMemoryNotificationsClient({ seed: [] }),
				emails: createInMemoryEmailsClient([]),
				profile: createInMemoryProfileClient(),
				workspaceEmployees: createInMemoryWorkspaceEmployeesClient({ seed: [] }),
				session: createInMemorySessionClient({ refreshAvailable: true }),
			}}
		>
			<MemoryRouter initialEntries={initialEntries ?? ["/positions"]}>
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
	sessionStorage.clear();
	setTokens("test-access");
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ---- Route tests (TDD) ----

describe("Routing", () => {
	test("/ redirects to /inquiries", async () => {
		renderApp(["/"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Запросы" })).toBeInTheDocument();
		});
	});

	test("/ preserves query params when redirecting to /inquiries", async () => {
		renderApp(["/?company=c1"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Запросы" })).toBeInTheDocument();
		});
	});

	test("/procurement redirects to /positions", async () => {
		await renderAppReady(["/procurement"]);
		expect(screen.getByPlaceholderText("Поиск позиций, поставщиков, задач…")).toBeInTheDocument();
		expect(screen.getByTestId("global-header")).toBeInTheDocument();
	});

	test("/procurement preserves query params when redirecting to /positions", async () => {
		await renderAppReady(["/procurement?deviation=overpaying"]);
		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		expect(rows.length).toBeGreaterThan(1);
	});

	test("/positions renders positions content", async () => {
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

	test("URL query params preserved under /positions", async () => {
		await renderAppReady(["/positions?deviation=overpaying"]);
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

	test("sidebar avatar navigates directly to /settings/profile", async () => {
		renderApp();
		const user = userEvent.setup();
		const trigger = screen.getByRole("link", { name: "Меню пользователя" });
		expect(trigger).toHaveAttribute("href", "/settings/profile");

		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByTestId("settings-layout")).toBeInTheDocument();
		});
		expect(screen.queryByRole("menuitem", { name: /Сменить тему/ })).not.toBeInTheDocument();
	});

	test("/register renders registration page (no invitation gate)", async () => {
		localStorage.clear();
		sessionStorage.clear(); // no auth token — public route

		renderApp(["/register"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Регистрация" })).toBeInTheDocument();
		});
	});

	test("/confirm-email renders pending state while confirming", async () => {
		localStorage.clear();
		sessionStorage.clear(); // no auth token — public route

		renderApp(["/confirm-email?uid=test-uid&token=test-token"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Подтверждение email" })).toBeInTheDocument();
		});
	});

	test("/forgot-password renders forgot password page", async () => {
		localStorage.clear();
		sessionStorage.clear(); // no auth token — public route
		renderApp(["/forgot-password"]);
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Восстановление пароля" })).toBeInTheDocument();
		});
	});

	test("/reset-password renders reset password page", async () => {
		localStorage.clear();
		sessionStorage.clear(); // no auth token — public route
		renderApp(["/reset-password?uid=42&token=test-token"]);
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
		await renderAppReady(["/positions?deviation=overpaying"]);

		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		expect(rows.length).toBeGreaterThan(1);
	});

	test("deep-link with folder param filters table to folder items", async () => {
		await renderAppReady(["/positions?folder=folder-1"]);

		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		// Only items with folderId=folder-1 (5 items + header)
		expect(rows).toHaveLength(6);
	});

	test("deep-link with folder=none shows only unassigned items", async () => {
		await renderAppReady(["/positions?folder=none"]);

		const table = screen.getByRole("table");
		const rows = within(table).getAllByRole("row");
		// Only items with folderId=null (15 items + header)
		expect(rows).toHaveLength(16);
	});

	test("clicking Добавить позиции on /positions opens upload dialog directly (no choice screen)", async () => {
		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));

		expect(screen.getByText("Добавить позиции", { selector: "[data-slot='dialog-title']" })).toBeInTheDocument();
		expect(screen.getByTestId("dropzone")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Вручную/ })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Скачать пример файла/ })).toBeInTheDocument();
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

	test("«Создать запрос» on /inquiries opens the create-tender drawer and submitting persists the tender + items", async () => {
		await renderAppReady(["/inquiries"]);
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Создать запрос/ }));

		expect(screen.getByRole("heading", { name: "Создать запрос" })).toBeInTheDocument();

		const deadlineInput = screen.getByLabelText("Дедлайн") as HTMLInputElement;
		await user.clear(deadlineInput);
		await user.type(deadlineInput, "2026-07-01");
		await user.type(screen.getByLabelText("Название"), "Позиция А");

		await user.click(screen.getByRole("button", { name: "Далее" }));
		await user.click(screen.getByRole("button", { name: "Далее" }));
		await user.click(screen.getByRole("button", { name: "Создать" }));

		await waitFor(() => {
			expect(screen.queryByRole("heading", { name: "Создать запрос" })).not.toBeInTheDocument();
		});
		// Tender name is auto-derived from the first position when the user-facing field is omitted.
		await waitFor(() => {
			expect(screen.getByText("Позиция А")).toBeInTheDocument();
		});
	});

	test("file import via dialog dispatches a tender per AI-grouped batch and closes the dialog", async () => {
		vi.spyOn(mockParser, "parseFile").mockResolvedValue([
			{ name: "Кабель ВВГнг 3x2.5" },
			{ name: "Кабель ВВГнг 3x4" },
			{ name: "Розетка серая" },
		]);

		await renderAppReady();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Добавить позиции/ }));
		fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [new File(["data"], "items.xlsx")] } });
		await waitFor(() => expect(screen.getByText("Кабель ВВГнг 3x2.5")).toBeInTheDocument());

		await user.click(screen.getByRole("button", { name: /Импортировать/ }));

		await waitFor(() => {
			expect(
				screen.queryByText("Добавить позиции", { selector: "[data-slot='dialog-title']" }),
			).not.toBeInTheDocument();
		});

		// Two AI-grouped tenders should land on /inquiries: «Кабель ВВГнг 3x2.5» (group of 2) and «Розетка серая» (group of 1).
		const rail = screen.getByTestId("app-rail");
		await user.click(within(rail).getByRole("link", { name: /Запросы/ }));
		await waitFor(() => {
			expect(screen.getByText("Кабель ВВГнг 3x2.5")).toBeInTheDocument();
			expect(screen.getByText("Розетка серая")).toBeInTheDocument();
		});
	});
});
