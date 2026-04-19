import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SearchSupplier } from "@/data/search-supplier-types";
import { SearchSuppliersTable } from "./search-suppliers-table";

function makeEntry(id: string, overrides: Partial<SearchSupplier> = {}): SearchSupplier {
	return {
		id,
		itemId: "item-1",
		companyName: `Компания ${id}`,
		inn: "0000000000",
		website: "https://example.ru",
		companyType: "производитель",
		region: "Москва",
		foundedYear: 2005,
		revenue: 100_000_000,
		requestStatus: "new",
		archived: false,
		...overrides,
	};
}

function renderTable(overrides: Partial<React.ComponentProps<typeof SearchSuppliersTable>> = {}) {
	const defaults: React.ComponentProps<typeof SearchSuppliersTable> = {
		entries: [
			makeEntry("1", { companyName: "Альфа", foundedYear: 2001, revenue: 50_000_000 }),
			makeEntry("2", { companyName: "Бета", foundedYear: 2010, revenue: 800_000_000, companyType: "дилер" }),
			makeEntry("3", {
				companyName: "Гамма",
				foundedYear: 2018,
				revenue: 2_500_000_000,
				companyType: "дистрибьютор",
				requestStatus: "requested",
			}),
		],
		isLoading: false,
		search: "",
		onSearchChange: vi.fn(),
		sort: null,
		onSort: vi.fn(),
		activeCompanyTypes: [],
		onCompanyTypeFilter: vi.fn(),
		activeRequestStatuses: [],
		onRequestStatusFilter: vi.fn(),
		selectedIds: new Set(),
		onSelectionChange: vi.fn(),
		onArchive: vi.fn(),
		isArchiving: false,
		onArchiveEntry: vi.fn(),
		onUnarchiveEntry: vi.fn(),
		onSendRequest: vi.fn(),
		onSendRequestBatch: vi.fn(),
		showArchived: false,
		onToggleArchived: vi.fn(),
	};
	return render(
		<TooltipProvider>
			<SearchSuppliersTable {...defaults} {...overrides} />
		</TooltipProvider>,
	);
}

describe("SearchSuppliersTable", () => {
	test("renders column headers in order", () => {
		renderTable();
		const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
		expect(headers[1]).toBe("КОМПАНИЯ");
		expect(headers[2]).toBe("САЙТ");
		expect(headers[3]).toBe("ТИП");
		expect(headers[4]).toBe("РЕГИОН");
		expect(headers[5]).toBe("ГОД ОСНОВАНИЯ");
		expect(headers[6]).toBe("ВЫРУЧКА");
	});

	test("sortable columns are Компания, Год основания, Выручка", () => {
		renderTable();
		expect(screen.getByRole("button", { name: /Компания/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Год основания/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Выручка/i })).toBeInTheDocument();
		// ТИП and РЕГИОН columns render as plain headers, not sort buttons
		const typHeader = screen.getByRole("columnheader", { name: "ТИП" });
		expect(typHeader.querySelector("button")).toBeNull();
		const regionHeader = screen.getByRole("columnheader", { name: "РЕГИОН" });
		expect(regionHeader.querySelector("button")).toBeNull();
	});

	test("clicking a sortable header fires onSort with the field", async () => {
		const onSort = vi.fn();
		const user = userEvent.setup();
		renderTable({ onSort });
		await user.click(screen.getByRole("button", { name: /Выручка/i }));
		expect(onSort).toHaveBeenCalledWith("revenue");
	});

	test("shows ИНН below company name", () => {
		renderTable({ entries: [makeEntry("x", { companyName: "ТестКомп", inn: "1234567890" })] });
		expect(screen.getByText("ТестКомп")).toBeInTheDocument();
		expect(screen.getByText("ИНН 1234567890")).toBeInTheDocument();
	});

	test("Сайт cell is a link with target=_blank + rel=noopener noreferrer", () => {
		renderTable({ entries: [makeEntry("x", { website: "https://example.ru" })] });
		const link = screen.getByRole("link", { name: /example\.ru/ });
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
		expect(link).toHaveAttribute("href", "https://example.ru");
	});

	test("Выручка renders via formatCompactRuble", () => {
		renderTable({ entries: [makeEntry("x", { revenue: 2_500_000_000 })] });
		expect(screen.getByText(/млрд/)).toBeInTheDocument();
	});

	test("new-status row shows «Отправить запрос» button; requested row shows «Запрошен» badge", () => {
		renderTable({
			entries: [makeEntry("new", { requestStatus: "new" }), makeEntry("req", { requestStatus: "requested" })],
		});
		expect(screen.getByTestId("send-request-new")).toBeInTheDocument();
		expect(screen.getByTestId("send-request-requested-req")).toBeInTheDocument();
		expect(screen.getByTestId("send-request-requested-req")).toHaveTextContent("Запрошен");
	});

	test("clicking «Отправить запрос» fires onSendRequest with id", async () => {
		const onSendRequest = vi.fn();
		const user = userEvent.setup();
		renderTable({ onSendRequest });
		await user.click(screen.getByTestId("send-request-1"));
		expect(onSendRequest).toHaveBeenCalledWith("1");
	});

	test("row click is a no-op (no onRowClick)", async () => {
		const onSelectionChange = vi.fn();
		const user = userEvent.setup();
		renderTable({ onSelectionChange });
		const rows = screen.getAllByRole("row").slice(1);
		await user.click(rows[0]);
		// Row click does not toggle selection
		expect(onSelectionChange).not.toHaveBeenCalled();
	});

	test("selection via row checkbox fires onSelectionChange with id", async () => {
		const onSelectionChange = vi.fn();
		const user = userEvent.setup();
		renderTable({ onSelectionChange });
		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[1]);
		expect(onSelectionChange).toHaveBeenCalledWith("1");
	});

	test("header checkbox fires onSelectionChange('all')", async () => {
		const onSelectionChange = vi.fn();
		const user = userEvent.setup();
		renderTable({ onSelectionChange });
		await user.click(screen.getByRole("checkbox", { name: "Выбрать все" }));
		expect(onSelectionChange).toHaveBeenCalledWith("all");
	});

	test("toolbar shows search input + filter + download + archive toggle", () => {
		renderTable();
		expect(screen.getByPlaceholderText("Поиск…")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Фильтры" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Скачать таблицу" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Архив" })).toBeInTheDocument();
	});

	test("archive toggle aria-pressed reflects showArchived", () => {
		renderTable({ showArchived: true });
		expect(screen.getByRole("button", { name: "Архив" })).toHaveAttribute("aria-pressed", "true");
	});

	test("archive toggle onClick fires onToggleArchived", async () => {
		const onToggleArchived = vi.fn();
		const user = userEvent.setup();
		renderTable({ onToggleArchived });
		await user.click(screen.getByRole("button", { name: "Архив" }));
		expect(onToggleArchived).toHaveBeenCalled();
	});

	test("filter popover lists all three Тип toggles and fires onCompanyTypeFilter", async () => {
		const onCompanyTypeFilter = vi.fn();
		const user = userEvent.setup();
		renderTable({ onCompanyTypeFilter });
		await user.click(screen.getByRole("button", { name: "Фильтры" }));
		expect(screen.getByRole("button", { name: "Производитель" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Дилер" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Дистрибьютор" })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Дилер" }));
		expect(onCompanyTypeFilter).toHaveBeenCalledWith("дилер");
	});

	test("filter popover lists Статус запроса toggles and fires onRequestStatusFilter", async () => {
		const onRequestStatusFilter = vi.fn();
		const user = userEvent.setup();
		renderTable({ onRequestStatusFilter });
		await user.click(screen.getByRole("button", { name: "Фильтры" }));
		expect(screen.getByRole("button", { name: "Новый" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Запрошен" })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Запрошен" }));
		expect(onRequestStatusFilter).toHaveBeenCalledWith("requested");
	});

	test("active type filter shows dot indicator on trigger", () => {
		renderTable({ activeCompanyTypes: ["дилер"] });
		expect(screen.getByTestId("filter-indicator")).toBeInTheDocument();
	});

	test("active request-status filter shows dot indicator on trigger", () => {
		renderTable({ activeRequestStatuses: ["requested"] });
		expect(screen.getByTestId("filter-indicator")).toBeInTheDocument();
	});

	test("selection-active toolbar shows count + Архивировать + Отправить запрос", () => {
		renderTable({ selectedIds: new Set(["1", "2"]) });
		const label = screen.getByText("Выбрано: 2");
		const toolbar = label.parentElement as HTMLElement;
		expect(within(toolbar).getByRole("button", { name: "Архивировать" })).toBeInTheDocument();
		expect(within(toolbar).getByRole("button", { name: /Отправить запрос/ })).toBeInTheDocument();
	});

	test("selection-active toolbar hides «Отправить запрос» in archive view", () => {
		renderTable({ selectedIds: new Set(["1"]), showArchived: true });
		const label = screen.getByText("Выбрано: 1");
		const toolbar = label.parentElement as HTMLElement;
		expect(within(toolbar).getByRole("button", { name: "Архивировать" })).toBeInTheDocument();
		expect(within(toolbar).queryByRole("button", { name: /Отправить запрос/ })).not.toBeInTheDocument();
	});

	test("context menu in archive view shows Убрать из архива", async () => {
		const onUnarchiveEntry = vi.fn();
		renderTable({ showArchived: true, onUnarchiveEntry });
		const rows = screen.getAllByRole("row").slice(1);
		fireEvent.contextMenu(rows[0]);
		const menuitem = await screen.findByRole("menuitem", { name: /Убрать из архива/ });
		expect(menuitem).toBeInTheDocument();
	});

	test("context menu outside archive view shows Архивировать", async () => {
		renderTable();
		const rows = screen.getAllByRole("row").slice(1);
		fireEvent.contextMenu(rows[0]);
		const menuitem = await screen.findByRole("menuitem", { name: /Архивировать/ });
		expect(menuitem).toBeInTheDocument();
	});

	test("empty archive view shows «В архиве пусто»", () => {
		renderTable({ entries: [], showArchived: true });
		expect(screen.getByText("В архиве пусто")).toBeInTheDocument();
	});

	test("loading state renders skeleton rows", () => {
		const { container } = renderTable({ entries: [], isLoading: true });
		expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
	});
});
