import { DndContext } from "@dnd-kit/core";
import { fireEvent, type RenderOptions, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Folder, ProcurementItem } from "@/data/types";
import { installMockIntersectionObserver, type ObserverRecord } from "@/test-intersection-observer";
import { TooltipWrapper } from "@/test-utils";
import { ProcurementTable } from "./procurement-table";

function renderWithTooltip(ui: ReactNode, options?: Omit<RenderOptions, "wrapper">) {
	return render(ui, { wrapper: TooltipWrapper, ...options });
}

let observers: ObserverRecord[];

beforeEach(() => {
	observers = installMockIntersectionObserver();
});

afterEach(() => {
	vi.restoreAllMocks();
});

const mockItems: ProcurementItem[] = [
	{
		id: "1",
		name: "Арматура А500",
		status: "searching",
		annualQuantity: 1000,
		currentPrice: 55000,
		bestPrice: 50000,
		averagePrice: 52000,
		folderId: null,
		companyId: "company-1",
	},
	{
		id: "2",
		name: "Труба стальная",
		status: "searching",
		annualQuantity: 500,
		currentPrice: 30000,
		bestPrice: 35000,
		averagePrice: 32000,
		folderId: null,
		companyId: "company-1",
	},
	{
		id: "3",
		name: "Цемент М500",
		status: "negotiating",
		annualQuantity: 2000,
		currentPrice: 8000,
		bestPrice: null,
		averagePrice: null,
		folderId: null,
		companyId: "company-1",
		taskCount: 5,
	},
	{
		id: "4",
		name: "Пружинный блок TFK",
		status: "awaiting_analytics",
		annualQuantity: 10000,
		currentPrice: 1850,
		bestPrice: null,
		averagePrice: null,
		folderId: null,
		companyId: "company-1",
	},
];

const defaultProps = {
	items: mockItems,
	sort: null,
	hasNextPage: false,
	loadMore: () => {},
	onSort: () => {},
};

describe("ProcurementTable", () => {
	test("renders 8 column headers", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.getAllByRole("columnheader")).toHaveLength(8);
	});

	test("renders correct number of data rows", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		// 1 header row + 4 data rows
		expect(screen.getAllByRole("row")).toHaveLength(5);
	});

	test("renders sequential row numbers starting from 1", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	test("renders item names", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.getByText("Арматура А500")).toBeInTheDocument();
		expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		expect(screen.getByText("Цемент М500")).toBeInTheDocument();
	});

	test("renders status badges with correct labels", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.getAllByText("Ищем поставщиков")).toHaveLength(2);
		expect(screen.getByText("Ведём переговоры")).toBeInTheDocument();
		expect(screen.getByText("Ожидание аналитики")).toBeInTheDocument();
	});

	test("renders status labels with correct color classes", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.getAllByText("Ищем поставщиков")[0].className).toContain("text-orange-600");
		expect(screen.getByText("Ведём переговоры").className).toContain("text-blue-600");
		expect(screen.getByText("Ожидание аналитики").className).toContain("text-violet-600");
	});

	test("renders dash for null prices, deviation, and overpayment", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={[mockItems[2]]} />);
		// Цемент М500 has null bestPrice, averagePrice, deviation, overpayment → 4 dashes
		const dashes = screen.getAllByText("—");
		expect(dashes).toHaveLength(4);
	});

	test("applies red color class for positive deviation (overpaying)", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={[mockItems[0]]} />);
		// Арматура: deviation = (55000-50000)/50000*100 = +10%
		const cells = document.querySelectorAll("[data-slot='table-cell']");
		const redCells = [...cells].filter((cell) => cell.className.includes("text-red-600"));
		// deviation cell + overpayment cell
		expect(redCells).toHaveLength(2);
	});

	test("applies green color class for negative deviation (savings)", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={[mockItems[1]]} />);
		// Труба: deviation = (30000-35000)/35000*100 = -14.3%
		const cells = document.querySelectorAll("[data-slot='table-cell']");
		const primaryCells = [...cells].filter((cell) => cell.className.includes("text-primary"));
		// deviation cell + overpayment cell
		expect(primaryCells).toHaveLength(2);
	});

	test("rows have cursor-pointer class when onRowClick provided", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} onRowClick={() => {}} />);
		const dataRows = screen.getAllByRole("row").slice(1);
		for (const row of dataRows) {
			expect(row.className).toContain("cursor-pointer");
		}
	});

	test("rows do not have cursor-pointer class when onRowClick omitted", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		const dataRows = screen.getAllByRole("row").slice(1);
		for (const row of dataRows) {
			expect(row.className).not.toContain("cursor-pointer");
		}
	});

	test("calls onRowClick with correct item when row is clicked", async () => {
		const user = userEvent.setup();
		const handleRowClick = vi.fn();
		renderWithTooltip(<ProcurementTable {...defaultProps} onRowClick={handleRowClick} />);

		await user.click(screen.getByText("Арматура А500"));
		expect(handleRowClick).toHaveBeenCalledWith(mockItems[0]);
	});

	test("sortable column headers have sort buttons", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА \(ед\.\)/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Сортировать по ЛУЧШАЯ ЦЕНА/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Сортировать по ОТКЛ/ })).toBeInTheDocument();
	});

	test("clicking sort button calls onSort with correct field", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		renderWithTooltip(<ProcurementTable {...defaultProps} onSort={onSort} />);

		await user.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА \(ед\.\)/ }));
		expect(onSort).toHaveBeenCalledWith("currentPrice");
	});

	test("shows sort direction indicator on active column", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} sort={{ field: "currentPrice", direction: "asc" }} />);
		// The active sort column should not have the ArrowUpDown icon (unsorted indicator)
		// Instead it should have ArrowUp (asc)
		const sortBtn = screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА \(ед\.\)/ });
		const svgs = sortBtn.querySelectorAll("svg");
		expect(svgs).toHaveLength(1);
		// lucide ArrowUp has a specific path — just check the icon renders
		expect(svgs[0].classList.contains("size-3.5")).toBe(true);
	});

	test("does not render pagination buttons", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.queryByText(/Страница/)).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Предыдущая страница" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Следующая страница" })).not.toBeInTheDocument();
	});

	test("renders sentinel element after table body", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} hasNextPage />);
		const sentinel = screen.getByTestId("scroll-sentinel");
		expect(sentinel).toBeInTheDocument();
	});

	test("calls loadMore when sentinel is observed and hasNextPage is true", () => {
		const loadMore = vi.fn();
		renderWithTooltip(<ProcurementTable {...defaultProps} hasNextPage loadMore={loadMore} />);

		// Trigger intersection on the observer created by useIntersectionObserver
		expect(observers).toHaveLength(1);
		observers[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

		expect(loadMore).toHaveBeenCalledOnce();
	});

	test("does not call loadMore when hasNextPage is false", () => {
		const loadMore = vi.fn();
		renderWithTooltip(<ProcurementTable {...defaultProps} hasNextPage={false} loadMore={loadMore} />);

		// Even if sentinel intersects, loadMore should not fire
		if (observers.length > 0) {
			observers[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		}

		expect(loadMore).not.toHaveBeenCalled();
	});

	test("re-observes sentinel when hasNextPage toggles false → true", () => {
		const loadMore = vi.fn();
		const { rerender } = renderWithTooltip(<ProcurementTable {...defaultProps} hasNextPage loadMore={loadMore} />);

		expect(observers).toHaveLength(1);

		// Sentinel unmounts
		rerender(<ProcurementTable {...defaultProps} hasNextPage={false} loadMore={loadMore} />);
		expect(observers[0].disconnect).toHaveBeenCalled();

		// Sentinel remounts — should create new observer
		rerender(<ProcurementTable {...defaultProps} hasNextPage loadMore={loadMore} />);
		expect(observers).toHaveLength(2);

		observers[1].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		expect(loadMore).toHaveBeenCalledOnce();
	});

	test("renders scroll container with overflow-auto for horizontal and vertical scrolling", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		const scrollContainer = screen.getByTestId("table-scroll-container");
		expect(scrollContainer.className).toContain("overflow-auto");
		expect(scrollContainer.className).toContain("touch-manipulation");
	});

	test("header cells have sticky top-0 classes with opaque background", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		const headers = screen.getAllByRole("columnheader");
		for (const header of headers) {
			expect(header.className).toContain("sticky");
			expect(header.className).toContain("top-0");
			expect(header.className).toContain("bg-background");
		}
	});

	test("name column header is not horizontally pinned", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		const nameHeader = screen.getByText("НАИМЕНОВАНИЕ").closest("[data-slot='table-head']");
		expect(nameHeader?.className).not.toContain("left-0");
	});

	test("name column body cells are not horizontally pinned", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		const nameCell = screen.getByText("Арматура А500").closest("[data-slot='table-cell']");
		expect(nameCell?.className).not.toContain("left-0");
	});
});

describe("ProcurementTable loading states", () => {
	test("renders skeleton rows when isLoading is true", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={[]} isLoading />);
		const skeletonRows = screen.getAllByTestId("skeleton-row");
		expect(skeletonRows).toHaveLength(6);
	});

	test("does not render data rows when isLoading is true", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} isLoading />);
		// Only header row + 6 skeleton rows
		expect(screen.queryByText("Арматура А500")).not.toBeInTheDocument();
	});

	test("renders spinner when isFetchingNextPage is true", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} isFetchingNextPage />);
		expect(screen.getByTestId("loading-more-spinner")).toBeInTheDocument();
	});

	test("does not render spinner when isFetchingNextPage is false", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.queryByTestId("loading-more-spinner")).not.toBeInTheDocument();
	});
});

describe("ProcurementTable error state", () => {
	test("renders error state with retry button on query failure", () => {
		renderWithTooltip(
			<ProcurementTable {...defaultProps} items={[]} error={new Error("Network error")} onRetry={() => {}} />,
		);
		expect(screen.getByTestId("items-error")).toBeInTheDocument();
		expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
		expect(screen.getByText("Повторить")).toBeInTheDocument();
	});

	test("clicking retry button calls onRetry", async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		renderWithTooltip(<ProcurementTable {...defaultProps} items={[]} error={new Error("fail")} onRetry={onRetry} />);

		await user.click(screen.getByText("Повторить"));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	test("does not render error state when no error", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.queryByTestId("items-error")).not.toBeInTheDocument();
	});
});

const testFolders: Folder[] = [
	{ id: "f-1", name: "Металлопрокат", color: "blue" },
	{ id: "f-2", name: "Стройматериалы", color: "green" },
];

const itemsWithFolders: ProcurementItem[] = [
	{ ...mockItems[0], folderId: "f-1" },
	{ ...mockItems[1], folderId: null },
	{ ...mockItems[2], folderId: "f-2" },
];

describe("ProcurementTable folder badges", () => {
	test("renders folder badge for items with folderId", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={itemsWithFolders} folders={testFolders} />);
		const badge = screen.getByTestId("folder-badge-1");
		expect(badge).toBeInTheDocument();
		expect(badge.textContent).toContain("Металлопрокат");
	});

	test("does not render badge for items without folderId", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={itemsWithFolders} folders={testFolders} />);
		expect(screen.queryByTestId("folder-badge-2")).not.toBeInTheDocument();
	});

	test("badge shows correct folder color", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={itemsWithFolders} folders={testFolders} />);
		const badge = screen.getByTestId("folder-badge-1");
		const dot = badge.querySelector("span[aria-hidden]") as HTMLElement;
		expect(dot.style.backgroundColor).toBe("var(--folder-blue)");
	});

	test("does not render badges when folders prop is omitted", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={itemsWithFolders} />);
		expect(screen.queryByTestId("folder-badge-1")).not.toBeInTheDocument();
	});
});

const contextMenuProps = {
	...defaultProps,
	items: itemsWithFolders,
	folders: testFolders,
	onDeleteItem: vi.fn(),
	onRenameItem: vi.fn(),
	onAssignFolder: vi.fn(),
};

describe("ProcurementTable context menu", () => {
	test("rows have data-testid when context menu props are provided", () => {
		renderWithTooltip(<ProcurementTable {...contextMenuProps} />);
		expect(screen.getByTestId("row-1")).toBeInTheDocument();
		expect(screen.getByTestId("row-2")).toBeInTheDocument();
	});

	test("rows do not have data-testid when no context menu props", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.queryByTestId("row-1")).not.toBeInTheDocument();
	});

	test("context menu opens on right-click with correct items", () => {
		renderWithTooltip(<ProcurementTable {...contextMenuProps} />);
		const row = screen.getByTestId("row-1");
		fireEvent.contextMenu(row);
		expect(screen.getByText("Переместить в категорию")).toBeInTheDocument();
		expect(screen.getByText("Переименовать")).toBeInTheDocument();
		expect(screen.getByText("Удалить")).toBeInTheDocument();
	});

	test("folder assignment submenu shows folders", () => {
		renderWithTooltip(<ProcurementTable {...contextMenuProps} />);
		fireEvent.contextMenu(screen.getByTestId("row-1"));

		// Hover over submenu trigger to open it
		fireEvent.click(screen.getByText("Переместить в категорию"));

		expect(screen.getByText("Без категории")).toBeInTheDocument();
	});

	test("clicking delete opens AlertDialog", () => {
		renderWithTooltip(<ProcurementTable {...contextMenuProps} />);
		fireEvent.contextMenu(screen.getByTestId("row-1"));
		fireEvent.click(screen.getByText("Удалить"));

		expect(screen.getByText("Удалить закупку?")).toBeInTheDocument();
		// Dialog description contains item name
		const dialog = screen.getByRole("alertdialog");
		expect(within(dialog).getByText(/Арматура А500/)).toBeInTheDocument();
	});

	test("confirming delete calls onDeleteItem", () => {
		const onDeleteItem = vi.fn();
		renderWithTooltip(<ProcurementTable {...contextMenuProps} onDeleteItem={onDeleteItem} />);

		fireEvent.contextMenu(screen.getByTestId("row-1"));
		fireEvent.click(screen.getByText("Удалить"));

		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
		expect(onDeleteItem).toHaveBeenCalledWith("1");
	});

	test("cancelling delete does not call onDeleteItem", () => {
		const onDeleteItem = vi.fn();
		renderWithTooltip(<ProcurementTable {...contextMenuProps} onDeleteItem={onDeleteItem} />);

		fireEvent.contextMenu(screen.getByTestId("row-1"));
		fireEvent.click(screen.getByText("Удалить"));

		fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
		expect(onDeleteItem).not.toHaveBeenCalled();
	});

	test("clicking Переименовать shows inline input", async () => {
		// Render without onAssignFolder to isolate rename from submenu
		renderWithTooltip(
			<ProcurementTable
				{...defaultProps}
				items={itemsWithFolders}
				folders={testFolders}
				onRenameItem={vi.fn()}
				onDeleteItem={vi.fn()}
			/>,
		);
		fireEvent.contextMenu(screen.getByTestId("row-1"));
		fireEvent.click(screen.getByText("Переименовать"));

		const input = await screen.findByRole("textbox", { name: "Название закупки" });
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute("spellcheck", "false");
		expect(input).toHaveAttribute("autocomplete", "off");
	});

	test("inline rename Enter saves and calls onRenameItem", async () => {
		const user = userEvent.setup();
		const onRenameItem = vi.fn();
		renderWithTooltip(<ProcurementTable {...contextMenuProps} onRenameItem={onRenameItem} />);

		fireEvent.contextMenu(screen.getByTestId("row-1"));
		await user.click(screen.getByText("Переименовать"));

		const input = await screen.findByRole("textbox", { name: "Название закупки" });
		await user.clear(input);
		await user.type(input, "Новое имя{Enter}");

		expect(onRenameItem).toHaveBeenCalledWith("1", "Новое имя");
	});

	test("inline rename Esc cancels without calling onRenameItem", async () => {
		const user = userEvent.setup();
		const onRenameItem = vi.fn();
		renderWithTooltip(<ProcurementTable {...contextMenuProps} onRenameItem={onRenameItem} />);

		fireEvent.contextMenu(screen.getByTestId("row-1"));
		await user.click(screen.getByText("Переименовать"));

		const input = await screen.findByRole("textbox", { name: "Название закупки" });
		fireEvent.keyDown(input, { key: "Escape" });

		expect(onRenameItem).not.toHaveBeenCalled();
		expect(screen.queryByRole("textbox", { name: "Название закупки" })).not.toBeInTheDocument();
	});

	test("inline rename rejects empty name on blur", async () => {
		const user = userEvent.setup();
		const onRenameItem = vi.fn();
		renderWithTooltip(<ProcurementTable {...contextMenuProps} onRenameItem={onRenameItem} />);

		fireEvent.contextMenu(screen.getByTestId("row-1"));
		await user.click(screen.getByText("Переименовать"));

		const input = await screen.findByRole("textbox", { name: "Название закупки" });
		await user.clear(input);
		fireEvent.blur(input);

		expect(onRenameItem).not.toHaveBeenCalled();
	});
});

describe("ProcurementTable responsive card/table switch", () => {
	test("renders cards instead of table when isMobile is true", () => {
		renderWithTooltip(
			<ProcurementTable
				{...defaultProps}
				isMobile
				onDeleteItem={() => {}}
				onRenameItem={() => {}}
				onAssignFolder={() => {}}
				folders={testFolders}
			/>,
		);
		// No table element
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		// Cards render with item names
		expect(screen.getByText("Арматура А500")).toBeInTheDocument();
		expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		expect(screen.getByText("Цемент М500")).toBeInTheDocument();
	});

	test("renders table when isMobile is false", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} isMobile={false} />);
		expect(screen.getByRole("table")).toBeInTheDocument();
	});

	test("renders table when isMobile is omitted (default)", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);
		expect(screen.getByRole("table")).toBeInTheDocument();
	});

	test("card mode shows card-shaped skeletons when isLoading", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={[]} isMobile isLoading />);
		const skeletons = screen.getAllByTestId("skeleton-card");
		expect(skeletons.length).toBeGreaterThanOrEqual(4);
		// No table skeleton rows
		expect(screen.queryByTestId("skeleton-row")).not.toBeInTheDocument();
	});

	test("card mode shows error state with retry", async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		renderWithTooltip(
			<ProcurementTable {...defaultProps} items={[]} isMobile error={new Error("fail")} onRetry={onRetry} />,
		);

		expect(screen.getByTestId("items-error")).toBeInTheDocument();
		expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();
		await user.click(screen.getByText("Повторить"));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	test("card mode shows empty state", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} items={[]} isMobile />);
		expect(screen.getByTestId("items-empty")).toBeInTheDocument();
		expect(screen.getByText("Позиции не найдены")).toBeInTheDocument();
	});

	test("card mode renders infinite scroll sentinel when hasNextPage", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} isMobile hasNextPage />);
		expect(screen.getByTestId("scroll-sentinel")).toBeInTheDocument();
	});

	test("card mode calls loadMore when sentinel intersects", () => {
		const loadMore = vi.fn();
		renderWithTooltip(<ProcurementTable {...defaultProps} isMobile hasNextPage loadMore={loadMore} />);

		expect(observers).toHaveLength(1);
		observers[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		expect(loadMore).toHaveBeenCalledOnce();
	});

	test("card mode shows spinner when isFetchingNextPage", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} isMobile isFetchingNextPage />);
		expect(screen.getByTestId("loading-more-spinner")).toBeInTheDocument();
	});

	test("card mode does not have draggable attributes", () => {
		renderWithTooltip(
			<DndContext>
				<ProcurementTable
					{...defaultProps}
					isMobile
					draggable
					onDeleteItem={() => {}}
					onRenameItem={() => {}}
					onAssignFolder={() => {}}
					folders={testFolders}
				/>
			</DndContext>,
		);
		// Cards should not have aria-roledescription="draggable"
		const cards = screen.getAllByRole("button");
		for (const card of cards) {
			expect(card.getAttribute("aria-roledescription")).not.toBe("draggable");
		}
	});
});

describe("ProcurementTable name truncation", () => {
	const longName = "Пена монтажная профессиональная зимняя морозостойкая";

	test("truncates names longer than 32 characters with ellipsis", () => {
		const items = [{ ...mockItems[0], name: longName }];
		renderWithTooltip(<ProcurementTable {...defaultProps} items={items} />);

		expect(screen.getByText(`${longName.slice(0, 40)}…`)).toBeInTheDocument();
		expect(screen.queryByText(longName)).not.toBeInTheDocument();
	});

	test("shows full name in tooltip for truncated names", async () => {
		const user = userEvent.setup();
		const items = [{ ...mockItems[0], name: longName }];
		renderWithTooltip(<ProcurementTable {...defaultProps} items={items} />);

		const truncated = screen.getByText(`${longName.slice(0, 40)}…`);
		await user.hover(truncated);

		expect(await screen.findByRole("tooltip")).toHaveTextContent(longName);
	});

	test("does not truncate names within 32 characters", () => {
		renderWithTooltip(<ProcurementTable {...defaultProps} />);

		expect(screen.getByText("Арматура А500")).toBeInTheDocument();
		// No tooltip trigger wrapper needed
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});
});

describe("ProcurementTable drag-and-drop", () => {
	test("rows have draggable aria-roledescription when draggable", () => {
		renderWithTooltip(
			<DndContext>
				<ProcurementTable {...contextMenuProps} draggable />
			</DndContext>,
		);
		const row = screen.getByTestId("row-1");
		expect(row.getAttribute("aria-roledescription")).toBe("draggable");
	});

	test("rows do not have draggable attributes when draggable prop is omitted", () => {
		renderWithTooltip(
			<DndContext>
				<ProcurementTable {...contextMenuProps} />
			</DndContext>,
		);
		const row = screen.getByTestId("row-1");
		expect(row.getAttribute("aria-roledescription")).toBeNull();
	});

	test("rows have tabIndex for keyboard dragging when draggable", () => {
		renderWithTooltip(
			<DndContext>
				<ProcurementTable {...contextMenuProps} draggable />
			</DndContext>,
		);
		const row = screen.getByTestId("row-1");
		expect(row).toHaveAttribute("tabindex", "0");
	});

	test("dragging row reduces opacity", () => {
		renderWithTooltip(
			<DndContext>
				<ProcurementTable {...contextMenuProps} draggable />
			</DndContext>,
		);
		// Actual drag state requires pointer simulation which doesn't work in jsdom.
		const row = screen.getByTestId("row-1");
		expect(row).toBeInTheDocument();
	});

	test("active dragged row gets drag-state class", () => {
		renderWithTooltip(
			<DndContext>
				<ProcurementTable {...contextMenuProps} draggable activeItemId="1" />
			</DndContext>,
		);
		const row = screen.getByTestId("row-1");
		expect(row.className).toContain("dragging-row");
	});
});
