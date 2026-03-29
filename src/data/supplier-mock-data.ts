import type {
	Supplier,
	SupplierChatMessage,
	SupplierDocument,
	SupplierPositionOffer,
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

const AI_COMMENTS = [
	"Поставщик демонстрирует стабильные сроки поставки и конкурентные цены. Рекомендуется для долгосрочного сотрудничества.",
	"Высокое качество продукции, однако сроки поставки выше среднего. Подходит для некритичных позиций.",
	"Новый поставщик на рынке. Агрессивная ценовая политика, но недостаточно данных для оценки надёжности.",
	"Крупный игрок с широким ассортиментом. Цены выше рынка, но высокий уровень сервиса.",
	"Региональный поставщик с быстрой доставкой в пределах ЦФО. Ограниченный ассортимент.",
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
			sender: "Отдел закупок",
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

function createSuppliersForItem(itemId: string): Supplier[] {
	// Use a simple hash of itemId to seed deterministic but bounded data
	let hash = 0;
	for (const ch of itemId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
	const seed = Math.abs(hash) % 1000;

	return Array.from({ length: 10 }, (_, i) => {
		const idx = seed + i;
		const status = STATUS_PATTERN[i];
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
			aiComment: AI_COMMENTS[idx % AI_COMMENTS.length],
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

// --- Mock API functions ---

export async function getSuppliers(itemId: string): Promise<{ suppliers: Supplier[] }> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	return { suppliers: suppliers.map((s) => ({ ...s })) };
}
