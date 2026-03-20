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

	test("renders SKU label", () => {
		render(<SummaryPanel totals={mockTotals} />);
		expect(screen.getByText(/SKU/)).toBeInTheDocument();
	});

	test("renders export button", () => {
		render(<SummaryPanel totals={mockTotals} />);
		expect(screen.getByRole("button", { name: /Скачать таблицу/ })).toBeInTheDocument();
	});
});
