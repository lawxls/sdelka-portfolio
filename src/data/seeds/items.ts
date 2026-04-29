import { ITEM as ITEM_2 } from "../items/item-2";
import { ITEM as ITEM_3 } from "../items/item-3";
import { ITEM as ITEM_4 } from "../items/item-4";
import { ITEM as ITEM_5 } from "../items/item-5";
import { ITEM as ITEM_6 } from "../items/item-6";
import { ITEM as ITEM_7 } from "../items/item-7";
import { ITEM as ITEM_8 } from "../items/item-8";
import type { ProcurementItem } from "../types";

const ITEM_1: ProcurementItem = {
	id: "item-1",
	name: "Полотно ПВД 2600 мм",
	status: "completed",
	annualQuantity: 180_000,
	currentPrice: 1776,
	// Computed from ORMATEK_SUPPLIERS получено_кп TCOs (50 offers): min 1485, mean 2256.
	bestPrice: 1485,
	averagePrice: 2256,
	folderId: "folder-packaging",
	companyId: "company-1",
	unit: "м",
	taskCount: 16,
	quantityPerDelivery: 15_000,
	paymentType: "prepayment",
	paymentMethod: "bank_transfer",
	deliveryCostType: "paid",
	deliveryAddresses: ["Ростовская обл., Аксайский р-н, Южная промзона"],
	unloading: "supplier",
	analoguesAllowed: true,
	additionalInfo: "Полотно ПВД первичка (без вторсырья), ширина 2600 мм, прозрачное.",
	currentSupplier: {
		companyName: "ПолимерПром",
		inn: "6164012345",
		paymentType: "prepayment",
		deferralDays: 0,
		pricePerUnit: 1776,
	},
	generatedAnswers: [
		{ questionId: "material-grade", selectedOption: "Первичка без вторсырья" },
		{ questionId: "certificates", selectedOption: "Паспорт качества", freeText: "На каждую партию" },
	],
	attachedFiles: [{ name: "specification-pvd-2600.pdf", size: 204_800 }],
};

export const SEED_ITEMS: ProcurementItem[] = [ITEM_1, ITEM_2, ITEM_3, ITEM_4, ITEM_5, ITEM_6, ITEM_7, ITEM_8];

export const SEED_ARCHIVED: string[] = [];
