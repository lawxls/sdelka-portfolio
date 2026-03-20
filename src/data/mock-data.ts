import type { Folder, ProcurementItem, ProcurementStatus } from "./types";

function mulberry32(seed: number): () => number {
	let s = seed;
	return () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const NAMES = [
	"Арматура А500С ∅12",
	"Труба профильная 60×40",
	"Швеллер 16П",
	"Лист горячекатаный 8мм",
	"Уголок равнополочный 50×5",
	"Двутавр 20Б1",
	"Проволока вязальная 1.2мм",
	"Цемент М500 Д0",
	"Песок речной мытый",
	"Щебень гранитный 5-20",
	"Кирпич керамический М150",
	"Блок газобетонный D500",
	"Пеноплекс 50мм",
	"Минвата Rockwool 100мм",
	"Гидроизоляция Технониколь",
	"Сетка кладочная 50×50",
	"Рубероид РКП-350",
	"Битум БН 90/10",
	"Труба ПНД ∅110",
	"Фитинг полипропилен ∅32",
	"Кабель ВВГнг 3×2.5",
	"Автомат ABB 25A",
	"Светильник LED 36W",
	"Краска фасадная Dulux",
	"Грунтовка Ceresit CT17",
	"Штукатурка гипсовая Knauf",
	"Шпаклёвка финишная Weber",
	"Плитка керамогранит 60×60",
	"Клей плиточный Mapei",
	"Ламинат 33 класс 8мм",
	"Доска обрезная 50×150",
	"Брус строганый 100×100",
	"Фанера ФК 18мм",
	"OSB-3 12мм",
	"Профлист С-8 0.5мм",
	"Металлочерепица Монтеррей",
	"Водосток Grand Line ∅125",
	"Саморезы кровельные 4.8×35",
	"Анкер химический Hilti",
	"Болт высокопрочный М16",
	"Электроды УОНИ 13/55 ∅3",
	"Баллон пропан 50л",
	"Герметик силиконовый Tytan",
	"Пена монтажная Makroflex",
	"Диск алмазный ∅230",
	"Перчатки нитриловые (100шт)",
	"Каска строительная UVEX",
	"Леса строительные ЛРСП-40",
	"Опалубка стеновая PERI",
	"Бетон B25 (М350)",
	"Воздуховод круглый ∅160",
	"Задвижка стальная DN50",
	"Муфта соединительная ∅75",
	"Утеплитель базальтовый 50мм",
	"Сайдинг виниловый 3.66м",
	"Подоконник ПВХ 300мм",
	"Дверь противопожарная EI60",
	"Окно ПВХ двухстворчатое",
	"Линолеум коммерческий 3м",
	"Плинтус ПВХ 80мм",
	"Гипсокартон ГКЛВ 12.5мм",
	"Профиль ПН 28×27",
	"Подвес прямой 60×30",
	"Дюбель-гвоздь 6×40",
	"Лента уплотнительная 30мм",
	"Затирка эпоксидная Mapei",
	"Сифон для раковины ∅40",
	"Смеситель кухонный Grohe",
	"Унитаз-компакт Cersanit",
	"Радиатор биметалл 500мм",
	"Котёл газовый настенный 24кВт",
	"Насос циркуляционный Wilo",
	"Счётчик воды ∅15",
	"Щит распределительный ЩРН",
	"Розетка двойная Legrand",
];

const NULL_PRICE_INDICES = new Set([4, 12, 23, 31, 38, 45, 53, 67]);

function generateItems(): ProcurementItem[] {
	const rng = mulberry32(42);

	return NAMES.map((name, i) => {
		const annualQuantity = Math.floor(rng() * 9990) + 10;
		const currentPrice = Math.round((rng() * 499500 + 500) * 100) / 100;

		const hasMarketData = !NULL_PRICE_INDICES.has(i);
		const status: ProcurementStatus = hasMarketData ? (rng() < 0.5 ? "searching" : "completed") : "negotiating";

		let bestPrice: number | null = null;
		let averagePrice: number | null = null;

		if (hasMarketData) {
			// bestPrice 70–130% of currentPrice → mix of overpaying and saving
			const bestRatio = 0.7 + rng() * 0.6;
			bestPrice = Math.round(currentPrice * bestRatio * 100) / 100;
			// averagePrice between bestPrice and ~120% of currentPrice
			const avgRatio = 0.9 + rng() * 0.3;
			averagePrice = Math.round(currentPrice * avgRatio * 100) / 100;
		}

		return {
			id: `item-${i + 1}`,
			name,
			status,
			annualQuantity,
			currentPrice,
			bestPrice,
			averagePrice,
			folderId: null,
		};
	});
}

export const mockProcurementItems: ProcurementItem[] = generateItems();

export const SEED_FOLDERS: Folder[] = [
	{ id: "folder-1", name: "Металлопрокат", color: "blue" },
	{ id: "folder-2", name: "Стройматериалы", color: "green" },
	{ id: "folder-3", name: "Инженерные системы", color: "orange" },
	{ id: "folder-4", name: "Электрика", color: "purple" },
];

/** Default folder assignments: itemId → folderId */
export const SEED_FOLDER_ASSIGNMENTS: Record<string, string> = {
	// Металлопрокат (folder-1): steel/metal items
	"item-1": "folder-1", // Арматура А500С
	"item-2": "folder-1", // Труба профильная
	"item-3": "folder-1", // Швеллер
	"item-4": "folder-1", // Лист горячекатаный
	"item-5": "folder-1", // Уголок равнополочный
	"item-6": "folder-1", // Двутавр
	"item-7": "folder-1", // Проволока вязальная
	"item-35": "folder-1", // Профлист
	"item-36": "folder-1", // Металлочерепица
	// Стройматериалы (folder-2): building materials
	"item-8": "folder-2", // Цемент
	"item-9": "folder-2", // Песок
	"item-10": "folder-2", // Щебень
	"item-11": "folder-2", // Кирпич
	"item-12": "folder-2", // Блок газобетонный
	"item-13": "folder-2", // Пеноплекс
	"item-14": "folder-2", // Минвата
	"item-15": "folder-2", // Гидроизоляция
	"item-50": "folder-2", // Бетон
	// Инженерные системы (folder-3): pipes/plumbing
	"item-19": "folder-3", // Труба ПНД
	"item-20": "folder-3", // Фитинг полипропилен
	"item-51": "folder-3", // Воздуховод
	"item-52": "folder-3", // Задвижка
	"item-53": "folder-3", // Муфта
	// Электрика (folder-4): electrical
	"item-21": "folder-4", // Кабель ВВГнг
	"item-22": "folder-4", // Автомат ABB
	"item-23": "folder-4", // Светильник LED
	"item-68": "folder-4", // Щит распределительный
	"item-69": "folder-4", // Розетка двойная
};
