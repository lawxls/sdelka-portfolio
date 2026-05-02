import type { SupplierSeed } from "../supplier-types";
import type { ProcurementItem } from "../types";

export const ITEM: ProcurementItem = {
	id: "item-12",
	name: "Клей расплав EVA для пласт. кромки",
	status: "searching",
	annualQuantity: 850,
	// 0 — нет утверждённой текущей цены поставщика. В строке «Ваш поставщик»
	// этот пункт не появится, и X/N покажет неполное покрытие.
	currentPrice: 0,
	bestPrice: 412,
	averagePrice: 460,
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
		status: "получено_кп",
		archived: false,
		email: "info@gtt.ru",
		website: "https://gtt.ru",
		address: "г. Брянск, ул. Дятьковская, 8",
		pricePerUnit: 412,
		tco: 425,
		rating: 82,
		deliveryCost: 12,
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
		status: "кп_запрошено",
		archived: false,
		email: "info@chimtrade.ru",
		website: "https://chimtrade.ru",
		address: "г. Дзержинск, Восточная, 3",
		pricePerUnit: null,
		tco: null,
		rating: null,
		deliveryCost: null,
		deferralDays: 0,
		paymentType: "prepayment",
		leadTimeDays: 7,
		agentComment: "Запросили КП по EVA расплаву.",
		documents: [],
		chatHistory: [],
	},
];
