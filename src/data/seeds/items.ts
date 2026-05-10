import { ITEM as ITEM_2 } from "../items/item-2";
import { ITEM as ITEM_3 } from "../items/item-3";
import { ITEM as ITEM_4 } from "../items/item-4";
import { ITEM as ITEM_5 } from "../items/item-5";
import { ITEM as ITEM_6 } from "../items/item-6";
import { ITEM as ITEM_7 } from "../items/item-7";
import { ITEM as ITEM_8 } from "../items/item-8";
import { ITEM as ITEM_9 } from "../items/item-9";
import { ITEM as ITEM_10 } from "../items/item-10";
import { ITEM as ITEM_11 } from "../items/item-11";
import { ITEM as ITEM_12 } from "../items/item-12";
import type { ProcurementItem } from "../types";
import { SEED_ITEM_TENDER } from "./tenders";

const ITEM_1: ProcurementItem = {
	id: "item-1",
	name: "Полотно ПВД 2600 мм",
	status: "completed",
	annualQuantity: 180_000,
	currentPrice: 1776,
	// Computed from ORMATEK_SUPPLIERS quote_received TCOs (50 offers): min 1485, mean 2256.
	bestPrice: 1485,
	averagePrice: 2256,
	unit: "м",
	quantityPerDelivery: 15_000,
	paymentType: "prepayment",
	deliveryCostType: "paid",
	generatedAnswers: [
		{ questionId: "material-grade", selectedOption: "Первичка без вторсырья" },
		{ questionId: "certificates", selectedOption: "Паспорт качества", freeText: "На каждую партию" },
	],
};

const RAW_ITEMS: ProcurementItem[] = [
	ITEM_1,
	ITEM_2,
	ITEM_3,
	ITEM_4,
	ITEM_5,
	ITEM_6,
	ITEM_7,
	ITEM_8,
	ITEM_9,
	ITEM_10,
	ITEM_11,
	ITEM_12,
];

export const SEED_ITEMS: ProcurementItem[] = RAW_ITEMS.map((item) => {
	const tenderId = SEED_ITEM_TENDER[item.id];
	return tenderId ? { ...item, tenderId } : { ...item };
});

export const SEED_ARCHIVED: string[] = [];
