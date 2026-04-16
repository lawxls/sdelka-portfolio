import type { NewItemInput } from "./types";

const MOCK_ITEMS: NewItemInput[] = [
	{ name: "Арматура А500С ∅12", unit: "т", annualQuantity: 50, currentPrice: 45000 },
	{ name: "Бетон М300 В22.5", unit: "м³", annualQuantity: 200, currentPrice: 5200 },
	{ name: "Кирпич керамический М150", unit: "шт", annualQuantity: 50000, currentPrice: 12 },
	{ name: "Цемент ПЦ 500", unit: "т", annualQuantity: 100, currentPrice: 6800 },
	{ name: "Песок строительный", unit: "м³", annualQuantity: 300, currentPrice: 900 },
	{ name: "Щебень гранитный 5-20", unit: "м³", annualQuantity: 150, currentPrice: 1800 },
	{ name: "Доска обрезная 50×150", unit: "м³", annualQuantity: 30, currentPrice: 12000 },
	{ name: "Утеплитель минвата 100мм", unit: "м²", annualQuantity: 500, currentPrice: 380 },
	{ name: "Гидроизоляция рулонная", unit: "м²", annualQuantity: 1000, currentPrice: 250 },
	{ name: "Профнастил С21", unit: "м²", annualQuantity: 800, currentPrice: 650 },
	{
		name: "Труба ПНД 110мм",
		unit: "м",
		annualQuantity: 200,
		currentPrice: 320,
		deliveryCostType: "free",
		deliveryAddresses: ["г. Москва, ул. Строителей, 15"],
	},
	{ name: "Электрокабель ВВГнг 3×2.5", unit: "м", annualQuantity: 5000, currentPrice: 85 },
	{ name: "Краска фасадная белая", unit: "л", annualQuantity: 200, currentPrice: 450 },
	{ name: "Саморезы кровельные 4.8×35", unit: "уп", annualQuantity: 100, currentPrice: 380 },
	{ name: "Сетка кладочная 50×50", unit: "м²", annualQuantity: 300, currentPrice: 95 },
	{
		name: "Плитка керамогранит 600×600",
		unit: "м²",
		annualQuantity: 400,
		currentPrice: 1200,
		paymentType: "deferred",
	},
	{ name: "Смесь штукатурная гипсовая", unit: "кг", annualQuantity: 2000, currentPrice: 18 },
	{ name: "Герметик силиконовый", unit: "шт", annualQuantity: 50, currentPrice: 320 },
	{
		name: "Анкер-болт 12×120",
		unit: "шт",
		annualQuantity: 1000,
		currentPrice: 35,
		paymentMethod: "bank_transfer",
	},
	{ name: "Пена монтажная профессиональная", unit: "шт", annualQuantity: 200, currentPrice: 480 },
	{
		name: "Лист ГКЛ 12.5мм",
		unit: "шт",
		annualQuantity: 300,
		currentPrice: 420,
		unloading: "supplier",
		analoguesAllowed: true,
	},
	{ name: "Профиль потолочный 60×27", unit: "шт", annualQuantity: 500, currentPrice: 180 },
	{ name: "Подвес прямой", unit: "шт", annualQuantity: 2000, currentPrice: 12, sampleRequired: true },
];

export function parseFile(_file: File): Promise<NewItemInput[]> {
	return new Promise((resolve) => {
		setTimeout(() => resolve(MOCK_ITEMS), 1500);
	});
}
