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
import { ITEM as ITEM_13 } from "../items/item-13";
import type { CurrentSupplier, ProcurementItem } from "../types";

/** Map item id → parent inquiry slug. Re-homed here from the deleted inquiry
 * seeds so item fixtures keep their parent linkage in dev/test even though
 * inquiries themselves now live behind the HTTP adapter. */
const SEED_ITEM_PROCUREMENT_INQUIRY: Readonly<Record<string, string>> = {
	"item-1": "T-001",
	"item-8": "T-001",
	"item-2": "T-002",
	"item-6": "T-002",
	"item-3": "T-003",
	"item-4": "T-004",
	"item-9": "T-004",
	"item-10": "T-004",
	"item-11": "T-004",
	"item-12": "T-004",
	"item-13": "T-002",
	"item-5": "T-005",
	"item-7": "T-006",
	"item-14": "T-006",
	"item-15": "T-006",
	"item-16": "T-006",
};

const SEED_INQUIRY_CURRENT_SUPPLIER: Readonly<Record<string, CurrentSupplier>> = {
	"T-001": {
		companyName: "ПолимерПром",
		inn: "6164012345",
		paymentType: "prepayment",
		deferralDays: 0,
		pricePerUnit: 1776,
	},
	"T-002": {
		companyName: "Изолон",
		inn: "7710123456",
		paymentType: "deferred",
		deferralDays: 30,
		pricePerUnit: 167_675,
	},
	"T-003": {
		companyName: "Ивановский текстиль",
		inn: "7712345678",
		paymentType: "deferred",
		deferralDays: 30,
		pricePerUnit: 473,
	},
	"T-004": {
		companyName: "Kronospan",
		inn: "5012345678",
		paymentType: "deferred",
		deferralDays: 45,
		pricePerUnit: 1190,
	},
	"T-005": {
		companyName: "ТД «Боннель»",
		inn: "7725123456",
		paymentType: "prepayment",
		deferralDays: 0,
		pricePerUnit: 2154,
	},
};

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
};

// Companions to ITEM_7 inside inquiry T-006. Kept inline (no supplier seeds) so the
// inquiry surfaces multiple positions without `currentSupplier` — exercises the
// «Выберите позицию» picker before the «Добавить текущего поставщика» dialog.
const ITEM_14: ProcurementItem = {
	id: "item-14",
	name: "Растворитель для ПУ-клеёв",
	status: "searching",
	annualQuantity: 1_200,
	currentPrice: 380,
	bestPrice: null,
	averagePrice: null,
	unit: "л",
	quantityPerDelivery: 200,
	paymentType: "prepayment",
	deliveryCostType: "paid",
};

const ITEM_15: ProcurementItem = {
	id: "item-15",
	name: "Активатор адгезии",
	status: "searching",
	annualQuantity: 600,
	currentPrice: 1_240,
	bestPrice: null,
	averagePrice: null,
	unit: "л",
	quantityPerDelivery: 50,
	paymentType: "prepayment",
	deliveryCostType: "paid",
};

const ITEM_16: ProcurementItem = {
	id: "item-16",
	name: "Очиститель форсунок клеенаносящих станков",
	status: "searching",
	annualQuantity: 360,
	currentPrice: 920,
	bestPrice: null,
	averagePrice: null,
	unit: "л",
	quantityPerDelivery: 30,
	paymentType: "prepayment",
	deliveryCostType: "paid",
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
	ITEM_13,
	ITEM_14,
	ITEM_15,
	ITEM_16,
];

export const SEED_ITEMS: ProcurementItem[] = RAW_ITEMS.map((item) => {
	const procurementInquiryId = SEED_ITEM_PROCUREMENT_INQUIRY[item.id];
	const currentSupplier = procurementInquiryId ? SEED_INQUIRY_CURRENT_SUPPLIER[procurementInquiryId] : undefined;
	return {
		...item,
		...(procurementInquiryId && { procurementInquiryId }),
		...(currentSupplier && { currentSupplier }),
	};
});

export const SEED_ARCHIVED: string[] = [];
