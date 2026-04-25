import { batchCost } from "../lib/math";
import { ITEM as ITEM_2, SUPPLIERS as SUPPLIERS_2 } from "./items/item-2";
import { ITEM as ITEM_3, SUPPLIERS as SUPPLIERS_3 } from "./items/item-3";
import { ITEM as ITEM_4, SUPPLIERS as SUPPLIERS_4 } from "./items/item-4";
import { ITEM as ITEM_5, SUPPLIERS as SUPPLIERS_5 } from "./items/item-5";
import { ITEM as ITEM_6, SUPPLIERS as SUPPLIERS_6 } from "./items/item-6";
import { ITEM as ITEM_7, SUPPLIERS as SUPPLIERS_7 } from "./items/item-7";
import { ITEM as ITEM_8, SUPPLIERS as SUPPLIERS_8 } from "./items/item-8";
import { _getItem, _patchItem } from "./items-mock-data";
import type {
	MessageEvent,
	Supplier,
	SupplierChatMessage,
	SupplierCompanyType,
	SupplierFilterParams,
	SupplierQuote,
	SupplierSeed,
	SupplierSortField,
	SupplierStatus,
} from "./supplier-types";
import { AGENT_EMAIL, filesToAttachments } from "./supplier-types";
import { ORMATEK_SUPPLIERS } from "./suppliers-ormatek";

const SUPPLIERS_BY_ITEM: Record<string, readonly SupplierSeed[]> = {
	"item-1": ORMATEK_SUPPLIERS,
	[ITEM_2.id]: SUPPLIERS_2,
	[ITEM_3.id]: SUPPLIERS_3,
	[ITEM_4.id]: SUPPLIERS_4,
	[ITEM_5.id]: SUPPLIERS_5,
	[ITEM_6.id]: SUPPLIERS_6,
	[ITEM_7.id]: SUPPLIERS_7,
	[ITEM_8.id]: SUPPLIERS_8,
};

const ALL_ITEM_IDS: readonly string[] = Object.keys(SUPPLIERS_BY_ITEM);

// --- Deterministic profile enrichment (inn / region / companyType / foundedYear / revenue) ---

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

// Region → administrative centre + 2-digit postal prefix.
// Prefix follows the real Russian postal zoning (Moscow 1xxxxx, SPb 19xxxx, etc.).
const REGION_META: Record<string, { city: string; postalPrefix: string }> = {
	Москва: { city: "Москва", postalPrefix: "12" },
	"Санкт-Петербург": { city: "Санкт-Петербург", postalPrefix: "19" },
	"Свердловская область": { city: "Екатеринбург", postalPrefix: "62" },
	"Челябинская область": { city: "Челябинск", postalPrefix: "45" },
	"Новосибирская область": { city: "Новосибирск", postalPrefix: "63" },
	"Республика Татарстан": { city: "Казань", postalPrefix: "42" },
	"Нижегородская область": { city: "Нижний Новгород", postalPrefix: "60" },
	"Ростовская область": { city: "Ростов-на-Дону", postalPrefix: "34" },
	"Самарская область": { city: "Самара", postalPrefix: "44" },
	"Краснодарский край": { city: "Краснодар", postalPrefix: "35" },
	"Воронежская область": { city: "Воронеж", postalPrefix: "39" },
	"Пермский край": { city: "Пермь", postalPrefix: "61" },
	"Красноярский край": { city: "Красноярск", postalPrefix: "66" },
	"Тульская область": { city: "Тула", postalPrefix: "30" },
	"Ленинградская область": { city: "Гатчина", postalPrefix: "18" },
};

const STREETS = [
	"ул. Промышленная",
	"пр-т Индустриальный",
	"ул. Заводская",
	"ул. Складская",
	"ул. Производственная",
	"пр-т Магистральный",
	"ул. Логистическая",
	"ш. Автомобильное",
	"ул. Машиностроителей",
	"ул. Северная",
];

const REVENUE_TIERS = [10_000_000, 45_000_000, 120_000_000, 350_000_000, 900_000_000, 1_800_000_000, 5_000_000_000];
// Headcount tiers roughly aligned with REVENUE_TIERS — small shops at ~15, mid-market at ~300, large at 2500+.
const EMPLOYEE_COUNT_TIERS = [12, 28, 65, 140, 320, 780, 2100];

function hash(s: string): number {
	let h = 0;
	for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
	return Math.abs(h);
}

function makeInn(seed: number): string {
	const base = ((seed + 1) * 2_654_435_761) % 10_000_000_000;
	return base.toString().padStart(10, "0");
}

function makePostalCode(region: string, h: number): string {
	const prefix = REGION_META[region]?.postalPrefix ?? "10";
	const suffix = (h % 10_000).toString().padStart(4, "0");
	return prefix + suffix;
}

function makeAddress(region: string, h: number): string {
	const city = REGION_META[region]?.city ?? region;
	const street = STREETS[h % STREETS.length];
	const building = (h % 120) + 1;
	return `г. ${city}, ${street}, д. ${building}`;
}

function inferCompanyType(companyName: string): SupplierCompanyType {
	const lower = companyName.toLowerCase();
	if (lower.includes("тд") || lower.includes("торг") || lower.includes("трейд") || lower.includes("снаб")) {
		return "дистрибьютор";
	}
	return hash(companyName) % 3 === 0 ? "дистрибьютор" : "производитель";
}

// Anchor the generated "quote received" dates to a stable reference so tests
// and storybook-like snapshots stay deterministic across runs.
const QUOTE_DATE_ANCHOR = new Date("2026-04-20T12:00:00Z").getTime();
const DAY_MS = 86_400_000;

function makeQuoteReceivedAt(h: number): string {
	// Spread quote dates across the last ~45 days before the anchor.
	const offsetDays = h % 45;
	return new Date(QUOTE_DATE_ANCHOR - offsetDays * DAY_MS).toISOString();
}

// Shared identity profile — hashed by companyName so the same supplier across
// items collapses to the same INN/region/address (required for the drawer's
// «Предложения» tab to join quotes across items by INN).
function makeIdentityProfile(identityHash: number) {
	const region = REGIONS[identityHash % REGIONS.length];
	return {
		inn: makeInn(identityHash),
		region,
		postalCode: makePostalCode(region, identityHash),
		foundedYear: 1992 + (identityHash % 30),
		revenue: REVENUE_TIERS[identityHash % REVENUE_TIERS.length],
		employeeCount: EMPLOYEE_COUNT_TIERS[identityHash % EMPLOYEE_COUNT_TIERS.length],
		address: makeAddress(region, identityHash),
	};
}

function enrichSeed(seed: SupplierSeed): Supplier {
	const identityHash = hash(seed.companyName);
	const perRowHash = hash(`${seed.itemId}:${seed.id}`);
	const profile = makeIdentityProfile(identityHash);
	return {
		...seed,
		...profile,
		companyType: inferCompanyType(seed.companyName),
		address: seed.address.length > 0 ? seed.address : profile.address,
		quoteReceivedAt: seed.status === "получено_кп" ? makeQuoteReceivedAt(perRowHash) : undefined,
		chatHistory: enrichChatHistory(seed, perRowHash),
	};
}

// Quote-request anchor — matches the hand-authored chats so auto-seeded requests
// interleave naturally with real ones in the agent's notification thread.
const QUOTE_REQUEST_ANCHOR = new Date("2026-03-02T10:00:00Z").getTime();

function makeQuoteRequestTimestamp(h: number): string {
	const offsetMinutes = h % (60 * 24 * 14); // spread across 2 weeks
	return new Date(QUOTE_REQUEST_ANCHOR + offsetMinutes * 60_000).toISOString();
}

function makeDefaultQuoteRequest(itemId: string, h: number): SupplierChatMessage {
	const itemName = _getItem(itemId)?.name;
	const body = itemName
		? `Добрый день! Запрашиваем коммерческое предложение на «${itemName}». Ждём ваше КП.`
		: "Добрый день! Запрашиваем ваше коммерческое предложение. Ждём КП.";
	return {
		sender: "Агент",
		senderEmail: AGENT_EMAIL,
		timestamp: makeQuoteRequestTimestamp(h),
		body,
		isOurs: true,
	};
}

// Status → terminal event badge rendered inline on the message that triggered
// the outcome. «Ошибка» tags the outgoing agent message (our send failed); the
// others tag the supplier's last reply.
const TERMINAL_EVENT: Partial<Record<SupplierStatus, MessageEvent>> = {
	получено_кп: "quote_received",
	отказ: "refusal",
	ошибка: "delivery_failed",
};

function enrichChatHistory(seed: SupplierSeed, perRowHash: number): SupplierChatMessage[] {
	const needsAutoRequest =
		seed.chatHistory.length === 0 && (seed.status === "кп_запрошено" || seed.status === "ошибка");
	const history = needsAutoRequest ? [makeDefaultQuoteRequest(seed.itemId, perRowHash)] : seed.chatHistory;
	if (history.length === 0) return history;

	const terminalEvent = TERMINAL_EVENT[seed.status] ?? null;
	const tagOurs = terminalEvent === "delivery_failed";
	let tagIdx = -1;
	if (terminalEvent != null) {
		for (let i = history.length - 1; i >= 0; i--) {
			if (history[i].isOurs === tagOurs) {
				tagIdx = i;
				break;
			}
		}
	}
	return history.map((msg, i): SupplierChatMessage => {
		const senderEmail = msg.senderEmail ?? (msg.isOurs ? AGENT_EMAIL : seed.email);
		const events: MessageEvent[] | undefined =
			msg.events ?? (terminalEvent != null && i === tagIdx ? [terminalEvent] : undefined);
		return events ? { ...msg, senderEmail, events } : { ...msg, senderEmail };
	});
}

// --- Candidate ("new"-status) generation ---

// `type` is only a hint — the pool builder below overrides it based on legal form
// (corporate forms skew manufacturer, trading forms skew distributor), so the
// final role distribution is mixed regardless of the stem's original type.
const CANDIDATE_STEMS: { stem: string; type: SupplierCompanyType; slug: string }[] = [
	{ stem: "СтальПром", type: "производитель", slug: "stalprom" },
	{ stem: "МеталлИнвест", type: "производитель", slug: "metallinvest" },
	{ stem: "Восток-Металл", type: "производитель", slug: "vostok-metall" },
	{ stem: "УралСтальКомплект", type: "производитель", slug: "uralstal-komplekt" },
	{ stem: "Северсталь-Трейд", type: "дистрибьютор", slug: "severstal-trade" },
	{ stem: "ПромСнаб-Поволжье", type: "дистрибьютор", slug: "promsnab-povolzhe" },
	{ stem: "ТоргСнабМеталл", type: "дистрибьютор", slug: "torgsnab-metall" },
	{ stem: "ГлавМетКом", type: "дистрибьютор", slug: "glavmetkom" },
	{ stem: "Металл-Экспресс", type: "производитель", slug: "metall-express" },
	{ stem: "ПрофильТорг", type: "производитель", slug: "profiltorg" },
	{ stem: "СибМетКомплект", type: "производитель", slug: "sibmetcomplekt" },
	{ stem: "АрматураЦентр", type: "производитель", slug: "armaturacentr" },
	{ stem: "МеталлСтандарт", type: "производитель", slug: "metallstandart" },
	{ stem: "СтройМетКомплект", type: "дистрибьютор", slug: "stroymetcomplekt" },
	{ stem: "ПромСталь", type: "производитель", slug: "promstal" },
	{ stem: "Химпром-Центр", type: "производитель", slug: "himprom-centr" },
	{ stem: "ПолимерИнвест", type: "производитель", slug: "polimerinvest" },
	{ stem: "ХимТехСнаб", type: "дистрибьютор", slug: "himtechsnab" },
	{ stem: "Пластик-Сервис", type: "производитель", slug: "plastik-servis" },
	{ stem: "ЭлектроПром", type: "производитель", slug: "elektroprom" },
	{ stem: "Промкабель-Трейд", type: "дистрибьютор", slug: "promkabel-trade" },
	{ stem: "СибЭнергоКомплект", type: "дистрибьютор", slug: "sibenergokomplekt" },
	{ stem: "Энергомаш-Урал", type: "производитель", slug: "energomash-ural" },
	{ stem: "МашСтройСнаб", type: "дистрибьютор", slug: "mashstroysnab" },
	{ stem: "ТехноПром-Юг", type: "производитель", slug: "tehnoprom-yug" },
	{ stem: "СеверТехСнаб", type: "дистрибьютор", slug: "severtehsnab" },
	{ stem: "Центр-Комплект", type: "дистрибьютор", slug: "centr-komplekt" },
	{ stem: "ИндустрияСервис", type: "дистрибьютор", slug: "industriya-servis" },
	{ stem: "АвтоКомплект-Поволжье", type: "дистрибьютор", slug: "avtokomplekt-povolzhe" },
	{ stem: "ТрансПром", type: "дистрибьютор", slug: "transprom" },
	{ stem: "Логист-Снаб", type: "дистрибьютор", slug: "logist-snab" },
	{ stem: "Ростех-Маркет", type: "дистрибьютор", slug: "rostech-market" },
	{ stem: "УралИндустрия", type: "производитель", slug: "ural-industriya" },
	{ stem: "Новотех", type: "производитель", slug: "novotech" },
	{ stem: "СтройПромМаркет", type: "дистрибьютор", slug: "stroyprommarket" },
	{ stem: "ДревПром-Центр", type: "производитель", slug: "drevprom-centr" },
	{ stem: "ФанераПром", type: "производитель", slug: "faneraprom" },
	{ stem: "МебельПром-Снаб", type: "дистрибьютор", slug: "mebelprom-snab" },
	{ stem: "ЛесСнаб-Сибирь", type: "дистрибьютор", slug: "lessnab-sibir" },
	{ stem: "ТД «Дерев-Мастер»", type: "дистрибьютор", slug: "derev-master" },
	{ stem: "КартонПром-Урал", type: "производитель", slug: "kartonprom-ural" },
	{ stem: "БумагаСнаб", type: "дистрибьютор", slug: "bumagasnab" },
	{ stem: "ЦеллюлозаЦентр", type: "производитель", slug: "cellulosa-centr" },
	{ stem: "УпакТрейд", type: "дистрибьютор", slug: "upaktrade" },
	{ stem: "ПромПак-Поволжье", type: "производитель", slug: "prompak-povolzhe" },
	{ stem: "КоробТорг", type: "дистрибьютор", slug: "korobtorg" },
	{ stem: "СтеклоПром", type: "производитель", slug: "steklo-prom" },
	{ stem: "ПромСтройИнвест", type: "дистрибьютор", slug: "promstroyinvest" },
	{ stem: "Железобетон-Юг", type: "производитель", slug: "zhbetonyug" },
	{ stem: "ЦементПром", type: "производитель", slug: "cementprom" },
	{ stem: "СтройКомплект-СПб", type: "дистрибьютор", slug: "stroykomplekt-spb" },
	{ stem: "ГрадСтрой", type: "дистрибьютор", slug: "gradstroy" },
	{ stem: "ЭкоСтройСнаб", type: "дистрибьютор", slug: "ecostroysnab" },
	{ stem: "ПромТехноСнаб", type: "дистрибьютор", slug: "promtehnosnab" },
	{ stem: "ВолгаТрейд", type: "дистрибьютор", slug: "volga-trade" },
	{ stem: "КамаСнаб", type: "дистрибьютор", slug: "kama-snab" },
	{ stem: "Дон-Комплект", type: "дистрибьютор", slug: "don-komplekt" },
	{ stem: "Ока-Металл", type: "производитель", slug: "oka-metall" },
	{ stem: "Алтай-Маш", type: "производитель", slug: "altay-mash" },
	{ stem: "Приморье-Снаб", type: "дистрибьютор", slug: "primore-snab" },
	{ stem: "Байкал-Пром", type: "производитель", slug: "baikal-prom" },
	{ stem: "Кузбасс-Трейд", type: "дистрибьютор", slug: "kuzbass-trade" },
	{ stem: "Казань-Комплект", type: "дистрибьютор", slug: "kazan-komplekt" },
	{ stem: "Москва-Снаб", type: "дистрибьютор", slug: "moskva-snab" },
	{ stem: "Тула-Металл", type: "производитель", slug: "tula-metall" },
	{ stem: "Воронеж-Пром", type: "производитель", slug: "voronezh-prom" },
	{ stem: "Ростов-ТехСнаб", type: "дистрибьютор", slug: "rostov-tehsnab" },
	{ stem: "Нева-Пром", type: "производитель", slug: "neva-prom" },
	{ stem: "Балтика-Трейд", type: "дистрибьютор", slug: "baltika-trade" },
	{ stem: "АвтоДеталь", type: "производитель", slug: "avto-detal" },
	{ stem: "Резинотех", type: "производитель", slug: "rezinoteh" },
	{ stem: "Компонент-Сервис", type: "дистрибьютор", slug: "komponent-servis" },
	{ stem: "Гидропром", type: "производитель", slug: "gidroprom" },
];

// `typeBias` overrides each stem's hint so the resulting pool balances roles
// (corporate forms skew manufacturer, trading forms skew distributor).
const LEGAL_WRAPPERS: { prefix: string; suffix: string; typeBias?: SupplierCompanyType; tag: string }[] = [
	{ prefix: "ООО «", suffix: "»", tag: "ooo" },
	{ prefix: "ЗАО «", suffix: "»", tag: "zao" },
	{ prefix: "АО «", suffix: "»", tag: "ao" },
	{ prefix: "ПКФ «", suffix: "»", typeBias: "производитель", tag: "pkf" },
	{ prefix: "ТД «", suffix: "»", typeBias: "дистрибьютор", tag: "td" },
];

const CANDIDATE_POOL: { name: string; type: SupplierCompanyType; domain: string }[] = (() => {
	const pool: { name: string; type: SupplierCompanyType; domain: string }[] = [];
	for (const s of CANDIDATE_STEMS) {
		for (const w of LEGAL_WRAPPERS) {
			const startsWithLegal = s.stem.startsWith("ТД ") || s.stem.startsWith("ИП ");
			const name = startsWithLegal ? s.stem : `${w.prefix}${s.stem}${w.suffix}`;
			pool.push({
				name,
				type: w.typeBias ?? s.type,
				domain: `${s.slug}-${w.tag}.ru`,
			});
			if (startsWithLegal) break;
		}
	}
	return pool;
})();

function targetSupplierCount(itemId: string): number {
	// item-8 stays small per product decision — every other item spreads across 200–300.
	if (itemId === "item-8") return 25;
	return 200 + (hash(itemId) % 101);
}

function generateCandidates(itemId: string, count: number): Supplier[] {
	const seed = hash(itemId);
	// "Ошибка" means a КП request failed to deliver — it only makes sense once we've started
	// reaching out, so suppress it while the item is still in the searching phase.
	const item = _getItem(itemId);
	const skipErrorCandidate = item?.status === "searching";
	// Walk the pool with a coprime step so each item picks a different rotation; when the item
	// needs more candidates than the pool holds, we wrap — duplicates become distinct rows
	// because the id + perRowHash stay unique.
	const step = 7;
	return Array.from({ length: count }, (_, i) => {
		const pool = CANDIDATE_POOL[(seed + i * step) % CANDIDATE_POOL.length];
		// Identity hash by pool.name so the same candidate name collapses to one
		// canonical supplier (same INN/profile) across items.
		const identityHash = hash(pool.name);
		const perRowHash = hash(`${itemId}:candidate-${i + 1}`);
		const profile = makeIdentityProfile(identityHash);
		// One pre-archived (i=7) and one "ошибка"-status (i=11) for demo coverage.
		const status: SupplierStatus = i === 11 && !skipErrorCandidate ? "ошибка" : "new";
		const chatHistory: SupplierChatMessage[] =
			status === "ошибка" ? [{ ...makeDefaultQuoteRequest(itemId, perRowHash), events: ["delivery_failed"] }] : [];
		return {
			id: `candidate-supplier-${itemId}-${i + 1}`,
			itemId,
			companyName: pool.name,
			status,
			archived: i === 7,
			...profile,
			companyType: pool.type,
			email: `info@${pool.domain}`,
			website: `https://${pool.domain}`,
			pricePerUnit: null,
			tco: null,
			rating: null,
			deliveryCost: null,
			paymentType: "prepayment" as const,
			deferralDays: 0,
			leadTimeDays: null,
			agentComment: "",
			documents: [],
			chatHistory,
		};
	});
}

// --- Mutable store (lazily populated per item) ---

let store: Map<string, Supplier[]> = new Map();
let sendShouldFail = false;

function cloneSupplier(s: Supplier): Supplier {
	// chatHistory gets .push()'d in sendSupplierMessage; individual messages are immutable.
	return { ...s, chatHistory: [...s.chatHistory] };
}

function computeCandidateCount(itemId: string, seedCount: number): number {
	const target = targetSupplierCount(itemId);
	return Math.max(0, target - seedCount);
}

function getSuppliersForItem(itemId: string): Supplier[] {
	let suppliers = store.get(itemId);
	if (!suppliers) {
		const seed = SUPPLIERS_BY_ITEM[itemId];
		if (!seed) {
			store.set(itemId, []);
			return [];
		}
		const enriched = seed.map(enrichSeed).map(cloneSupplier);
		const candidates = generateCandidates(itemId, computeCandidateCount(itemId, enriched.length));
		suppliers = [...enriched, ...candidates];
		store.set(itemId, suppliers);
	}
	return suppliers;
}

export function _resetSupplierStore() {
	store = new Map();
	sendShouldFail = false;
}

export function _setSuppliersForItem(itemId: string, seeds: readonly SupplierSeed[]) {
	const enriched = seeds.map(enrichSeed).map(cloneSupplier);
	const candidates = generateCandidates(itemId, computeCandidateCount(itemId, enriched.length));
	store.set(itemId, [...enriched, ...candidates]);
}

export function _setSendShouldFail(fail: boolean) {
	sendShouldFail = fail;
}

// --- Configurable delay for tests ---

let delayConfig = { min: 300, max: 500 };

export function _setSupplierMockDelay(min: number, max: number) {
	delayConfig = { min, max };
}

function simulateDelay(): Promise<void> {
	const ms = delayConfig.min + Math.floor(Math.random() * (delayConfig.max - delayConfig.min + 1));
	if (ms <= 0) return Promise.resolve();
	return new Promise((r) => setTimeout(r, ms));
}

// --- Filtering & sorting ---

function applySupplierFilters(suppliers: Supplier[], params?: SupplierFilterParams): Supplier[] {
	let result = suppliers;

	if (!params?.showArchived) {
		result = result.filter((s) => !s.archived);
	}

	if (params?.search) {
		const q = params.search.toLowerCase();
		const innQ = params.search;
		result = result.filter((s) => s.companyName.toLowerCase().includes(q) || s.inn.includes(innQ));
	}

	if (params?.statuses && params.statuses.length > 0) {
		const set = new Set(params.statuses);
		result = result.filter((s) => set.has(s.status));
	}

	if (params?.companyTypes && params.companyTypes.length > 0) {
		const set = new Set(params.companyTypes);
		result = result.filter((s) => set.has(s.companyType));
	}

	result = params?.sort ? sortSuppliers(result, params.sort, params.dir ?? "asc") : defaultSortSuppliers(result);

	return result;
}

/** Default sort: "получено_кп" first, then TCO asc, then price/unit asc */
// Rank by status so received КП surfaces first in the Предложения tab, and
// candidates (new) surface first in the Поставщики pipeline tab (получено_кп is filtered out there).
const STATUS_RANK: Record<SupplierStatus, number> = {
	получено_кп: 0,
	new: 1,
	кп_запрошено: 2,
	переговоры: 3,
	отказ: 4,
	ошибка: 5,
};

function defaultSortSuppliers(suppliers: Supplier[]): Supplier[] {
	const sorted = [...suppliers];
	sorted.sort((a, b) => {
		const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
		if (rank !== 0) return rank;

		// nulls last
		if (a.tco != null && b.tco != null) {
			if (a.tco !== b.tco) return a.tco - b.tco;
		} else if (a.tco != null) return -1;
		else if (b.tco != null) return 1;

		if (a.pricePerUnit != null && b.pricePerUnit != null) {
			return a.pricePerUnit - b.pricePerUnit;
		}
		if (a.pricePerUnit != null) return -1;
		if (b.pricePerUnit != null) return 1;
		return 0;
	});
	return sorted;
}

function sortSuppliers(suppliers: Supplier[], field: SupplierSortField, dir: "asc" | "desc"): Supplier[] {
	const sorted = [...suppliers];
	const mul = dir === "asc" ? 1 : -1;

	// `batchCost` and `savings` are ranked by `pricePerUnit` since `quantityPerDelivery`
	// (and the current-supplier price for savings) are constants for a single item.
	// Lower price → larger savings, so savings flips the direction.
	const dataField: keyof Supplier =
		field === "batchCost" || field === "savings"
			? "pricePerUnit"
			: field === "leadTimeDays"
				? "leadTimeDays"
				: field === "tco"
					? "tco"
					: field === "foundedYear"
						? "foundedYear"
						: field === "revenue"
							? "revenue"
							: "companyName";
	const effectiveMul = field === "savings" ? -mul : mul;

	sorted.sort((a, b) => {
		if (dataField === "companyName") {
			return effectiveMul * a.companyName.localeCompare(b.companyName, "ru");
		}
		const va = a[dataField] as number | null;
		const vb = b[dataField] as number | null;
		if (va == null && vb == null) return 0;
		if (va == null) return 1;
		if (vb == null) return -1;
		return effectiveMul * (va - vb);
	});

	return sorted;
}

// --- Mock API functions ---

export async function getSupplier(itemId: string, supplierId: string): Promise<Supplier | null> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	return suppliers.find((s) => s.id === supplierId) ?? null;
}

// Supplier IDs embed their item: `supplier-item-<N>-<X>` for seeds,
// `candidate-supplier-item-<N>-<X>` for generated candidates. Parsing keeps
// `getSupplierById` from forcing candidate generation for every other item just
// to satisfy a deep link.
const SUPPLIER_ID_RE = /^(?:candidate-)?supplier-(item-\d+)-\d+$/;

export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
	await simulateDelay();
	const itemId = SUPPLIER_ID_RE.exec(supplierId)?.[1];
	if (!itemId) return null;
	return getSuppliersForItem(itemId).find((s) => s.id === supplierId) ?? null;
}

export async function getAllSuppliers(itemId: string): Promise<{ suppliers: Supplier[] }> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	return { suppliers };
}

export async function fetchAllSuppliersMock(): Promise<Supplier[]> {
	await simulateDelay();
	const itemIds = new Set<string>([...Object.keys(SUPPLIERS_BY_ITEM), ...store.keys()]);
	return [...itemIds].flatMap((itemId) => getSuppliersForItem(itemId).filter((s) => !s.archived));
}

const DEFAULT_PAGE_SIZE = 30;

export async function getSuppliers(
	itemId: string,
	params?: SupplierFilterParams,
): Promise<{ suppliers: Supplier[]; nextCursor: string | null; total: number }> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const filtered = applySupplierFilters(suppliers, params);

	const limit = params?.limit ?? DEFAULT_PAGE_SIZE;
	const cursorIdx = params?.cursor ? filtered.findIndex((s) => s.id === params.cursor) : 0;
	const start = cursorIdx === -1 ? 0 : cursorIdx;
	const page = filtered.slice(start, start + limit);
	const nextCursor = start + limit < filtered.length ? filtered[start + limit].id : null;

	return { suppliers: page, nextCursor, total: filtered.length };
}

export async function deleteSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const idsToDelete = new Set(supplierIds);
	const remaining = suppliers.filter((s) => !idsToDelete.has(s.id));
	store.set(itemId, remaining);
}

export async function archiveSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const idsToArchive = new Set(supplierIds);
	store.set(
		itemId,
		suppliers.map((s) => (idsToArchive.has(s.id) ? { ...s, archived: true } : s)),
	);
}

export async function unarchiveSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const ids = new Set(supplierIds);
	store.set(
		itemId,
		suppliers.map((s) => (ids.has(s.id) ? { ...s, archived: false } : s)),
	);
}

/** Transitions eligible (status="new") suppliers to "кп_запрошено".
 * Returns ids actually transitioned (already-requested ones are skipped).
 * When the item was in a completed-search state, the first request burst flips it to negotiating. */
export async function sendSupplierRequest(itemId: string, supplierIds: string[]): Promise<string[]> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const ids = new Set(supplierIds);
	const transitioned: string[] = [];
	const next = suppliers.map((s) => {
		if (!ids.has(s.id) || s.status !== "new") return s;
		transitioned.push(s.id);
		return { ...s, status: "кп_запрошено" as const };
	});
	store.set(itemId, next);

	if (transitioned.length > 0) {
		const item = _getItem(itemId);
		if (item && item.status === "searching" && item.searchCompleted) {
			_patchItem(itemId, { status: "negotiating", searchCompleted: false });
		}
	}

	return transitioned;
}

export async function selectSupplier(itemId: string, supplierId: string): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const supplier = suppliers.find((s) => s.id === supplierId);
	if (!supplier) throw new Error("Supplier not found");
	_patchItem(itemId, {
		currentSupplier: {
			companyName: supplier.companyName,
			paymentType: supplier.paymentType,
			deferralDays: supplier.deferralDays,
			pricePerUnit: supplier.pricePerUnit,
		},
	});
}

/** Promote the matching-INN supplier to the item's current supplier and snap
 * `currentPrice` to its TCO so «ТЕКУЩЕЕ ТСО» refreshes. */
export async function selectSupplierByInn(itemId: string, inn: string): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const supplier = suppliers.find((s) => s.inn === inn && !s.archived);
	if (!supplier) throw new Error("Supplier not found");
	const tco = supplier.tco ?? supplier.pricePerUnit;
	_patchItem(itemId, {
		currentSupplier: {
			companyName: supplier.companyName,
			inn: supplier.inn,
			paymentType: supplier.paymentType,
			deferralDays: supplier.deferralDays,
			prepaymentPercent: supplier.prepaymentPercent,
			pricePerUnit: supplier.pricePerUnit,
		},
		...(tco != null ? { currentPrice: tco } : {}),
	});
}

export async function sendSupplierMessage(
	itemId: string,
	supplierId: string,
	body: string,
	files?: File[],
): Promise<SupplierChatMessage> {
	await simulateDelay();
	if (sendShouldFail) throw new Error("Не удалось отправить сообщение");
	const suppliers = getSuppliersForItem(itemId);
	const supplier = suppliers.find((s) => s.id === supplierId);
	if (!supplier) throw new Error("Supplier not found");

	const attachments = files && files.length > 0 ? filesToAttachments(files) : undefined;

	const message: SupplierChatMessage = {
		sender: "Агент",
		senderEmail: AGENT_EMAIL,
		timestamp: new Date().toISOString(),
		body,
		isOurs: true,
		attachments,
	};
	supplier.chatHistory.push(message);
	return message;
}

/** Returns the supplier's `получено_кп` quotes across all items, keyed by item.
 * Used by the supplier drawer's «Предложения» tab. Suppliers are matched by INN
 * — the stable identity we enrich onto every seeded/generated supplier row.
 * Archived rows are excluded so the tab reflects active offers only.
 *
 * `contextItemId` (the item the drawer was opened from) sorts first so the
 * user sees the quote that matches their entry point at the top of the list. */
export async function getSupplierQuotesByInn(inn: string, contextItemId: string): Promise<SupplierQuote[]> {
	await simulateDelay();
	if (!inn) return [];
	const quotes: SupplierQuote[] = [];
	for (const itemId of ALL_ITEM_IDS) {
		const suppliers = getSuppliersForItem(itemId);
		const match = suppliers.find((s) => s.inn === inn && s.status === "получено_кп" && !s.archived);
		if (!match) continue;
		const item = _getItem(itemId);
		const isCurrentSupplier =
			item?.currentSupplier != null &&
			(item.currentSupplier.inn === inn ||
				(item.currentSupplier.inn == null && item.currentSupplier.companyName === match.companyName));

		const supplierBatch = item ? batchCost(match, item) : null;
		const currentBatch = item?.currentSupplier
			? batchCost({ pricePerUnit: item.currentSupplier.pricePerUnit }, item)
			: null;
		// Savings are only meaningful when comparing against a different incumbent.
		const canCompare = !isCurrentSupplier && supplierBatch != null && currentBatch != null;
		const savingsRub = canCompare ? (currentBatch as number) - (supplierBatch as number) : null;
		const savingsPct =
			canCompare && (currentBatch as number) > 0
				? (((currentBatch as number) - (supplierBatch as number)) / (currentBatch as number)) * 100
				: null;

		quotes.push({
			itemId,
			itemName: item?.name ?? itemId,
			pricePerUnit: match.pricePerUnit,
			tco: match.tco,
			deliveryCost: match.deliveryCost,
			deferralDays: match.deferralDays,
			paymentType: match.paymentType,
			prepaymentPercent: match.prepaymentPercent,
			leadTimeDays: match.leadTimeDays,
			quoteReceivedAt: match.quoteReceivedAt,
			documents: match.documents,
			isCurrentSupplier,
			batchCost: supplierBatch,
			savingsRub,
			savingsPct,
		});
	}
	quotes.sort((a, b) => {
		if (a.itemId === contextItemId) return -1;
		if (b.itemId === contextItemId) return 1;
		const ta = a.quoteReceivedAt ? Date.parse(a.quoteReceivedAt) : 0;
		const tb = b.quoteReceivedAt ? Date.parse(b.quoteReceivedAt) : 0;
		return tb - ta;
	});
	return quotes;
}
