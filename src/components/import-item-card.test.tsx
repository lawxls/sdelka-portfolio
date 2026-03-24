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

	test("renders procurement type and frequency for regular items", () => {
		renderCard({
			name: "Арматура",
			procurementType: "regular",
			frequency: "monthly",
		});
		expect(screen.getByText("Тип закупки")).toBeInTheDocument();
		expect(screen.getByText("Регулярная")).toBeInTheDocument();
		expect(screen.getByText("Периодичность")).toBeInTheDocument();
		expect(screen.getByText("Ежемесячно")).toBeInTheDocument();
	});

	test("does not render frequency for one-time procurement", () => {
		renderCard({
			name: "Доска",
			procurementType: "one-time",
		});
		expect(screen.getByText("Разовая")).toBeInTheDocument();
		expect(screen.queryByText("Периодичность")).not.toBeInTheDocument();
	});

	test("renders delivery section when deliveryType present", () => {
		renderCard({
			name: "Труба",
			deliveryType: "warehouse",
			deliveryAddress: "г. Москва, ул. Строителей, 15",
		});
		expect(screen.getByText("Доставка")).toBeInTheDocument();
		expect(screen.getByText("До склада")).toBeInTheDocument();
		expect(screen.getByText("Адрес")).toBeInTheDocument();
		expect(screen.getByText("г. Москва, ул. Строителей, 15")).toBeInTheDocument();
	});

	test("renders payment section when payment fields present", () => {
		renderCard({
			name: "Плитка",
			paymentType: "deferred",
			paymentDeferralDays: 30,
			vatIncluded: true,
			paymentMethod: "bank_transfer",
		});
		expect(screen.getByText("Оплата")).toBeInTheDocument();
		expect(screen.getByText("Отсрочка")).toBeInTheDocument();
		expect(screen.getByText("Отсрочка (дн.)")).toBeInTheDocument();
		expect(screen.getByText("30")).toBeInTheDocument();
		expect(screen.getByText("С НДС")).toBeInTheDocument();
		expect(screen.getByText("Р/С")).toBeInTheDocument();
	});

	test("renders legal entity section when legalEntityMode present", () => {
		renderCard({
			name: "Подвес",
			legalEntityMode: "company",
			legalEntityCompany: "ООО СтройКом",
		});
		expect(screen.getByText("Юр. лицо")).toBeInTheDocument();
		// "Компания" appears as both value (Режим) and label (company field)
		expect(screen.getAllByText("Компания").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("ООО СтройКом")).toBeInTheDocument();
	});

	test("renders unloading and analogues when present", () => {
		renderCard({
			name: "Лист ГКЛ",
			unloading: "supplier",
			analoguesAllowed: true,
		});
		expect(screen.getByText("Разгрузка")).toBeInTheDocument();
		expect(screen.getByText("Силами поставщика")).toBeInTheDocument();
		expect(screen.getByText("Аналоги")).toBeInTheDocument();
		expect(screen.getByText("Допускаются")).toBeInTheDocument();
	});

	test("omits sections with no data", () => {
		renderCard({ name: "Только имя" });
		expect(screen.queryByText("Количество")).not.toBeInTheDocument();
		expect(screen.queryByText("Доставка")).not.toBeInTheDocument();
		expect(screen.queryByText("Оплата")).not.toBeInTheDocument();
		expect(screen.queryByText("Юр. лицо")).not.toBeInTheDocument();
		expect(screen.queryByText("Разгрузка")).not.toBeInTheDocument();
		expect(screen.queryByText("Аналоги")).not.toBeInTheDocument();
	});
});
