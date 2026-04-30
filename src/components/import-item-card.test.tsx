import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { NewItemInput } from "@/data/types";
import { ImportItemCard } from "./import-item-card";

function renderCard(item: NewItemInput, index = 0) {
	return render(<ImportItemCard item={item} index={index} />);
}

describe("ImportItemCard", () => {
	test("renders index and item name", () => {
		renderCard({ name: "Арматура А500С" }, 4);
		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("Арматура А500С")).toBeInTheDocument();
	});

	test("renders description when provided", () => {
		renderCard({ name: "Бетон", description: "Марка М300" });
		expect(screen.getByText("Марка М300")).toBeInTheDocument();
	});

	test("does not crash with minimal item (name only)", () => {
		renderCard({ name: "Минимальный товар" });
		expect(screen.getByText("Минимальный товар")).toBeInTheDocument();
	});

	test("renders basic info fields: quantity, unit, price", () => {
		renderCard({
			name: "Цемент",
			annualQuantity: 100,
			unit: "т",
			currentPrice: 6800,
		});
		expect(screen.getByText("Количество")).toBeInTheDocument();
		expect(screen.getByText("100")).toBeInTheDocument();
		expect(screen.getByText("Ед. измерения")).toBeInTheDocument();
		expect(screen.getByText("т")).toBeInTheDocument();
		expect(screen.getByText("Цена")).toBeInTheDocument();
		expect(screen.getByText("6 800 ₽")).toBeInTheDocument();
	});

	test("renders delivery section when deliveryCostType present", () => {
		renderCard({
			name: "Труба",
			deliveryCostType: "free",
		});
		expect(screen.getByText("Доставка")).toBeInTheDocument();
		expect(screen.getByText("Бесплатная")).toBeInTheDocument();
	});

	test("renders payment section when payment fields present", () => {
		renderCard({
			name: "Плитка",
			paymentType: "deferred",
		});
		expect(screen.getByText("Оплата")).toBeInTheDocument();
		expect(screen.getByText("Отсрочка")).toBeInTheDocument();
	});

	test("omits sections with no data", () => {
		renderCard({ name: "Только имя" });
		expect(screen.queryByText("Количество")).not.toBeInTheDocument();
		expect(screen.queryByText("Доставка")).not.toBeInTheDocument();
		expect(screen.queryByText("Оплата")).not.toBeInTheDocument();
	});
});
