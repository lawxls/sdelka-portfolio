import type { CurrentSupplier, ProcurementInquiry } from "../types";

/** Map item id → parent inquiry slug. The single source of truth that pairs the
 * existing item seeds with the seeded inquiry roster. Items not in this map have
 * no inquiry (treated as legacy/unbundled). */
export const SEED_ITEM_PROCUREMENT_INQUIRY: Readonly<Record<string, string>> = {
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

/** «Ваш поставщик» seed per inquiry slug. Migrated from the inquiry roster after
 * `currentSupplier` moved to `ProcurementItem`. `seeds/items.ts` attaches the
 * matching supplier to every item whose `procurementInquiryId` matches the key. */
export const SEED_INQUIRY_CURRENT_SUPPLIER: Readonly<Record<string, CurrentSupplier>> = {
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

/** Hand-curated inquiries grouping the existing item seeds by category affinity.
 * createdAt is spread 30–60 days back; deadlines 7–30 days out, with one
 * overdue example (T-006) so the deadline filter has something to surface. */
export const SEED_PROCUREMENT_INQUIRIES: ProcurementInquiry[] = [
	{
		id: "T-001",
		name: "Упаковочные материалы Q2",
		companyId: "company-1",
		folderId: "folder-packaging",
		budget: 350_000_000,
		createdAt: "2026-03-25",
		deadline: "2026-05-15",
		addressIds: ["addr-aksay"],
		paymentMethod: "bank_transfer",
		unloading: "supplier",
		analoguesAllowed: true,
		additionalInfo: "Полотно ПВД первичка (без вторсырья), ширина 2600 мм, прозрачное.",
		attachedFiles: [{ name: "specification-pvd-2600.pdf", size: 204_800 }],
	},
	{
		id: "T-002",
		name: "Наполнители ППУ + кокос",
		companyId: "company-1",
		folderId: "folder-fillings",
		budget: 230_000_000,
		createdAt: "2026-03-15",
		deadline: "2026-05-10",
		addressIds: ["addr-aksay"],
		paymentMethod: "bank_transfer",
		unloading: "supplier",
		sampleRequired: true,
		additionalInfo: "ППУ марки ST2240, плотность 22 кг/м³, нагрузка 4,0 кПа. Сертификат соответствия обязателен.",
	},
	{
		id: "T-003",
		name: "Жаккард 360 г/м² на год",
		companyId: "company-1",
		folderId: "folder-fabrics",
		budget: 410_000_000,
		createdAt: "2026-03-05",
		deadline: "2026-05-22",
		addressIds: ["addr-aksay"],
		paymentMethod: "bank_transfer",
		unloading: "supplier",
		analoguesAllowed: true,
		sampleRequired: true,
		additionalInfo: "Трикотажный жаккард, плотность 360 г/м², полотно — стрейч. Светоустойчивость 4–5 баллов.",
	},
	{
		id: "T-004",
		name: "ЛДСП дуб сонома, годовой контракт",
		companyId: "company-1",
		folderId: "folder-panels",
		budget: 60_000_000,
		createdAt: "2026-04-02",
		deadline: "2026-05-20",
		addressIds: ["addr-aksay"],
		paymentMethod: "bank_transfer",
		unloading: "supplier",
		analoguesAllowed: true,
		additionalInfo: "ЛДСП E0,5, класс эмиссии формальдегида E1. Декор «дуб сонома». Формат 2750×1830.",
	},
	{
		id: "T-005",
		name: "Пружинные блоки Bonnel 120×200",
		companyId: "company-1",
		folderId: "folder-springs",
		budget: 220_000_000,
		createdAt: "2026-04-10",
		deadline: "2026-05-25",
		addressIds: ["addr-aksay"],
		paymentMethod: "bank_transfer",
		unloading: "supplier",
		sampleRequired: true,
		additionalInfo:
			"Пружинный блок «Боннель» 120×200×120 мм, проволока 2,2 мм, 108 пружин/м². Сертификат ГОСТ Р 52584.",
	},
	{
		id: "T-006",
		name: "Клей ПУ для мебельного производства",
		companyId: "company-1",
		folderId: "folder-chemistry",
		budget: 6_500_000,
		createdAt: "2026-03-01",
		deadline: "2026-04-20",
		addressIds: ["addr-aksay"],
		paymentMethod: "bank_transfer",
		unloading: "supplier",
		analoguesAllowed: true,
		sampleRequired: true,
		additionalInfo:
			"Клей полиуретановый одно-компонентный, время открытой выдержки ≥ 3 мин, расход ≤ 80 г/м². Сертификат гигиенический.",
	},
];
