import type { SupplierSeed } from "../supplier-types";
import type { ProcurementItem } from "../types";

export const ITEM: ProcurementItem = {
	id: "item-12",
	name: "Клей расплав EVA для пласт. кромки",
	status: "searching",
	annualQuantity: 850,
	// Нет утверждённой текущей цены — в строке «Ваш поставщик» позиция не появится,
	// X/N покажет неполное покрытие.
	currentPrice: null,
	bestPrice: null,
	averagePrice: null,
	unit: "кг",
	quantityPerDelivery: 100,
	paymentType: "prepayment",
	deliveryCostType: "paid",
};

export const SUPPLIERS: SupplierSeed[] = [
	{
		id: "supplier-item-12-1",
		itemId: "item-12",
		companyName: "GTT",
		status: "quote_requested",
		archived: false,
		email: "info@gtt.ru",
		website: "https://gtt.ru",
		address: "г. Брянск, ул. Дятьковская, 8",
		pricePerUnit: null,
		tco: null,
		deliveryCost: null,
		deferralDays: 14,
		paymentType: "deferred",
		leadTimeDays: 7,
		agentComment: "Совместим с кромкой ПВХ. Подойдёт для общей закупки.",
		documents: [],
		chatHistory: [],
	},
	{
		id: "supplier-item-12-2",
		itemId: "item-12",
		companyName: "ХимТрейд",
		status: "quote_requested",
		archived: false,
		email: "info@chimtrade.ru",
		website: "https://chimtrade.ru",
		address: "г. Дзержинск, Восточная, 3",
		pricePerUnit: null,
		tco: null,
		deliveryCost: null,
		deferralDays: 0,
		paymentType: "prepayment",
		leadTimeDays: 7,
		agentComment: "Запросили КП по EVA расплаву.",
		documents: [],
		chatHistory: [],
	},
];
