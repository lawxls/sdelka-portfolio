import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { CurrentSupplier } from "@/data/types";

import { CurrentSupplierCard } from "./current-supplier-card";

const FULL_SUPPLIER: CurrentSupplier = {
	companyName: "МеталлТрейд",
	deliveryCost: 15000,
	deferralDays: 30,
	pricePerUnit: 4500,
	tco: 5400000,
};

describe("CurrentSupplierCard", () => {
	test("renders all 5 fields with correct formatting", () => {
		render(<CurrentSupplierCard currentSupplier={FULL_SUPPLIER} />);

		expect(screen.getByText("Текущий поставщик")).toBeInTheDocument();
		expect(screen.getByText("МеталлТрейд")).toBeInTheDocument();
		// deliveryCost 15000 → "15 000 ₽" (Intl.NumberFormat ru-RU)
		expect(screen.getByText(/15\s?000\s?₽/)).toBeInTheDocument();
		// deferralDays 30 → "30 дней"
		expect(screen.getByText(/30\s?дней/)).toBeInTheDocument();
		// pricePerUnit 4500 → "4 500 ₽"
		expect(screen.getByText(/4\s?500\s?₽/)).toBeInTheDocument();
		// tco 5400000 → "5 400 000 ₽"
		expect(screen.getByText(/5\s?400\s?000\s?₽/)).toBeInTheDocument();
	});

	test("displays delivery as 'Включена' when deliveryCost is 0", () => {
		render(<CurrentSupplierCard currentSupplier={{ ...FULL_SUPPLIER, deliveryCost: 0 }} />);
		expect(screen.getByText("Включена")).toBeInTheDocument();
	});

	test("handles null values for optional numeric fields", () => {
		render(
			<CurrentSupplierCard
				currentSupplier={{
					companyName: "ТестКомпания",
					deliveryCost: null,
					deferralDays: 0,
					pricePerUnit: null,
					tco: null,
				}}
			/>,
		);

		expect(screen.getByText("ТестКомпания")).toBeInTheDocument();
		// null delivery → "Самовывоз"
		expect(screen.getByText("Самовывоз")).toBeInTheDocument();
		// deferralDays 0 → "Предоплата"
		expect(screen.getByText("Предоплата")).toBeInTheDocument();
		// null pricePerUnit and tco → "—"
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
