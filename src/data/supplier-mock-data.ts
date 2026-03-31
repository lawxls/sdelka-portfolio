import type {
	Supplier,
	SupplierChatMessage,
	SupplierDocument,
	SupplierFilterParams,
	SupplierPositionOffer,
	SupplierSortField,
	SupplierStatus,
} from "./supplier-types";

const COMPANY_NAMES = [
	"ООО «СтройТорг»",
	"ЗАО «МеталлПром»",
	"ООО «Техносервис»",
	"ИП Козлов А.В.",
	"ООО «ПромСнаб»",
	"ООО «Альфа-Трейд»",
	"ЗАО «БалтМатериалы»",
	"ООО «ЮгСтальПоставка»",
	"ООО «Компания Ресурс»",
	"ИП Смирнова Е.Н.",
	"ООО «ТрансЛогистик»",
	"ООО «ОптСнабСервис»",
];

const ADDRESSES = [
	"г. Москва, ул. Промышленная, д. 15",
	"г. Санкт-Петербург, пр. Невский, д. 42",
	"г. Екатеринбург, ул. Ленина, д. 88",
	"г. Новосибирск, ул. Кирова, д. 3",
	"г. Казань, ул. Баумана, д. 21",
	"г. Нижний Новгород, ул. Горького, д. 7",
	"г. Ростов-на-Дону, пр. Будённовский, д. 55",
	"г. Самара, ул. Куйбышева, д. 12",
	"г. Краснодар, ул. Красная, д. 30",
	"г. Воронеж, ул. Кольцовская, д. 9",
];

const WEBSITES = [
	"stroytorg.ru",
	"metallprom.ru",
	"technoservice.ru",
	"promsnab.ru",
	"alfa-trade.ru",
	"baltmaterials.ru",
	"yugsteel.ru",
	"compresurs.ru",
	"translogistic.ru",
	"optsnab.ru",
];

const AI_DESCRIPTIONS = [
	"Поставщик демонстрирует стабильные сроки поставки и конкурентные цены. Работает на рынке более 10 лет.",
	"Высокое качество продукции, однако сроки поставки выше среднего. Сертифицирован по ISO 9001.",
	"Новый поставщик на рынке. Агрессивная ценовая политика, но недостаточно данных для оценки надёжности.",
	"Крупный игрок с широким ассортиментом. Цены выше рынка, но высокий уровень сервиса.",
	"Региональный поставщик с быстрой доставкой в пределах ЦФО. Ограниченный ассортимент.",
];

const AI_RECOMMENDATIONS = [
	"Рекомендуется для долгосрочного сотрудничества. Запросить скидку при объёме от 500 ед.",
	"Подходит для некритичных позиций. Уточнить возможность ускоренной доставки.",
	"Провести пробную закупку малого объёма для проверки качества и сроков.",
	"Рассмотреть как резервного поставщика. Торговаться по цене — есть потенциал снижения.",
	"Использовать для срочных заказов в ЦФО. Не подходит для крупных партий.",
];

const DOCUMENT_NAMES = [
	"Коммерческое предложение.pdf",
	"Сертификат соответствия.pdf",
	"Прайс-лист 2026.xlsx",
	"Карточка предприятия.docx",
	"Лицензия.pdf",
];

const POSITION_NAMES = [
	"Арматура А500С ∅12",
	"Арматура А500С ∅16",
	"Проволока вязальная",
	"Сетка кладочная",
	"Швеллер 10П",
];

// Deterministic status assignment per supplier index within an item:
// 10 suppliers → 3 получено_кп, rest spread across other 4
const STATUS_PATTERN: SupplierStatus[] = [
	"получено_кп",
	"письмо_не_отправлено",
	"ждем_ответа",
	"получено_кп",
	"переговоры",
	"отказ",
	"ждем_ответа",
	"получено_кп",
	"письмо_не_отправлено",
	"переговоры",
];

function makeDocuments(seed: number): SupplierDocument[] {
	const count = (seed % 3) + 1;
	return Array.from({ length: count }, (_, i) => ({
		name: DOCUMENT_NAMES[(seed + i) % DOCUMENT_NAMES.length],
		type: DOCUMENT_NAMES[(seed + i) % DOCUMENT_NAMES.length].split(".").pop() ?? "pdf",
		size: 100_000 + (((seed + i) * 37_000) % 900_000),
	}));
}

function makeChatHistory(seed: number): SupplierChatMessage[] {
	const base = new Date("2026-02-15T10:00:00.000Z");
	return [
		{
			sender: "Агент",
			timestamp: new Date(base.getTime() + seed * 86_400_000).toISOString(),
			body: "Добрый день! Просим направить КП на запрашиваемые позиции.",
			isOurs: true,
		},
		{
			sender: COMPANY_NAMES[seed % COMPANY_NAMES.length],
			timestamp: new Date(base.getTime() + (seed + 2) * 86_400_000).toISOString(),
			body: "Здравствуйте! КП направлено во вложении. Готовы обсудить условия.",
			isOurs: false,
		},
	];
}

function makePositionOffers(seed: number): SupplierPositionOffer[] {
	const count = (seed % 3) + 2;
	return Array.from({ length: count }, (_, i) => {
		const qty = 50 + (((seed + i) * 13) % 200);
		const price = 500 + (((seed + i) * 73) % 2000);
		return {
			name: POSITION_NAMES[(seed + i) % POSITION_NAMES.length],
			quantity: qty,
			pricePerUnit: price,
			total: qty * price,
		};
	});
}

const LARGE_DATASET_ITEMS = new Set(["420c4c41-550e-4d0f-9f65-4de16b365534"]);

function createSuppliersForItem(itemId: string): Supplier[] {
	// Use a simple hash of itemId to seed deterministic but bounded data
	let hash = 0;
	for (const ch of itemId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
	const seed = Math.abs(hash) % 1000;
	const count = LARGE_DATASET_ITEMS.has(itemId) ? 200 : 10;

	return Array.from({ length: count }, (_, i) => {
		const idx = seed + i;
		const status = STATUS_PATTERN[i % STATUS_PATTERN.length];
		const isKp = status === "получено_кп";
		const pricePerUnit = isKp ? 800 + ((idx * 137) % 1200) : null;
		const deliveryCost = 1000 + ((idx * 53) % 3000);
		const tco = isKp && pricePerUnit != null ? pricePerUnit + deliveryCost : null;
		const rating = isKp ? 30 + ((idx * 17) % 71) : null;

		return {
			id: `supplier-${itemId}-${i + 1}`,
			itemId,
			companyName: COMPANY_NAMES[idx % COMPANY_NAMES.length],
			status,
			email: `info@${WEBSITES[idx % WEBSITES.length]}`,
			website: `https://${WEBSITES[idx % WEBSITES.length]}`,
			address: ADDRESSES[idx % ADDRESSES.length],
			pricePerUnit,
			tco,
			rating,
			deliveryCost,
			deferralDays: 10 + ((idx * 7) % 50),
			aiDescription: AI_DESCRIPTIONS[idx % AI_DESCRIPTIONS.length],
			aiRecommendations: AI_RECOMMENDATIONS[idx % AI_RECOMMENDATIONS.length],
			documents: makeDocuments(idx),
			chatHistory: makeChatHistory(idx),
			positionOffers: isKp ? makePositionOffers(idx) : [],
		};
	});
}

// --- Mutable store (lazily populated per item) ---

let store: Map<string, Supplier[]> = new Map();

function getSuppliersForItem(itemId: string): Supplier[] {
	let suppliers = store.get(itemId);
	if (!suppliers) {
		suppliers = createSuppliersForItem(itemId);
		store.set(itemId, suppliers);
	}
	return suppliers;
}

export function _resetSupplierStore() {
	store = new Map();
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

	if (params?.search) {
		const q = params.search.toLowerCase();
		result = result.filter((s) => s.companyName.toLowerCase().includes(q));
	}

	if (params?.statuses && params.statuses.length > 0) {
		const set = new Set(params.statuses);
		result = result.filter((s) => set.has(s.status));
	}

	if (params?.sort) {
		result = sortSuppliers(result, params.sort, params.dir ?? "asc");
	}

	return result;
}

function sortSuppliers(suppliers: Supplier[], field: SupplierSortField, dir: "asc" | "desc"): Supplier[] {
	const sorted = [...suppliers];
	const mul = dir === "asc" ? 1 : -1;

	sorted.sort((a, b) => {
		if (field === "companyName") {
			return mul * a.companyName.localeCompare(b.companyName, "ru");
		}
		const va = a[field];
		const vb = b[field];
		// nulls always last regardless of direction
		if (va == null && vb == null) return 0;
		if (va == null) return 1;
		if (vb == null) return -1;
		return mul * (va - vb);
	});

	return sorted;
}

// --- Mock API functions ---

export async function getSupplier(itemId: string, supplierId: string): Promise<Supplier | null> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	return suppliers.find((s) => s.id === supplierId) ?? null;
}

export async function getAllSuppliers(itemId: string): Promise<{ suppliers: Supplier[] }> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	return { suppliers };
}

const DEFAULT_PAGE_SIZE = 30;

export async function getSuppliers(
	itemId: string,
	params?: SupplierFilterParams,
): Promise<{ suppliers: Supplier[]; nextCursor: string | null }> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const filtered = applySupplierFilters(suppliers, params);

	const limit = params?.limit ?? DEFAULT_PAGE_SIZE;
	const cursorIdx = params?.cursor ? filtered.findIndex((s) => s.id === params.cursor) : 0;
	const start = cursorIdx === -1 ? 0 : cursorIdx;
	const page = filtered.slice(start, start + limit);
	const nextCursor = start + limit < filtered.length ? filtered[start + limit].id : null;

	return { suppliers: page, nextCursor };
}

export async function deleteSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const idsToDelete = new Set(supplierIds);
	const remaining = suppliers.filter((s) => !idsToDelete.has(s.id));
	store.set(itemId, remaining);
}
