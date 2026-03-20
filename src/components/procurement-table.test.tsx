import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { ProcurementItem } from "@/data/types";
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
	},
	{
		id: "2",
		name: "Труба стальная",
		status: "negotiating",
		annualQuantity: 500,
		currentPrice: 30000,
		bestPrice: 35000,
		averagePrice: 32000,
	},
	{
		id: "3",
		name: "Цемент М500",
		status: "completed",
		annualQuantity: 2000,
		currentPrice: 8000,
		bestPrice: null,
		averagePrice: null,
	},
];

const defaultProps = {
	items: mockItems,
	startIndex: 0,
	sort: null,
	pageInfo: { currentPage: 1, totalPages: 1, pageSize: 50 },
	onSort: () => {},
	onRowClick: () => {},
	onPageChange: () => {},
};

describe("ProcurementTable", () => {
	test("renders 9 column headers", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.getAllByRole("columnheader")).toHaveLength(9);
	});

	test("renders correct number of data rows", () => {
		render(<ProcurementTable {...defaultProps} />);
		// 1 header row + 3 data rows
		expect(screen.getAllByRole("row")).toHaveLength(4);
	});

	test("renders row numbers with startIndex offset", () => {
		render(<ProcurementTable {...defaultProps} startIndex={10} />);
		expect(screen.getByText("11")).toBeInTheDocument();
		expect(screen.getByText("12")).toBeInTheDocument();
		expect(screen.getByText("13")).toBeInTheDocument();
	});

	test("renders item names", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.getByText("Арматура А500")).toBeInTheDocument();
		expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		expect(screen.getByText("Цемент М500")).toBeInTheDocument();
	});

	test("renders status badges with correct labels", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.getByText("Ищем поставщиков")).toBeInTheDocument();
		expect(screen.getByText("Ведём переговоры")).toBeInTheDocument();
		expect(screen.getByText("Переговоры завершены")).toBeInTheDocument();
	});

	test("renders status badges with correct color classes", () => {
		render(<ProcurementTable {...defaultProps} />);
		expect(screen.getByText("Ищем поставщиков").className).toContain("bg-yellow-100");
		expect(screen.getByText("Ведём переговоры").className).toContain("bg-blue-100");
		expect(screen.getByText("Переговоры завершены").className).toContain("bg-green-100");
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

	test("rows have cursor-pointer class", () => {
		render(<ProcurementTable {...defaultProps} />);
		const dataRows = screen.getAllByRole("row").slice(1);
		for (const row of dataRows) {
			expect(row.className).toContain("cursor-pointer");
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
		expect(screen.getByRole("button", { name: /Сортировать по Текущая цена/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Сортировать по Лучшая цена/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Сортировать по Откл/ })).toBeInTheDocument();
	});

	test("clicking sort button calls onSort with correct field", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		render(<ProcurementTable {...defaultProps} onSort={onSort} />);

		await user.click(screen.getByRole("button", { name: /Сортировать по Текущая цена/ }));
		expect(onSort).toHaveBeenCalledWith("currentPrice");
	});

	test("shows sort direction indicator on active column", () => {
		render(<ProcurementTable {...defaultProps} sort={{ field: "currentPrice", direction: "asc" }} />);
		// The active sort column should not have the ArrowUpDown icon (unsorted indicator)
		// Instead it should have ArrowUp (asc)
		const sortBtn = screen.getByRole("button", { name: /Сортировать по Текущая цена/ });
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

	test("header cells have sticky top-0 classes", () => {
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
		const nameHeader = screen.getByText("Наименование").closest("[data-slot='table-head']");
		expect(nameHeader?.className).toContain("sticky");
		expect(nameHeader?.className).toContain("left-0");
		expect(nameHeader?.className).toContain("z-30");
	});

	test("name column body cells have sticky left-0 class", () => {
		render(<ProcurementTable {...defaultProps} />);
		const nameCell = screen.getByText("Арматура А500").closest("[data-slot='table-cell']");
		expect(nameCell?.className).toContain("sticky");
		expect(nameCell?.className).toContain("left-0");
		expect(nameCell?.className).toContain("bg-background");
	});
});
