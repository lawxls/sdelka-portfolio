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

describe("ProcurementTable", () => {
	test("renders 9 column headers", () => {
		render(<ProcurementTable items={mockItems} startIndex={0} onRowClick={() => {}} />);
		expect(screen.getAllByRole("columnheader")).toHaveLength(9);
	});

	test("renders correct number of data rows", () => {
		render(<ProcurementTable items={mockItems} startIndex={0} onRowClick={() => {}} />);
		// 1 header row + 3 data rows
		expect(screen.getAllByRole("row")).toHaveLength(4);
	});

	test("renders row numbers with startIndex offset", () => {
		render(<ProcurementTable items={mockItems} startIndex={10} onRowClick={() => {}} />);
		expect(screen.getByText("11")).toBeInTheDocument();
		expect(screen.getByText("12")).toBeInTheDocument();
		expect(screen.getByText("13")).toBeInTheDocument();
	});

	test("renders item names", () => {
		render(<ProcurementTable items={mockItems} startIndex={0} onRowClick={() => {}} />);
		expect(screen.getByText("Арматура А500")).toBeInTheDocument();
		expect(screen.getByText("Труба стальная")).toBeInTheDocument();
		expect(screen.getByText("Цемент М500")).toBeInTheDocument();
	});

	test("renders status badges with correct labels", () => {
		render(<ProcurementTable items={mockItems} startIndex={0} onRowClick={() => {}} />);
		expect(screen.getByText("Ищем поставщиков")).toBeInTheDocument();
		expect(screen.getByText("Ведём переговоры")).toBeInTheDocument();
		expect(screen.getByText("Переговоры завершены")).toBeInTheDocument();
	});

	test("renders status badges with correct color classes", () => {
		render(<ProcurementTable items={mockItems} startIndex={0} onRowClick={() => {}} />);
		expect(screen.getByText("Ищем поставщиков").className).toContain("bg-yellow-100");
		expect(screen.getByText("Ведём переговоры").className).toContain("bg-blue-100");
		expect(screen.getByText("Переговоры завершены").className).toContain("bg-green-100");
	});

	test("renders dash for null prices, deviation, and overpayment", () => {
		render(<ProcurementTable items={[mockItems[2]]} startIndex={0} onRowClick={() => {}} />);
		// Цемент М500 has null bestPrice, averagePrice, deviation, overpayment → 4 dashes
		const dashes = screen.getAllByText("—");
		expect(dashes).toHaveLength(4);
	});

	test("applies red color class for positive deviation (overpaying)", () => {
		render(<ProcurementTable items={[mockItems[0]]} startIndex={0} onRowClick={() => {}} />);
		// Арматура: deviation = (55000-50000)/50000*100 = +10%
		const cells = document.querySelectorAll("[data-slot='table-cell']");
		const redCells = [...cells].filter((cell) => cell.className.includes("text-red-600"));
		// deviation cell + overpayment cell
		expect(redCells).toHaveLength(2);
	});

	test("applies green color class for negative deviation (savings)", () => {
		render(<ProcurementTable items={[mockItems[1]]} startIndex={0} onRowClick={() => {}} />);
		// Труба: deviation = (30000-35000)/35000*100 = -14.3%
		const cells = document.querySelectorAll("[data-slot='table-cell']");
		const greenCells = [...cells].filter((cell) => cell.className.includes("text-green-600"));
		// deviation cell + overpayment cell
		expect(greenCells).toHaveLength(2);
	});

	test("rows have cursor-pointer class", () => {
		render(<ProcurementTable items={mockItems} startIndex={0} onRowClick={() => {}} />);
		const dataRows = screen.getAllByRole("row").slice(1);
		for (const row of dataRows) {
			expect(row.className).toContain("cursor-pointer");
		}
	});

	test("calls onRowClick with correct item when row is clicked", async () => {
		const user = userEvent.setup();
		const handleRowClick = vi.fn();
		render(<ProcurementTable items={mockItems} startIndex={0} onRowClick={handleRowClick} />);

		await user.click(screen.getByText("Арматура А500"));
		expect(handleRowClick).toHaveBeenCalledWith(mockItems[0]);
	});
});
