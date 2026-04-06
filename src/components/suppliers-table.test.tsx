import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { _resetSupplierStore, _setSupplierMockDelay } from "@/data/supplier-mock-data";
import * as useIsMobileModule from "@/hooks/use-is-mobile";
import { makeSupplier } from "@/test-utils";

import { SuppliersTable } from "./suppliers-table";

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	_resetSupplierStore();
	_setSupplierMockDelay(0, 0);
});

afterEach(() => {
	_resetSupplierStore();
});

const defaultSuppliers = [
	makeSupplier("s1", {
		companyName: "ООО «Альфа»",
		status: "получено_кп",
		pricePerUnit: 1200,
		tco: 2700,
		rating: 85,
		email: "alfa@test.ru",
		website: "https://alfa.ru",
		deliveryCost: 1500,
		deferralDays: 30,
	}),
	makeSupplier("s2", {
		companyName: "ООО «Бета»",
		status: "ждем_ответа",
		email: "beta@test.ru",
		website: "https://beta.ru",
		deliveryCost: null,
		deferralDays: 0,
	}),
	makeSupplier("s3", {
		companyName: "ООО «Гамма»",
		status: "переговоры",
		email: "gamma@test.ru",
		website: "https://gamma.ru",
		deliveryCost: 0,
		deferralDays: 14,
	}),
];

function renderTable(props: Partial<React.ComponentProps<typeof SuppliersTable>> = {}) {
	const defaultProps: React.ComponentProps<typeof SuppliersTable> = {
		suppliers: defaultSuppliers,
		isLoading: false,
		search: "",
		onSearchChange: vi.fn(),
		sort: null,
		onSort: vi.fn(),
		activeStatuses: [],
		onStatusFilter: vi.fn(),
		selectedIds: new Set<string>(),
		onSelectionChange: vi.fn(),
		onArchive: vi.fn(),
		isArchiving: false,
		onArchiveSupplier: vi.fn(),
		showArchived: false,
		onToggleArchived: vi.fn(),
		onDelete: vi.fn(),
		isDeleting: false,
	};
	return render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<SuppliersTable {...defaultProps} {...props} />
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

describe("SuppliersTable", () => {
	test("renders all column headers", () => {
		renderTable();
		const headers = screen.getAllByRole("columnheader");
		const headerTexts = headers.map((h) => h.textContent?.trim());
		expect(headerTexts).toContain("КОМПАНИЯ");
		expect(headerTexts).toContain("САЙТ");
		expect(headerTexts).toContain("ДОСТАВКА");
		expect(headerTexts).toContain("ОТСРОЧКА");
		expect(headerTexts).toContain("ЦЕНА/ЕД.");
		expect(headerTexts).toContain("TCO");
	});

	test("renders supplier rows with company name and status badge", () => {
		renderTable();
		expect(screen.getByText("ООО «Альфа»")).toBeInTheDocument();
		expect(screen.getByText("ООО «Бета»")).toBeInTheDocument();
		expect(screen.getByText("ООО «Гамма»")).toBeInTheDocument();

		// Status badges
		expect(screen.getByText("Получено КП")).toBeInTheDocument();
		expect(screen.getByText("Ждём ответа")).toBeInTheDocument();
		expect(screen.getByText("Переговоры")).toBeInTheDocument();
	});

	test("shows formatted values for КП suppliers", () => {
		renderTable();
		const rows = screen.getAllByRole("row");
		// rows[0] is header, rows[1] is s1 (КП)
		const kpRow = rows[1];
		const cells = within(kpRow).getAllByRole("cell");

		// Price, TCO should contain ₽ (currency formatted)
		const priceCell = cells.find((c) => c.textContent?.includes("₽"));
		expect(priceCell).toBeTruthy();
		// Delivery and deferral
		const deliveryCell = cells.find((c) => c.textContent?.includes("₽") && c !== priceCell);
		expect(deliveryCell).toBeTruthy();
		const deferralCell = cells.find((c) => c.textContent?.match(/\d+\s*дн/));
		expect(deferralCell).toBeTruthy();
	});

	test("shows em-dash for non-КП suppliers' price and tco", () => {
		renderTable();
		const rows = screen.getAllByRole("row");
		// rows[2] is s2 (ждем_ответа) — non-КП
		const nonKpRow = rows[2];
		const cells = within(nonKpRow).getAllByRole("cell");

		// Price, TCO columns should contain em-dash
		const emDashCells = cells.filter((c) => c.textContent === "\u2014");
		expect(emDashCells.length).toBe(2);
	});

	test("renders website for each supplier", () => {
		renderTable();
		expect(screen.getByText("alfa.ru")).toBeInTheDocument();
		expect(screen.getByText("beta.ru")).toBeInTheDocument();
	});

	test("renders delivery and deferral values", () => {
		renderTable();
		// s2: deliveryCost=null → "Самовывоз", deferralDays=0 → "Предоплата"
		expect(screen.getByText("Самовывоз")).toBeInTheDocument();
		expect(screen.getByText("Предоплата")).toBeInTheDocument();
		// s3: deliveryCost=0 → "Включена"
		expect(screen.getByText("Включена")).toBeInTheDocument();
	});

	test("shows loading skeleton when isLoading is true", () => {
		renderTable({ suppliers: [], isLoading: true });
		const skeletons = document.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	test("shows empty state when no suppliers", () => {
		renderTable({ suppliers: [] });
		expect(screen.getByText(/нет поставщиков/i)).toBeInTheDocument();
	});
});

describe("SuppliersTable search", () => {
	test("renders search input with placeholder", () => {
		renderTable();
		expect(screen.getByPlaceholderText("Поиск…")).toBeInTheDocument();
	});

	test("calls onSearchChange on input", async () => {
		const user = userEvent.setup();
		const onSearchChange = vi.fn();
		renderTable({ onSearchChange });

		await user.type(screen.getByPlaceholderText("Поиск…"), "Альфа");
		// Debounced — onSearchChange called after 300ms
		await vi.waitFor(() => expect(onSearchChange).toHaveBeenCalledWith("Альфа"));
	});
});

describe("SuppliersTable sort", () => {
	test("sortable column headers have sort buttons", () => {
		renderTable();
		expect(screen.getByRole("button", { name: /Компания/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Цена\/ед/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /TCO/i })).toBeInTheDocument();
	});

	test("clicking sort button calls onSort with field name", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		renderTable({ onSort });

		await user.click(screen.getByRole("button", { name: /Компания/i }));
		expect(onSort).toHaveBeenCalledWith("companyName");
	});

	test("active sort shows direction icon", () => {
		renderTable({ sort: { field: "companyName", direction: "asc" } });
		const btn = screen.getByRole("button", { name: /Компания/i });
		// Should have an ArrowUp icon (not ArrowUpDown)
		expect(within(btn).getByTestId("sort-asc")).toBeInTheDocument();
	});

	test("descending sort shows down arrow", () => {
		renderTable({ sort: { field: "pricePerUnit", direction: "desc" } });
		const btn = screen.getByRole("button", { name: /Цена\/ед/i });
		expect(within(btn).getByTestId("sort-desc")).toBeInTheDocument();
	});
});

describe("SuppliersTable status filter", () => {
	test("renders filter button", () => {
		renderTable();
		expect(screen.getByRole("button", { name: "Фильтр по статусу" })).toBeInTheDocument();
	});

	test("shows indicator dot when filter is active", () => {
		renderTable({ activeStatuses: ["получено_кп"] });
		const btn = screen.getByRole("button", { name: "Фильтр по статусу" });
		expect(within(btn).getByTestId("filter-indicator")).toBeInTheDocument();
	});

	test("clicking filter button opens popover with status options", async () => {
		const user = userEvent.setup();
		renderTable();
		await user.click(screen.getByRole("button", { name: "Фильтр по статусу" }));
		// All 5 status labels should have corresponding filter buttons
		expect(screen.getByRole("button", { name: "Получено КП" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Ждём ответа" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Переговоры" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отказ" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Письмо не отправлено" })).toBeInTheDocument();
	});

	test("clicking status option calls onStatusFilter", async () => {
		const user = userEvent.setup();
		const onStatusFilter = vi.fn();
		renderTable({ onStatusFilter });
		await user.click(screen.getByRole("button", { name: "Фильтр по статусу" }));
		await user.click(screen.getByRole("button", { name: "Получено КП" }));
		expect(onStatusFilter).toHaveBeenCalledWith("получено_кп");
	});
});

describe("SuppliersTable multi-select", () => {
	test("renders checkbox in each row", () => {
		renderTable();
		// Header checkbox + 3 row checkboxes
		const checkboxes = screen.getAllByRole("checkbox");
		expect(checkboxes).toHaveLength(4);
	});

	test("clicking row checkbox calls onSelectionChange", async () => {
		const user = userEvent.setup();
		const onSelectionChange = vi.fn();
		renderTable({ onSelectionChange });

		const checkboxes = screen.getAllByRole("checkbox");
		// First row checkbox (index 1, index 0 is header)
		await user.click(checkboxes[1]);
		expect(onSelectionChange).toHaveBeenCalledWith("s1");
	});

	test("select-all checkbox calls onSelectionChange with 'all'", async () => {
		const user = userEvent.setup();
		const onSelectionChange = vi.fn();
		renderTable({ onSelectionChange });

		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[0]); // header checkbox
		expect(onSelectionChange).toHaveBeenCalledWith("all");
	});

	test("selected rows show checked checkbox", () => {
		renderTable({ selectedIds: new Set(["s1", "s3"]) });
		const checkboxes = screen.getAllByRole("checkbox");
		// s1 = index 1, s3 = index 3
		expect(checkboxes[1]).toHaveAttribute("data-state", "checked");
		expect(checkboxes[2]).not.toHaveAttribute("data-state", "checked");
		expect(checkboxes[3]).toHaveAttribute("data-state", "checked");
	});

	test("select-all shows checked when all selected", () => {
		renderTable({ selectedIds: new Set(["s1", "s2", "s3"]) });
		const checkboxes = screen.getAllByRole("checkbox");
		expect(checkboxes[0]).toHaveAttribute("data-state", "checked");
	});
});

describe("SuppliersTable row click", () => {
	test("clicking a row calls onRowClick with supplier id", async () => {
		const user = userEvent.setup();
		const onRowClick = vi.fn();
		renderTable({ onRowClick });

		const rows = screen.getAllByRole("row");
		await user.click(rows[1]); // first data row
		expect(onRowClick).toHaveBeenCalledWith("s1");
	});

	test("clicking checkbox does not trigger onRowClick", async () => {
		const user = userEvent.setup();
		const onRowClick = vi.fn();
		renderTable({ onRowClick });

		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[1]); // first row checkbox
		expect(onRowClick).not.toHaveBeenCalled();
	});
});

describe("SuppliersTable toolbar", () => {
	test("shows selection toolbar when items selected", () => {
		renderTable({ selectedIds: new Set(["s1"]) });
		expect(screen.getByText(/выбрано: 1/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument();
	});

	test("hides search/filter when selection toolbar is shown", () => {
		renderTable({ selectedIds: new Set(["s1"]) });
		expect(screen.queryByPlaceholderText("Поиск…")).not.toBeInTheDocument();
	});

	test("delete button shows confirmation dialog before deleting", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		renderTable({ selectedIds: new Set(["s1", "s2"]), onDelete });

		// Click delete — should open confirmation, not call onDelete yet
		await user.click(screen.getByRole("button", { name: /удалить/i }));
		expect(onDelete).not.toHaveBeenCalled();
		expect(screen.getByText("Удалить поставщиков?")).toBeInTheDocument();
		expect(screen.getByText(/будут удалены/)).toBeInTheDocument();

		// Confirm deletion
		await user.click(screen.getByRole("button", { name: "Удалить" }));
		expect(onDelete).toHaveBeenCalled();
	});

	test("delete confirmation can be cancelled", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		renderTable({ selectedIds: new Set(["s1"]), onDelete });

		await user.click(screen.getByRole("button", { name: /удалить/i }));
		expect(screen.getByText("Удалить поставщиков?")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Отмена" }));
		expect(onDelete).not.toHaveBeenCalled();
	});

	test("shows correct selected count", () => {
		renderTable({ selectedIds: new Set(["s1", "s2"]) });
		expect(screen.getByText(/выбрано: 2/i)).toBeInTheDocument();
	});
});

describe("SuppliersTable mobile cards", () => {
	let mobileSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mobileSpy = vi.spyOn(useIsMobileModule, "useIsMobile").mockReturnValue(true);
	});

	afterEach(() => {
		mobileSpy.mockRestore();
	});

	test("renders cards instead of table on mobile", () => {
		renderTable();
		// No table element
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		// Cards present
		const cards = screen.getAllByTestId("supplier-card");
		expect(cards).toHaveLength(3);
	});

	test("each card shows company name and status", () => {
		renderTable();
		const cards = screen.getAllByTestId("supplier-card");

		expect(within(cards[0]).getByText("ООО «Альфа»")).toBeInTheDocument();
		expect(within(cards[0]).getByText("Получено КП")).toBeInTheDocument();

		expect(within(cards[1]).getByText("ООО «Бета»")).toBeInTheDocument();
		expect(within(cards[1]).getByText("Ждём ответа")).toBeInTheDocument();
	});

	test("card shows formatted price, tco, delivery, and deferral for КП supplier", () => {
		renderTable();
		const cards = screen.getAllByTestId("supplier-card");
		const kpCard = cards[0]; // s1 has pricePerUnit=1200, tco=2700, deliveryCost=1500, deferralDays=30

		const priceTexts = within(kpCard).getAllByText(/₽/);
		expect(priceTexts.length).toBeGreaterThan(0);
		expect(within(kpCard).getByText(/30\s*дн/)).toBeInTheDocument();
	});

	test("card shows em-dash for missing price/tco and delivery/deferral labels", () => {
		renderTable();
		const cards = screen.getAllByTestId("supplier-card");
		const nonKpCard = cards[1]; // s2 has null price/tco, deliveryCost=null, deferralDays=0

		const dashes = within(nonKpCard).getAllByText("\u2014");
		expect(dashes.length).toBe(2); // price and tco
		expect(within(nonKpCard).getByText("Самовывоз")).toBeInTheDocument();
		expect(within(nonKpCard).getByText("Предоплата")).toBeInTheDocument();
	});

	test("clicking a card calls onRowClick", async () => {
		const user = userEvent.setup();
		const onRowClick = vi.fn();
		renderTable({ onRowClick });

		const cards = screen.getAllByTestId("supplier-card");
		await user.click(cards[0]);
		expect(onRowClick).toHaveBeenCalledWith("s1");
	});

	test("shows empty state on mobile", () => {
		renderTable({ suppliers: [] });
		expect(screen.getByText(/нет поставщиков/i)).toBeInTheDocument();
	});

	test("shows loading skeletons on mobile", () => {
		renderTable({ suppliers: [], isLoading: true });
		const skeletons = screen.getAllByTestId("supplier-card-skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	test("renders search input on mobile", () => {
		renderTable();
		expect(screen.getByPlaceholderText("Поиск…")).toBeInTheDocument();
	});
});

describe("SuppliersTable context menu", () => {
	test("right-clicking a row opens context menu with Архивировать", () => {
		renderTable();
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		expect(screen.getByText("Архивировать")).toBeInTheDocument();
	});

	test("clicking Архивировать calls onArchiveSupplier with supplier id", () => {
		const onArchiveSupplier = vi.fn();
		renderTable({ onArchiveSupplier });
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		fireEvent.click(screen.getByText("Архивировать"));
		expect(onArchiveSupplier).toHaveBeenCalledWith("s1");
	});
});

describe("SuppliersTable archive filter toggle", () => {
	test("archive toggle button is present in toolbar", () => {
		renderTable();
		expect(screen.getByRole("button", { name: "Архив" })).toBeInTheDocument();
	});

	test("archive toggle shows pressed state when showArchived is true", () => {
		renderTable({ showArchived: true });
		expect(screen.getByRole("button", { name: "Архив" })).toHaveAttribute("aria-pressed", "true");
	});

	test("archive toggle shows unpressed state when showArchived is false", () => {
		renderTable({ showArchived: false });
		expect(screen.getByRole("button", { name: "Архив" })).toHaveAttribute("aria-pressed", "false");
	});

	test("clicking archive toggle calls onToggleArchived", async () => {
		const user = userEvent.setup();
		const onToggleArchived = vi.fn();
		renderTable({ onToggleArchived });
		await user.click(screen.getByRole("button", { name: "Архив" }));
		expect(onToggleArchived).toHaveBeenCalled();
	});
});
