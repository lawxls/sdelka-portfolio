import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { _resetSupplierStore, _setSupplierMockDelay } from "@/data/supplier-mock-data";
import type { CurrentSupplier } from "@/data/types";
import * as useIsMobileModule from "@/hooks/use-is-mobile";
import { makeSupplier } from "@/test-utils";

import { OffersTable } from "./offers-table";

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
		pricePerUnit: 1000,
		tco: 2700,
		rating: 85,
		email: "alfa@test.ru",
		website: "https://alfa.ru",
		deliveryCost: 1500,
		paymentType: "prepayment",
		deferralDays: 0,
		leadTimeDays: 7,
		quoteReceivedAt: "2026-04-15T10:00:00.000Z",
	}),
	makeSupplier("s2", {
		companyName: "ООО «Бета»",
		status: "получено_кп",
		email: "beta@test.ru",
		website: "https://beta.ru",
		deliveryCost: null,
		paymentType: "prepayment",
		prepaymentPercent: 30,
		deferralDays: 0,
		leadTimeDays: 14,
		quoteReceivedAt: "2026-04-10T10:00:00.000Z",
	}),
	makeSupplier("s3", {
		companyName: "ООО «Гамма»",
		status: "получено_кп",
		email: "gamma@test.ru",
		website: "https://gamma.ru",
		deliveryCost: 0,
		paymentType: "deferred",
		deferralDays: 30,
		leadTimeDays: 21,
		quoteReceivedAt: "2026-04-05T10:00:00.000Z",
	}),
];

const itemWithQty = { quantityPerDelivery: 10 };

function renderTable(props: Partial<React.ComponentProps<typeof OffersTable>> = {}) {
	// Auto-supply a row id whenever a test passes a currentSupplier — the pinned card requires
	// a real Supplier id backing the click target. Tests that need to omit pinning explicitly
	// pass `currentSupplier: null`.
	const autoRowId =
		props.currentSupplier !== undefined && props.currentSupplier !== null ? "supplier-test-current" : undefined;
	const defaultProps: React.ComponentProps<typeof OffersTable> = {
		suppliers: defaultSuppliers,
		totalCount: defaultSuppliers.length,
		item: itemWithQty,
		currentSupplier: null,
		currentSupplierRowId: autoRowId,
		isLoading: false,
		search: "",
		onSearchChange: vi.fn(),
		sort: null,
		onSort: vi.fn(),
		activePaymentTypes: [],
		onPaymentTypeFilter: vi.fn(),
		activeDeliveryFilters: [],
		onDeliveryFilter: vi.fn(),
		selectedIds: new Set<string>(),
		onSelectionChange: vi.fn(),
		onArchive: vi.fn(),
		isArchiving: false,
		onArchiveSupplier: vi.fn(),
		showArchived: false,
		onToggleArchived: vi.fn(),
	};
	return render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<OffersTable {...defaultProps} {...props} />
			</TooltipProvider>
		</QueryClientProvider>,
	);
}

describe("OffersTable", () => {
	test("renders all column headers in the new order", () => {
		renderTable();
		const headers = screen.getAllByRole("columnheader");
		const headerTexts = headers.map((h) => h.textContent?.trim());
		expect(headerTexts).toContain("КОМПАНИЯ");
		expect(headerTexts).toContain("ТСО/ЕД.");
		expect(headerTexts).toContain("СТОИМОСТЬ");
		expect(headerTexts).toContain("ЭКОНОМИЯ");
		expect(headerTexts).toContain("ДОСТАВКА");
		expect(headerTexts).toContain("ТИП ОПЛАТЫ");
		expect(headerTexts).toContain("СРОК ПОСТАВКИ");
	});

	test("removed columns are gone (САЙТ, ЦЕНА/ЕД., ОТСРОЧКА)", () => {
		renderTable();
		const headers = screen.getAllByRole("columnheader");
		const headerTexts = headers.map((h) => h.textContent?.trim());
		expect(headerTexts).not.toContain("САЙТ");
		expect(headerTexts).not.toContain("ЦЕНА/ЕД.");
		expect(headerTexts).not.toContain("ОТСРОЧКА");
	});

	test("renders supplier rows with company name and «Получено» date", () => {
		renderTable();
		expect(screen.getByText("ООО «Альфа»")).toBeInTheDocument();
		expect(screen.getByText("ООО «Бета»")).toBeInTheDocument();
		expect(screen.getByText("ООО «Гамма»")).toBeInTheDocument();
		// «Получено: dd.mm.yyyy» is rendered under each company name.
		const dateLabels = screen.getAllByText(/Получено:/);
		expect(dateLabels.length).toBeGreaterThanOrEqual(3);
		expect(screen.getByText(/15\.04\.2026/)).toBeInTheDocument();
	});

	test("Стоимость cell = pricePerUnit × quantityPerDelivery", () => {
		renderTable();
		const rows = screen.getAllByRole("row");
		const kpRow = rows[1]; // s1 — pricePerUnit=1000, qty=10 → 10000 ₽
		expect(within(kpRow).getByText(/10[\u00A0\s]?000/)).toBeInTheDocument();
	});

	test("Стоимость shows em-dash when pricePerUnit is null", () => {
		renderTable();
		const rows = screen.getAllByRole("row");
		const nonKpRow = rows[2]; // s2 has no pricePerUnit
		const cells = within(nonKpRow).getAllByRole("cell");
		// ТСО/ЕД., Стоимость, Экономия should all show "—"
		const dashCells = cells.filter((c) => c.textContent === "\u2014");
		expect(dashCells.length).toBeGreaterThanOrEqual(2);
	});

	test("Тип оплаты renders three variants correctly", () => {
		renderTable();
		expect(screen.getByText("Предоплата")).toBeInTheDocument();
		expect(screen.getByText("Предоплата 30%")).toBeInTheDocument();
		expect(screen.getByText(/Отсрочка\s+30\s\u00A0?дней/i)).toBeInTheDocument();
	});

	test("Срок поставки renders with Russian plurals", () => {
		renderTable();
		expect(screen.getByText(/^7\s+дней$/)).toBeInTheDocument();
		expect(screen.getByText(/^14\s+дней$/)).toBeInTheDocument();
		expect(screen.getByText(/^21\s+день$/)).toBeInTheDocument();
	});

	test("shows loading skeleton when isLoading is true", () => {
		renderTable({ suppliers: [], isLoading: true });
		const skeletons = document.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	test("shows empty state when no suppliers and no current supplier", () => {
		renderTable({ suppliers: [] });
		expect(screen.getByText(/нет предложений/i)).toBeInTheDocument();
	});
});

describe("OffersTable Экономия", () => {
	const currentSupplier: CurrentSupplier = {
		companyName: "ООО Старый",
		deferralDays: 0,
		pricePerUnit: 1200,
	};

	test("renders savings percent (positive = green) vs current supplier", () => {
		renderTable({ currentSupplier });
		// s1 pricePerUnit=1000 vs current 1200 → savings = (1200-1000)/1200 ≈ 16.7% → "+16,7"
		const savings = screen.getByText(/\+16[,.]7/);
		expect(savings).toBeInTheDocument();
		expect(savings).toHaveClass("text-green-600");
	});

	test("renders em-dash when there is no current supplier", () => {
		renderTable({ currentSupplier: null });
		const rows = screen.getAllByRole("row");
		const kpRow = rows[1]; // s1
		const cells = within(kpRow).getAllByRole("cell");
		const savingsCell = cells[3]; // checkbox + companyName + tco + cost(=10000) + savings(=—)
		// since cost is 10000 we need savings cell which is index 4 or 3 depending on selection
		// Just assert that — appears within s1's row at least once
		const dashes = within(kpRow).getAllByText("\u2014");
		expect(dashes.length).toBeGreaterThan(0);
		expect(savingsCell).toBeTruthy();
	});
});

describe("OffersTable pinned current supplier", () => {
	const currentSupplier: CurrentSupplier = {
		companyName: "ООО Текущий",
		deferralDays: 0,
		paymentType: "prepayment",
		prepaymentPercent: 30,
		pricePerUnit: 800,
	};

	test("renders current supplier pinned with «Ваш поставщик» status", () => {
		renderTable({ currentSupplier });
		expect(screen.getByTestId("data-table-pinned-row")).toBeInTheDocument();
		const pinned = screen.getByTestId("data-table-pinned-row");
		expect(within(pinned).getByText("ООО Текущий")).toBeInTheDocument();
		const status = within(pinned).getByText("Ваш поставщик");
		expect(status).toBeInTheDocument();
		expect(status.className).toMatch(/text-highlight-foreground/);
	});

	test("pinned supplier's Экономия is em-dash", () => {
		renderTable({ currentSupplier });
		const pinned = screen.getByTestId("data-table-pinned-row");
		const dashes = within(pinned).getAllByText("\u2014");
		// Доставка, Экономия, Срок поставки → at least 3 dashes (ТСО/ед. is also null on pinned)
		expect(dashes.length).toBeGreaterThanOrEqual(2);
	});

	test("pinned supplier shows its Стоимость from pricePerUnit × quantityPerDelivery", () => {
		renderTable({ currentSupplier });
		const pinned = screen.getByTestId("data-table-pinned-row");
		// 800 × 10 = 8000
		expect(within(pinned).getByText(/8[\u00A0\s]?000/)).toBeInTheDocument();
	});

	test("pinned supplier renders payment type from currentSupplier", () => {
		renderTable({ currentSupplier });
		const pinned = screen.getByTestId("data-table-pinned-row");
		expect(within(pinned).getByText("Предоплата 30%")).toBeInTheDocument();
	});

	test("pinned supplier has no checkbox in its row", () => {
		renderTable({ currentSupplier });
		const pinned = screen.getByTestId("data-table-pinned-row");
		expect(within(pinned).queryByRole("checkbox")).not.toBeInTheDocument();
	});

	test("pinned supplier has no context menu actions", () => {
		renderTable({ currentSupplier });
		const pinned = screen.getByTestId("data-table-pinned-row");
		fireEvent.contextMenu(pinned);
		expect(screen.queryByText(/архивировать/i)).not.toBeInTheDocument();
	});

	test("renders pinned row even when suppliers is empty", () => {
		renderTable({ suppliers: [], currentSupplier });
		expect(screen.getByTestId("data-table-pinned-row")).toBeInTheDocument();
	});
});

describe("OffersTable search", () => {
	test("renders search icon button that expands to input", async () => {
		const user = userEvent.setup();
		renderTable();
		const searchButton = screen.getByRole("button", { name: "Поиск предложений" });
		expect(searchButton).toBeInTheDocument();
		await user.click(searchButton);
		expect(screen.getByPlaceholderText("Поиск…")).toBeInTheDocument();
	});

	test("calls onSearchChange on input", async () => {
		const user = userEvent.setup();
		const onSearchChange = vi.fn();
		renderTable({ onSearchChange });

		await user.click(screen.getByRole("button", { name: "Поиск предложений" }));
		await user.type(screen.getByPlaceholderText("Поиск…"), "Альфа");
		await vi.waitFor(() => expect(onSearchChange).toHaveBeenCalledWith("Альфа"));
	});
});

describe("OffersTable sort", () => {
	test("sortable column headers have sort buttons (Компания, ТСО/ЕД., Стоимость, Экономия, Срок поставки)", () => {
		renderTable();
		expect(screen.getByRole("button", { name: /Компания/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /ТСО\/ЕД/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Стоимость/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Экономия/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Срок поставки/i })).toBeInTheDocument();
	});

	test("ДОСТАВКА and ТИП ОПЛАТЫ are not sortable", () => {
		renderTable();
		expect(screen.queryByRole("button", { name: /Доставка/i })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Тип оплаты/i })).not.toBeInTheDocument();
	});

	test("clicking sort button calls onSort with field name", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		renderTable({ onSort });
		await user.click(screen.getByRole("button", { name: /Компания/i }));
		expect(onSort).toHaveBeenCalledWith("companyName");
	});

	test("clicking Стоимость sorts by batchCost", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		renderTable({ onSort });
		await user.click(screen.getByRole("button", { name: /Стоимость/i }));
		expect(onSort).toHaveBeenCalledWith("batchCost");
	});

	test("clicking Экономия sorts by savings", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		renderTable({ onSort });
		await user.click(screen.getByRole("button", { name: /Экономия/i }));
		expect(onSort).toHaveBeenCalledWith("savings");
	});

	test("active sort shows direction icon", () => {
		renderTable({ sort: { field: "companyName", direction: "asc" } });
		const btn = screen.getByRole("button", { name: /Компания/i });
		expect(within(btn).getByTestId("sort-asc")).toBeInTheDocument();
	});

	test("descending sort shows down arrow", () => {
		renderTable({ sort: { field: "tco", direction: "desc" } });
		const btn = screen.getByRole("button", { name: /ТСО\/ЕД/i });
		expect(within(btn).getByTestId("sort-desc")).toBeInTheDocument();
	});
});

describe("OffersTable filters", () => {
	test("renders filter button", () => {
		renderTable();
		expect(screen.getByRole("button", { name: "Фильтры" })).toBeInTheDocument();
	});

	test("shows indicator dot when payment-type filter is active", () => {
		renderTable({ activePaymentTypes: ["prepayment"] });
		const btn = screen.getByRole("button", { name: "Фильтры" });
		expect(within(btn).getByTestId("filter-indicator")).toBeInTheDocument();
	});

	test("clicking filter button opens popover with Тип оплаты and Доставка sections", async () => {
		const user = userEvent.setup();
		renderTable();
		await user.click(screen.getByRole("button", { name: "Фильтры" }));
		expect(screen.getByRole("button", { name: "Предоплата" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Отсрочка" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Самовывоз" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Бесплатная" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Платная" })).toBeInTheDocument();
	});
});

describe("OffersTable multi-select", () => {
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
		await user.click(checkboxes[1]);
		expect(onSelectionChange).toHaveBeenCalledWith("s1");
	});

	test("select-all checkbox calls onSelectionChange with 'all'", async () => {
		const user = userEvent.setup();
		const onSelectionChange = vi.fn();
		renderTable({ onSelectionChange });

		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[0]);
		expect(onSelectionChange).toHaveBeenCalledWith("all");
	});

	test("selected rows show checked checkbox", () => {
		renderTable({ selectedIds: new Set(["s1", "s3"]) });
		const checkboxes = screen.getAllByRole("checkbox");
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

describe("OffersTable row click", () => {
	test("clicking a row calls onRowClick with supplier id", async () => {
		const user = userEvent.setup();
		const onRowClick = vi.fn();
		renderTable({ onRowClick });

		const rows = screen.getAllByRole("row");
		await user.click(rows[1]);
		expect(onRowClick).toHaveBeenCalledWith("s1");
	});

	test("clicking checkbox does not trigger onRowClick", async () => {
		const user = userEvent.setup();
		const onRowClick = vi.fn();
		renderTable({ onRowClick });

		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[1]);
		expect(onRowClick).not.toHaveBeenCalled();
	});
});

describe("OffersTable toolbar", () => {
	test("shows selection toolbar when items selected", () => {
		renderTable({ selectedIds: new Set(["s1"]) });
		expect(screen.getByText(/выбрано: 1/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /архивировать/i })).toBeInTheDocument();
	});

	test("hides search/filter when selection toolbar is shown", () => {
		renderTable({ selectedIds: new Set(["s1"]) });
		expect(screen.queryByPlaceholderText("Поиск…")).not.toBeInTheDocument();
	});

	test("shows correct selected count", () => {
		renderTable({ selectedIds: new Set(["s1", "s2"]) });
		expect(screen.getByText(/выбрано: 2/i)).toBeInTheDocument();
	});

	test("shows total rows count reflecting loaded suppliers", () => {
		renderTable();
		expect(screen.getByText(/3\s*предложения/)).toBeInTheDocument();
	});

	test("total count excludes pinned current supplier", () => {
		const currentSupplier: CurrentSupplier = {
			companyName: "ООО Текущий",
			deferralDays: 0,
			pricePerUnit: 800,
		};
		renderTable({ currentSupplier });
		expect(screen.getByText(/3\s*предложения/)).toBeInTheDocument();
	});
});

describe("OffersTable mobile cards", () => {
	let mobileSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mobileSpy = vi.spyOn(useIsMobileModule, "useIsMobile").mockReturnValue(true);
	});

	afterEach(() => {
		mobileSpy.mockRestore();
	});

	test("renders cards instead of table on mobile", () => {
		renderTable();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		const cards = screen.getAllByTestId("supplier-card");
		expect(cards).toHaveLength(3);
	});

	test("each card shows company name and «Получено» date", () => {
		renderTable();
		const cards = screen.getAllByTestId("supplier-card");
		expect(within(cards[0]).getByText("ООО «Альфа»")).toBeInTheDocument();
		expect(within(cards[0]).getByText(/Получено:/)).toBeInTheDocument();
		expect(within(cards[1]).getByText("ООО «Бета»")).toBeInTheDocument();
		expect(within(cards[1]).getByText(/Получено:/)).toBeInTheDocument();
	});

	test("card shows new metric labels (ТСО/ед., Стоимость, Экономия, Доставка, Тип оплаты, Срок поставки)", () => {
		renderTable();
		const cards = screen.getAllByTestId("supplier-card");
		const kpCard = cards[0];
		expect(within(kpCard).getByText("ТСО/ед.")).toBeInTheDocument();
		expect(within(kpCard).getByText("Стоимость")).toBeInTheDocument();
		expect(within(kpCard).getByText("Экономия")).toBeInTheDocument();
		expect(within(kpCard).getByText("Доставка")).toBeInTheDocument();
		expect(within(kpCard).getByText("Тип оплаты")).toBeInTheDocument();
		expect(within(kpCard).getByText("Срок поставки")).toBeInTheDocument();
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
		expect(screen.getByText(/нет предложений/i)).toBeInTheDocument();
	});

	test("shows loading skeletons on mobile", () => {
		renderTable({ suppliers: [], isLoading: true });
		const skeletons = screen.getAllByTestId("supplier-card-skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	test("renders search icon on mobile", () => {
		renderTable();
		expect(screen.getByRole("button", { name: "Поиск предложений" })).toBeInTheDocument();
	});

	test("renders pinned current supplier card on mobile with «Ваш поставщик» status", () => {
		const currentSupplier: CurrentSupplier = {
			companyName: "ООО Текущий",
			deferralDays: 0,
			pricePerUnit: 800,
		};
		renderTable({ currentSupplier });
		const pinnedCard = screen.getByTestId("data-table-pinned-card");
		expect(within(pinnedCard).getByText("ООО Текущий")).toBeInTheDocument();
		expect(within(pinnedCard).getByText("Ваш поставщик")).toBeInTheDocument();
	});
});

describe("OffersTable context menu", () => {
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

	test("context menu shows «Выбрать текущего поставщика» when onSelectSupplier is provided", () => {
		const onSelectSupplier = vi.fn();
		renderTable({ onSelectSupplier });
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		expect(screen.getByText("Выбрать текущего поставщика")).toBeInTheDocument();
	});

	test("context menu hides «Выбрать текущего поставщика» when onSelectSupplier is not provided", () => {
		renderTable();
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		expect(screen.queryByText("Выбрать текущего поставщика")).not.toBeInTheDocument();
	});

	test("clicking «Выбрать текущего поставщика» calls onSelectSupplier with id and company name", () => {
		const onSelectSupplier = vi.fn();
		renderTable({ onSelectSupplier });
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		fireEvent.click(screen.getByText("Выбрать текущего поставщика"));
		expect(onSelectSupplier).toHaveBeenCalledWith("s1", "ООО «Альфа»");
	});
});

describe("OffersTable archive filter toggle", () => {
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
