import type { Tariff } from "../domains/tariffs";
import { delay } from "../mock-utils";
import type { TariffsClient } from "./tariffs-client";

const DEFAULT_TARIFFS: Tariff[] = [
	{
		id: "tariff-start",
		slug: "start",
		name: "Старт",
		shortDescription: "",
		fullDescription: "",
		priceType: "fixed",
		price: 19_900,
		yearlyPrice: 199_900,
		yearlyPriceDiscount: 16,
		monthlyInquiryLimit: 5,
		dailyInquiryLimit: null,
		inquiriesPerMonth: 5,
		inquiriesPerYear: 65,
		maxEmployees: 2,
		maxCompanies: 1,
		dailyEmailLimit: 300,
		isPopular: false,
		displayOrder: 10,
		features: [
			{ position: 1, name: "Поиск поставщиков" },
			{ position: 2, name: "Генерация и рассылка RFQ" },
			{ position: 3, name: "ИИ-переговоры" },
			{ position: 4, name: "Сравнение КП" },
			{ position: 5, name: "2 сотрудника · 1 компания" },
			{ position: 6, name: "300 писем в день" },
		],
	},
	{
		id: "tariff-business",
		slug: "business",
		name: "Бизнес",
		shortDescription: "",
		fullDescription: "",
		priceType: "fixed",
		price: 49_900,
		yearlyPrice: 499_900,
		yearlyPriceDiscount: 16,
		monthlyInquiryLimit: 15,
		dailyInquiryLimit: null,
		inquiriesPerMonth: 15,
		inquiriesPerYear: 200,
		maxEmployees: 5,
		maxCompanies: 3,
		dailyEmailLimit: 700,
		isPopular: true,
		displayOrder: 20,
		features: [
			{ position: 1, name: "Всё из тарифа Старт" },
			{ position: 2, name: "Проверка надёжности" },
			{ position: 3, name: "Персональный менеджер" },
			{ position: 4, name: "5 сотрудников · 3 компании" },
			{ position: 5, name: "Максимальная глубина" },
			{ position: 6, name: "700 писем в день" },
			{ position: 7, name: "Выездное обучение" },
		],
	},
	{
		id: "tariff-enterprise",
		slug: "enterprise",
		name: "Корпорация",
		shortDescription: "Стоимость и лимиты под объём вашей закупочной функции",
		fullDescription: "",
		priceType: "individual",
		price: null,
		yearlyPrice: null,
		yearlyPriceDiscount: 0,
		monthlyInquiryLimit: null,
		dailyInquiryLimit: null,
		inquiriesPerMonth: null,
		inquiriesPerYear: null,
		maxEmployees: null,
		maxCompanies: null,
		dailyEmailLimit: null,
		isPopular: false,
		displayOrder: 30,
		features: [
			{ position: 1, name: "Индивидуальные лимиты" },
			{ position: 2, name: "Индивидуальные интеграции" },
			{ position: 3, name: "Функции на заказ" },
			{ position: 4, name: "on-premise" },
			{ position: 5, name: "Приоритетная поддержка" },
			{ position: 6, name: "Спецусловия по объёму" },
		],
	},
];

export interface InMemoryTariffsOptions {
	tariffs?: Tariff[];
}

export function createInMemoryTariffsClient(options?: InMemoryTariffsOptions): TariffsClient {
	const state: Tariff[] = (options?.tariffs ?? DEFAULT_TARIFFS).map((t) => ({
		...t,
		features: t.features.map((f) => ({ ...f })),
	}));

	return {
		async list(): Promise<Tariff[]> {
			await delay();
			return state
				.slice()
				.sort((a, b) => a.displayOrder - b.displayOrder || a.slug.localeCompare(b.slug))
				.map((t) => ({ ...t, features: t.features.map((f) => ({ ...f })) }));
		},
	};
}
