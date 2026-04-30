import type { ProcurementInquiry } from "../types";

/** Map item id → parent tender slug. The single source of truth that pairs the
 * existing item seeds with the seeded tender roster. Items not in this map have
 * no tender (treated as legacy/unbundled). */
export const SEED_ITEM_TENDER: Readonly<Record<string, string>> = {
	"item-1": "T-001",
	"item-8": "T-001",
	"item-2": "T-002",
	"item-6": "T-002",
	"item-3": "T-003",
	"item-4": "T-004",
	"item-5": "T-005",
	"item-7": "T-006",
};

/** Hand-curated tenders grouping the existing item seeds by category affinity.
 * createdAt is spread 30–60 days back; deadlines 7–30 days out, with one
 * overdue example (T-006) so the deadline filter has something to surface. */
export const SEED_TENDERS: ProcurementInquiry[] = [
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
	},
];
