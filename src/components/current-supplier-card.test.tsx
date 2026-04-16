import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { CurrentSupplier } from "@/data/types";

import { CurrentSupplierCard } from "./current-supplier-card";

const FULL_SUPPLIER: CurrentSupplier = {
	companyName: "МеталлТрейд",
	inn: "7701234567",
	paymentType: "deferred",
	deferralDays: 30,
	pricePerUnit: 4500,
};

describe("CurrentSupplierCard", () => {
	test("renders header with company name and all detail fields", () => {
		render(<CurrentSupplierCard currentSupplier={FULL_SUPPLIER} />);

		expect(screen.getByText(/Текущий поставщик/)).toBeInTheDocument();
		expect(screen.getByText("МеталлТрейд")).toBeInTheDocument();
		expect(screen.getByText("7701234567")).toBeInTheDocument();
		// deferralDays 30 → "30 дней"
		expect(screen.getByText(/30\s?дней/)).toBeInTheDocument();
		// pricePerUnit 4500 → "4 500 ₽"
		expect(screen.getByText(/4\s?500\s?₽/)).toBeInTheDocument();
	});

	test("displays 'Предоплата' when deferralDays is 0", () => {
		render(<CurrentSupplierCard currentSupplier={{ ...FULL_SUPPLIER, deferralDays: 0 }} />);
		expect(screen.getByText("Предоплата")).toBeInTheDocument();
	});

	test("handles null pricePerUnit and missing inn", () => {
		render(
			<CurrentSupplierCard
				currentSupplier={{
					companyName: "ТестКомпания",
					deferralDays: 0,
					pricePerUnit: null,
				}}
			/>,
		);

		expect(screen.getByText("ТестКомпания")).toBeInTheDocument();
		expect(screen.getByText("Предоплата")).toBeInTheDocument();
		const dashes = screen.getAllByText("—");
		expect(dashes.length).toBeGreaterThanOrEqual(2);
	});

	test("has muted background, border, and rounded styling", () => {
		const { container } = render(<CurrentSupplierCard currentSupplier={FULL_SUPPLIER} />);
		const card = container.firstElementChild as HTMLElement;
		expect(card.className).toMatch(/bg-muted/);
		expect(card.className).toMatch(/border/);
		expect(card.className).toMatch(/rounded-lg/);
	});
});
