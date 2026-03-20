import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { Totals } from "@/data/types";
import { SummaryPanel } from "./summary-panel";

const mockTotals: Totals = {
	totalDeviation: 500000,
	totalOverpayment: 1200000,
	totalSavings: 700000,
	itemCount: 50,
};

describe("SummaryPanel", () => {
	test("renders item count", () => {
		render(<SummaryPanel totals={mockTotals} />);
		expect(screen.getByText("50")).toBeInTheDocument();
	});

	test("renders all metric labels", () => {
		render(<SummaryPanel totals={mockTotals} />);
		expect(screen.getByText(/Позиций/)).toBeInTheDocument();
		expect(screen.getByText(/Общее отклонение/)).toBeInTheDocument();
		expect(screen.getByText(/Переплата/)).toBeInTheDocument();
		expect(screen.getByText(/Экономия/)).toBeInTheDocument();
	});

	test("renders export button", () => {
		render(<SummaryPanel totals={mockTotals} />);
		expect(screen.getByRole("button", { name: /Скачать таблицу/ })).toBeInTheDocument();
	});

	test("applies red color for positive total deviation", () => {
		render(<SummaryPanel totals={mockTotals} />);
		const deviationLabel = screen.getByText(/Общее отклонение/);
		const deviationValue = deviationLabel.parentElement?.querySelector(".tabular-nums");
		expect(deviationValue?.className).toContain("text-red-600");
	});

	test("applies green color for savings", () => {
		render(<SummaryPanel totals={mockTotals} />);
		const savingsLabel = screen.getByText(/Экономия/);
		const savingsValue = savingsLabel.parentElement?.querySelector(".tabular-nums");
		expect(savingsValue?.className).toContain("text-green-600");
	});
});
