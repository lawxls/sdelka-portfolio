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

	test("renders frequency when frequencyCount and frequencyPeriod present", () => {
		renderCard({
			name: "Арматура",
			frequencyCount: 3,
			frequencyPeriod: "month",
		});
		expect(screen.getByText("Частота поставок")).toBeInTheDocument();
		expect(screen.getByText("3 раз(а) в Месяц")).toBeInTheDocument();
	});

	test("does not render frequency when only count is set", () => {
		renderCard({
			name: "Доска",
			frequencyCount: 1,
		});
		expect(screen.queryByText("Частота поставок")).not.toBeInTheDocument();
	});

	test("renders delivery section when deliveryType present", () => {
		renderCard({
			name: "Труба",
			deliveryType: "warehouse",
			deliveryAddresses: ["г. Москва, ул. Строителей, 15"],
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
			paymentMethod: "bank_transfer",
		});
		expect(screen.getByText("Оплата")).toBeInTheDocument();
		expect(screen.getByText("Отсрочка")).toBeInTheDocument();
		expect(screen.getByText("Отсрочка (дн.)")).toBeInTheDocument();
		expect(screen.getByText("30")).toBeInTheDocument();
		expect(screen.getByText("Р/С")).toBeInTheDocument();
	});

	test("renders hide company info when set", () => {
		renderCard({
			name: "Подвес",
			hideCompanyInfo: true,
		});
		expect(screen.getByText("Компания")).toBeInTheDocument();
		expect(screen.getByText("Информация скрыта")).toBeInTheDocument();
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

	test("renders additional info when present", () => {
		renderCard({
			name: "Товар",
			additionalInfo: "Особые условия хранения",
		});
		expect(screen.getByText("Дополнительная информация")).toBeInTheDocument();
		expect(screen.getByText("Особые условия хранения")).toBeInTheDocument();
	});

	test("renders price monitoring period when present", () => {
		renderCard({
			name: "Товар",
			priceMonitoringPeriod: "quarter",
		});
		expect(screen.getByText("Мониторинг цен")).toBeInTheDocument();
		expect(screen.getByText("Квартал")).toBeInTheDocument();
	});

	test("omits sections with no data", () => {
		renderCard({ name: "Только имя" });
		expect(screen.queryByText("Количество")).not.toBeInTheDocument();
		expect(screen.queryByText("Доставка")).not.toBeInTheDocument();
		expect(screen.queryByText("Оплата")).not.toBeInTheDocument();
		expect(screen.queryByText("Компания")).not.toBeInTheDocument();
		expect(screen.queryByText("Разгрузка")).not.toBeInTheDocument();
		expect(screen.queryByText("Аналоги")).not.toBeInTheDocument();
	});
});
