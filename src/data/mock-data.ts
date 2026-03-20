import type { ProcurementItem, ProcurementStatus } from "./types";

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
];

const STATUSES: ProcurementStatus[] = ["searching", "negotiating", "completed"];
const NULL_PRICE_INDICES = new Set([4, 12, 23, 31, 38, 45]);

function generateItems(): ProcurementItem[] {
	const rng = mulberry32(42);

	return NAMES.map((name, i) => {
		const status = STATUSES[Math.floor(rng() * 3)];
		const annualQuantity = Math.floor(rng() * 9990) + 10;
		const currentPrice = Math.round((rng() * 499500 + 500) * 100) / 100;

		const hasMarketData = !NULL_PRICE_INDICES.has(i);

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
		};
	});
}

export const mockProcurementItems: ProcurementItem[] = generateItems();
