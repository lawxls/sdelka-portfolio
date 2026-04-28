import { _getItem } from "../items-mock-data";
import type {
	MessageEvent,
	Supplier,
	SupplierChatMessage,
	SupplierCompanyType,
	SupplierSeed,
	SupplierStatus,
} from "../supplier-types";
import { AGENT_EMAIL } from "../supplier-types";

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

export function hash(s: string): number {
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

export function inferCompanyType(companyName: string): SupplierCompanyType {
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

export function makeQuoteReceivedAt(h: number): string {
	// Spread quote dates across the last ~45 days before the anchor.
	const offsetDays = h % 45;
	return new Date(QUOTE_DATE_ANCHOR - offsetDays * DAY_MS).toISOString();
}

// Shared identity profile — hashed by companyName so the same supplier across
// items collapses to the same INN/region/address (required for the drawer's
// «Предложения» tab to join quotes across items by INN).
export function makeIdentityProfile(identityHash: number) {
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

export function enrichSeed(seed: SupplierSeed): Supplier {
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

export function targetSupplierCount(itemId: string): number {
	// item-8 stays small per product decision — every other item spreads across 200–300.
	if (itemId === "item-8") return 25;
	return 200 + (hash(itemId) % 101);
}

export function generateCandidates(itemId: string, count: number): Supplier[] {
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
