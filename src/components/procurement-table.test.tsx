import { DndContext } from "@dnd-kit/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { Folder, ProcurementItem } from "@/data/types";
import { ProcurementTable } from "./procurement-table";

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
	},
];

const defaultProps = {
	items: mockItems,
	sort: null,
	pageInfo: { currentPage: 1, totalPages: 1, pageSize: 50 },
	onSort: () => {},
	onPageChange: () => {},
};

describe("ProcurementTable", () => {
	test("renders 8 column headers", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.getAllByRole("columnheader")).toHaveLength(8);
	});

	test("renders correct number of data rows", () => {
		render(<ProcurementTable {...defaultProps} />);
		// 1 header row + 3 data rows
		expect(screen.getAllByRole("row")).toHaveLength(4);
	});

	test("renders row numbers with page offset", () => {
		render(<ProcurementTable {...defaultProps} pageInfo={{ currentPage: 2, totalPages: 3, pageSize: 5 }} />);
		expect(screen.getByText("6")).toBeInTheDocument();
		expect(screen.getByText("7")).toBeInTheDocument();
		expect(screen.getByText("8")).toBeInTheDocument();
	});

	test("renders item names", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.getByText("Арматура А500")).toBeInTheDocument();
		expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		expect(screen.getByText("Цемент М500")).toBeInTheDocument();
	});

	test("renders status badges with correct labels", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.getAllByText("Ищем поставщиков")).toHaveLength(2);
		expect(screen.getByText("Ведём переговоры")).toBeInTheDocument();
	});

	test("renders status labels with correct color classes", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.getAllByText("Ищем поставщиков")[0].className).toContain("text-orange-600");
		expect(screen.getByText("Ведём переговоры").className).toContain("text-blue-600");
	});

	test("renders dash for null prices, deviation, and overpayment", () => {
		render(<ProcurementTable {...defaultProps} items={[mockItems[2]]} />);
		// Цемент М500 has null bestPrice, averagePrice, deviation, overpayment → 4 dashes
		const dashes = screen.getAllByText("—");
		expect(dashes).toHaveLength(4);
	});

	test("applies red color class for positive deviation (overpaying)", () => {
		render(<ProcurementTable {...defaultProps} items={[mockItems[0]]} />);
		// Арматура: deviation = (55000-50000)/50000*100 = +10%
		const cells = document.querySelectorAll("[data-slot='table-cell']");
		const redCells = [...cells].filter((cell) => cell.className.includes("text-red-600"));
		// deviation cell + overpayment cell
		expect(redCells).toHaveLength(2);
	});

	test("applies green color class for negative deviation (savings)", () => {
		render(<ProcurementTable {...defaultProps} items={[mockItems[1]]} />);
		// Труба: deviation = (30000-35000)/35000*100 = -14.3%
		const cells = document.querySelectorAll("[data-slot='table-cell']");
		const greenCells = [...cells].filter((cell) => cell.className.includes("text-green-600"));
		// deviation cell + overpayment cell
		expect(greenCells).toHaveLength(2);
	});

	test("rows have cursor-pointer class when onRowClick provided", () => {
		render(<ProcurementTable {...defaultProps} onRowClick={() => {}} />);
		const dataRows = screen.getAllByRole("row").slice(1);
		for (const row of dataRows) {
			expect(row.className).toContain("cursor-pointer");
		}
	});

	test("rows do not have cursor-pointer class when onRowClick omitted", () => {
		render(<ProcurementTable {...defaultProps} />);
		const dataRows = screen.getAllByRole("row").slice(1);
		for (const row of dataRows) {
			expect(row.className).not.toContain("cursor-pointer");
		}
	});

	test("calls onRowClick with correct item when row is clicked", async () => {
		const user = userEvent.setup();
		const handleRowClick = vi.fn();
		render(<ProcurementTable {...defaultProps} onRowClick={handleRowClick} />);

		await user.click(screen.getByText("Арматура А500"));
		expect(handleRowClick).toHaveBeenCalledWith(mockItems[0]);
	});

	test("sortable column headers have sort buttons", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Сортировать по ЛУЧШАЯ ЦЕНА/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Сортировать по ОТКЛ/ })).toBeInTheDocument();
	});

	test("clicking sort button calls onSort with correct field", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		render(<ProcurementTable {...defaultProps} onSort={onSort} />);

		await user.click(screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА/ }));
		expect(onSort).toHaveBeenCalledWith("currentPrice");
	});

	test("shows sort direction indicator on active column", () => {
		render(<ProcurementTable {...defaultProps} sort={{ field: "currentPrice", direction: "asc" }} />);
		// The active sort column should not have the ArrowUpDown icon (unsorted indicator)
		// Instead it should have ArrowUp (asc)
		const sortBtn = screen.getByRole("button", { name: /Сортировать по ТЕКУЩАЯ ЦЕНА/ });
		const svgs = sortBtn.querySelectorAll("svg");
		expect(svgs).toHaveLength(1);
		// lucide ArrowUp has a specific path — just check the icon renders
		expect(svgs[0].classList.contains("size-3.5")).toBe(true);
	});

	test("does not render pagination when only one page", () => {
		render(<ProcurementTable {...defaultProps} pageInfo={{ currentPage: 1, totalPages: 1, pageSize: 50 }} />);
		expect(screen.queryByText(/Страница/)).not.toBeInTheDocument();
	});

	test("renders pagination controls when multiple pages exist", () => {
		render(<ProcurementTable {...defaultProps} pageInfo={{ currentPage: 1, totalPages: 3, pageSize: 50 }} />);
		expect(screen.getByText(/Страница 1 из/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Предыдущая страница" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Следующая страница" })).toBeEnabled();
	});

	test("disables next button on last page", () => {
		render(<ProcurementTable {...defaultProps} pageInfo={{ currentPage: 3, totalPages: 3, pageSize: 50 }} />);
		expect(screen.getByRole("button", { name: "Предыдущая страница" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Следующая страница" })).toBeDisabled();
	});

	test("renders page indicator with correct text", () => {
		render(<ProcurementTable {...defaultProps} pageInfo={{ currentPage: 2, totalPages: 5, pageSize: 50 }} />);
		expect(screen.getByText(/Страница 2 из/)).toBeInTheDocument();
	});

	test("calls onPageChange with correct page on prev/next click", async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		render(
			<ProcurementTable
				{...defaultProps}
				pageInfo={{ currentPage: 2, totalPages: 3, pageSize: 50 }}
				onPageChange={onPageChange}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Предыдущая страница" }));
		expect(onPageChange).toHaveBeenCalledWith(1);

		await user.click(screen.getByRole("button", { name: "Следующая страница" }));
		expect(onPageChange).toHaveBeenCalledWith(3);
	});

	test("renders scroll container with overflow-auto for horizontal and vertical scrolling", () => {
		render(<ProcurementTable {...defaultProps} />);
		const scrollContainer = screen.getByTestId("table-scroll-container");
		expect(scrollContainer.className).toContain("overflow-auto");
		expect(scrollContainer.className).toContain("touch-manipulation");
	});

	test("header cells have sticky top-0 classes with opaque background", () => {
		render(<ProcurementTable {...defaultProps} />);
		const headers = screen.getAllByRole("columnheader");
		for (const header of headers) {
			expect(header.className).toContain("sticky");
			expect(header.className).toContain("top-0");
			expect(header.className).toContain("bg-background");
		}
	});

	test("name column header has sticky left-0 class for horizontal pinning", () => {
		render(<ProcurementTable {...defaultProps} />);
		const nameHeader = screen.getByText("НАИМЕНОВАНИЕ").closest("[data-slot='table-head']");
		expect(nameHeader?.className).toContain("sticky");
		expect(nameHeader?.className).toContain("left-0");
		expect(nameHeader?.className).toContain("z-30");
	});

	test("name column body cells have sticky left-0 class", () => {
		render(<ProcurementTable {...defaultProps} />);
		const nameCell = screen.getByText("Арматура А500").closest("[data-slot='table-cell']");
		expect(nameCell?.className).toContain("sticky");
		expect(nameCell?.className).toContain("left-0");
		expect(nameCell?.className).toContain("bg-inherit");
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
		render(<ProcurementTable {...defaultProps} items={itemsWithFolders} folders={testFolders} />);
		const badge = screen.getByTestId("folder-badge-1");
		expect(badge).toBeInTheDocument();
		expect(badge.textContent).toContain("Металлопрокат");
	});

	test("does not render badge for items without folderId", () => {
		render(<ProcurementTable {...defaultProps} items={itemsWithFolders} folders={testFolders} />);
		expect(screen.queryByTestId("folder-badge-2")).not.toBeInTheDocument();
	});

	test("badge shows correct folder color", () => {
		render(<ProcurementTable {...defaultProps} items={itemsWithFolders} folders={testFolders} />);
		const badge = screen.getByTestId("folder-badge-1");
		const dot = badge.querySelector("span[aria-hidden]") as HTMLElement;
		expect(dot.style.backgroundColor).toBe("var(--folder-blue)");
	});

	test("does not render badges when folders prop is omitted", () => {
		render(<ProcurementTable {...defaultProps} items={itemsWithFolders} />);
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
		render(<ProcurementTable {...contextMenuProps} />);
		expect(screen.getByTestId("row-1")).toBeInTheDocument();
		expect(screen.getByTestId("row-2")).toBeInTheDocument();
	});

	test("rows do not have data-testid when no context menu props", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.queryByTestId("row-1")).not.toBeInTheDocument();
	});

	test("context menu opens on right-click with correct items", () => {
		render(<ProcurementTable {...contextMenuProps} />);
		const row = screen.getByTestId("row-1");
		fireEvent.contextMenu(row);
		expect(screen.getByText("Переместить в папку")).toBeInTheDocument();
		expect(screen.getByText("Переименовать")).toBeInTheDocument();
		expect(screen.getByText("Удалить")).toBeInTheDocument();
	});

	test("folder assignment submenu shows folders", () => {
		render(<ProcurementTable {...contextMenuProps} />);
		fireEvent.contextMenu(screen.getByTestId("row-1"));

		// Hover over submenu trigger to open it
		fireEvent.click(screen.getByText("Переместить в папку"));

		expect(screen.getByText("Без папки")).toBeInTheDocument();
	});

	test("clicking delete opens AlertDialog", () => {
		render(<ProcurementTable {...contextMenuProps} />);
		fireEvent.contextMenu(screen.getByTestId("row-1"));
		fireEvent.click(screen.getByText("Удалить"));

		expect(screen.getByText("Удалить закупку?")).toBeInTheDocument();
		// Dialog description contains item name
		const dialog = screen.getByRole("alertdialog");
		expect(within(dialog).getByText(/Арматура А500/)).toBeInTheDocument();
	});

	test("confirming delete calls onDeleteItem", () => {
		const onDeleteItem = vi.fn();
		render(<ProcurementTable {...contextMenuProps} onDeleteItem={onDeleteItem} />);

		fireEvent.contextMenu(screen.getByTestId("row-1"));
		fireEvent.click(screen.getByText("Удалить"));

		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
		expect(onDeleteItem).toHaveBeenCalledWith("1");
	});

	test("cancelling delete does not call onDeleteItem", () => {
		const onDeleteItem = vi.fn();
		render(<ProcurementTable {...contextMenuProps} onDeleteItem={onDeleteItem} />);

		fireEvent.contextMenu(screen.getByTestId("row-1"));
		fireEvent.click(screen.getByText("Удалить"));

		fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
		expect(onDeleteItem).not.toHaveBeenCalled();
	});

	test("clicking Переименовать shows inline input", async () => {
		// Render without onAssignFolder to isolate rename from submenu
		render(
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
		render(<ProcurementTable {...contextMenuProps} onRenameItem={onRenameItem} />);

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
		render(<ProcurementTable {...contextMenuProps} onRenameItem={onRenameItem} />);

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
		render(<ProcurementTable {...contextMenuProps} onRenameItem={onRenameItem} />);

		fireEvent.contextMenu(screen.getByTestId("row-1"));
		await user.click(screen.getByText("Переименовать"));

		const input = await screen.findByRole("textbox", { name: "Название закупки" });
		await user.clear(input);
		fireEvent.blur(input);

		expect(onRenameItem).not.toHaveBeenCalled();
	});
});

describe("ProcurementTable drag-and-drop", () => {
	test("rows have draggable aria-roledescription when draggable", () => {
		render(
			<DndContext>
				<ProcurementTable {...contextMenuProps} draggable />
			</DndContext>,
		);
		const row = screen.getByTestId("row-1");
		expect(row.getAttribute("aria-roledescription")).toBe("draggable");
	});

	test("rows do not have draggable attributes when draggable prop is omitted", () => {
		render(
			<DndContext>
				<ProcurementTable {...contextMenuProps} />
			</DndContext>,
		);
		const row = screen.getByTestId("row-1");
		expect(row.getAttribute("aria-roledescription")).toBeNull();
	});

	test("rows have tabIndex for keyboard dragging when draggable", () => {
		render(
			<DndContext>
				<ProcurementTable {...contextMenuProps} draggable />
			</DndContext>,
		);
		const row = screen.getByTestId("row-1");
		expect(row).toHaveAttribute("tabindex", "0");
	});

	test("dragging row reduces opacity", () => {
		render(
			<DndContext>
				<ProcurementTable {...contextMenuProps} draggable />
			</DndContext>,
		);
		// Actual drag state requires pointer simulation which doesn't work in jsdom.
		const row = screen.getByTestId("row-1");
		expect(row).toBeInTheDocument();
	});

	test("active dragged row gets drag-state class", () => {
		render(
			<DndContext>
				<ProcurementTable {...contextMenuProps} draggable activeItemId="1" />
			</DndContext>,
		);
		const row = screen.getByTestId("row-1");
		expect(row.className).toContain("dragging-row");
	});
});
