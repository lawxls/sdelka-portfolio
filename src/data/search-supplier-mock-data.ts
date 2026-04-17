import { stripProtocol } from "@/lib/format";
import type {
	SearchSupplier,
	SearchSupplierCompanyType,
	SearchSupplierFilterParams,
	SearchSupplierSortField,
} from "./search-supplier-types";
import { _appendSupplierForItem } from "./supplier-mock-data";
import type { Supplier } from "./supplier-types";

const COMPANY_POOL: { name: string; type: SearchSupplierCompanyType; domain: string }[] = [
	{ name: "ООО «СтальПром»", type: "производитель", domain: "stalprom.ru" },
	{ name: "ЗАО «МеталлИнвест»", type: "производитель", domain: "metallinvest.ru" },
	{ name: "ООО «Восток-Металл»", type: "производитель", domain: "vostok-metall.ru" },
	{ name: "ООО «УралСтальКомплект»", type: "производитель", domain: "uralstal.ru" },
	{ name: "ЗАО «Северсталь-Трейд»", type: "дистрибьютор", domain: "severstal-trade.ru" },
	{ name: "ООО «ПромСнаб-Поволжье»", type: "дистрибьютор", domain: "promsnab-povolzhe.ru" },
	{ name: "ООО «ТоргСнабМеталл»", type: "дистрибьютор", domain: "torgsnab-metall.ru" },
	{ name: "ООО «ГлавМетКом»", type: "дистрибьютор", domain: "glavmetkom.ru" },
	{ name: "ООО «Металл-Экспресс»", type: "дилер", domain: "metall-express.ru" },
	{ name: "ИП Соловьёв М.А.", type: "дилер", domain: "solovev-metal.ru" },
	{ name: "ООО «ПрофильТорг»", type: "дилер", domain: "profiltorg.ru" },
	{ name: "ООО «СибМетКомплект»", type: "дилер", domain: "sibmetcomplekt.ru" },
	{ name: "ООО «АрматураЦентр»", type: "производитель", domain: "armaturacentr.ru" },
	{ name: "ООО «МеталлСтандарт»", type: "производитель", domain: "metallstandart.ru" },
	{ name: "ООО «СтройМетКомплект»", type: "дистрибьютор", domain: "stroymetcomplekt.ru" },
	{ name: "ЗАО «ПромСталь»", type: "производитель", domain: "promstal.ru" },
	{ name: "ООО «КраснодарМет»", type: "дилер", domain: "krasnodarmet.ru" },
	{ name: "ООО «ДонСталь»", type: "дистрибьютор", domain: "donstal.ru" },
	{ name: "ООО «БалтСнабСталь»", type: "дистрибьютор", domain: "baltsnabstal.ru" },
	{ name: "ИП Королёв А.Н.", type: "дилер", domain: "korolev-metal.ru" },
	{ name: "ООО «МетПрофСнаб»", type: "дилер", domain: "metprofsnab.ru" },
	{ name: "ООО «ЮгМетПром»", type: "производитель", domain: "yugmetprom.ru" },
	{ name: "ЗАО «ПроСтальГрупп»", type: "дистрибьютор", domain: "prostalgrupp.ru" },
	{ name: "ООО «СтальРесурс»", type: "производитель", domain: "stalresurs.ru" },
	{ name: "ООО «МеталлТрейдОпт»", type: "дистрибьютор", domain: "metalltradeopt.ru" },
];

const REGIONS = [
	"Москва",
	"Санкт-Петербург",
	"Свердловская область",
	"Челябинская область",
	"Новосибирская область",
	"Республика Татарстан",
	"Нижегородская область",
	"Ростовская область",
	"Самарская область",
	"Краснодарский край",
	"Воронежская область",
	"Пермский край",
	"Красноярский край",
	"Тульская область",
	"Ленинградская область",
];

const REVENUE_TIERS = [10_000_000, 45_000_000, 120_000_000, 350_000_000, 900_000_000, 1_800_000_000, 5_000_000_000];

const SUPPLIERS_PER_ITEM = 20;

function itemSeed(itemId: string): number {
	let hash = 0;
	for (const ch of itemId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
	return Math.abs(hash) % 10_000;
}

function makeInn(seed: number, idx: number): string {
	// 10-digit legal-entity INN, deterministic per seed+idx.
	const base = ((seed + 1) * 100_000 + idx * 37) % 10_000_000_000;
	return base.toString().padStart(10, "0");
}

function createSearchSuppliersForItem(itemId: string): SearchSupplier[] {
	const seed = itemSeed(itemId);

	return Array.from({ length: SUPPLIERS_PER_ITEM }, (_, i) => {
		const poolIdx = (seed + i * 7) % COMPANY_POOL.length;
		const pool = COMPANY_POOL[poolIdx];
		const regionIdx = (seed + i * 13) % REGIONS.length;
		const revenueIdx = (seed + i * 17) % REVENUE_TIERS.length;
		const foundedYear = 1992 + ((seed + i * 11) % 30);
		// Two pre-requested (i = 3, 9), one pre-archived (i = 7).
		const requestStatus = i === 3 || i === 9 ? "requested" : "new";
		const archived = i === 7;

		return {
			id: `search-supplier-${itemId}-${i + 1}`,
			itemId,
			companyName: pool.name,
			inn: makeInn(seed, i),
			website: `https://${pool.domain}`,
			companyType: pool.type,
			region: REGIONS[regionIdx],
			foundedYear,
			revenue: REVENUE_TIERS[revenueIdx],
			requestStatus,
			archived,
		};
	});
}

let store: Map<string, SearchSupplier[]> = new Map();

function getSearchSuppliersForItem(itemId: string): SearchSupplier[] {
	let entries = store.get(itemId);
	if (!entries) {
		entries = createSearchSuppliersForItem(itemId);
		store.set(itemId, entries);
	}
	return entries;
}

export function _resetSearchSupplierStore() {
	store = new Map();
}

let delayConfig = { min: 120, max: 200 };

export function _setSearchSupplierMockDelay(min: number, max: number) {
	delayConfig = { min, max };
}

function simulateDelay(): Promise<void> {
	const ms = delayConfig.min + Math.floor(Math.random() * (delayConfig.max - delayConfig.min + 1));
	if (ms <= 0) return Promise.resolve();
	return new Promise((r) => setTimeout(r, ms));
}

function applyFilters(entries: SearchSupplier[], params?: SearchSupplierFilterParams): SearchSupplier[] {
	let result = params?.showArchived ? entries.filter((e) => e.archived) : entries.filter((e) => !e.archived);

	if (params?.search) {
		const q = params.search.toLowerCase();
		result = result.filter((e) => e.companyName.toLowerCase().includes(q) || e.inn.includes(params.search as string));
	}

	if (params?.companyTypes && params.companyTypes.length > 0) {
		const set = new Set(params.companyTypes);
		result = result.filter((e) => set.has(e.companyType));
	}

	if (params?.requestStatuses && params.requestStatuses.length > 0) {
		const set = new Set(params.requestStatuses);
		result = result.filter((e) => set.has(e.requestStatus));
	}

	result = sort(result, params?.sort, params?.dir ?? "asc");
	return result;
}

function sort(
	entries: SearchSupplier[],
	field: SearchSupplierSortField | undefined,
	dir: "asc" | "desc",
): SearchSupplier[] {
	const sorted = [...entries];
	const mul = dir === "asc" ? 1 : -1;
	if (!field) {
		sorted.sort((a, b) => a.companyName.localeCompare(b.companyName, "ru"));
		return sorted;
	}
	sorted.sort((a, b) => {
		if (field === "companyName") {
			return mul * a.companyName.localeCompare(b.companyName, "ru");
		}
		return mul * ((a[field] as number) - (b[field] as number));
	});
	return sorted;
}

export async function listSearchSuppliers(
	itemId: string,
	params?: SearchSupplierFilterParams,
): Promise<SearchSupplier[]> {
	await simulateDelay();
	return applyFilters(getSearchSuppliersForItem(itemId), params);
}

export async function archiveSearchSuppliers(itemId: string, ids: string[]): Promise<void> {
	await simulateDelay();
	const entries = getSearchSuppliersForItem(itemId);
	const set = new Set(ids);
	store.set(
		itemId,
		entries.map((e) => (set.has(e.id) ? { ...e, archived: true } : e)),
	);
}

export async function unarchiveSearchSuppliers(itemId: string, ids: string[]): Promise<void> {
	await simulateDelay();
	const entries = getSearchSuppliersForItem(itemId);
	const set = new Set(ids);
	store.set(
		itemId,
		entries.map((e) => (set.has(e.id) ? { ...e, archived: false } : e)),
	);
}

function websiteToEmail(website: string): string {
	return `info@${stripProtocol(website).replace(/\/$/, "")}`;
}

function promotedSupplierFrom(source: SearchSupplier): Supplier {
	return {
		id: `supplier-from-${source.id}`,
		itemId: source.itemId,
		companyName: source.companyName,
		status: "ждем_ответа",
		archived: false,
		email: websiteToEmail(source.website),
		website: source.website,
		address: "",
		pricePerUnit: null,
		tco: null,
		rating: null,
		deliveryCost: null,
		paymentType: "prepayment",
		deferralDays: 0,
		leadTimeDays: null,
		aiDescription: "",
		aiRecommendations: "",
		documents: [],
		chatHistory: [],
		positionOffers: [],
	};
}

/** Promotes eligible (status=new) entries to Suppliers and flips their
 * requestStatus to "requested". Returns the list of ids that were actually
 * promoted (entries already "requested" are skipped). */
export async function promoteSearchSuppliers(itemId: string, ids: string[]): Promise<string[]> {
	await simulateDelay();
	const entries = getSearchSuppliersForItem(itemId);
	const set = new Set(ids);
	const promoted: string[] = [];

	const next = entries.map((e) => {
		if (!set.has(e.id) || e.requestStatus === "requested") return e;
		_appendSupplierForItem(itemId, promotedSupplierFrom(e));
		promoted.push(e.id);
		return { ...e, requestStatus: "requested" as const };
	});
	store.set(itemId, next);
	return promoted;
}
