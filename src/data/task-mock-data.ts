import type { Task, TaskAssignee, TaskFilterParams, TaskStatus } from "./task-types";

const ASSIGNEES: TaskAssignee[] = [
	{ name: "Иванов Алексей", initials: "ИА" },
	{ name: "Петрова Мария", initials: "ПМ" },
	{ name: "Козлов Дмитрий", initials: "КД" },
	{ name: "Сидорова Елена", initials: "СЕ" },
];

const TASK_TITLES = [
	"Согласование цены на арматуру",
	"Запрос КП на трубы ПНД",
	"Уточнение сроков поставки цемента",
	"Сравнение условий поставщиков щебня",
	"Проверка сертификатов на кабель",
	"Согласование условий оплаты",
	"Запрос образцов краски",
	"Уточнение объёмов поставки",
	"Согласование графика отгрузки",
	"Проверка наличия на складе",
	"Запрос скидки на объём",
	"Уточнение характеристик материала",
	"Согласование логистики доставки",
	"Проверка лицензий поставщика",
	"Запрос альтернативных предложений",
];

const PROCUREMENT_ITEMS = [
	"Арматура А500С",
	"Трубы ПНД 110мм",
	"Цемент М500",
	"Щебень гранитный 5-20",
	"Песок кварцевый",
	"Кабель ВВГнг 3×2.5",
	"Краска фасадная",
	"Утеплитель минвата",
	"Профнастил С21",
	"Кирпич облицовочный",
	"Доска обрезная 50×150",
	"Плитка керамическая",
	"Герметик силиконовый",
	"Саморезы кровельные",
	"Сетка сварная 50×50",
];

const DESCRIPTIONS = [
	"Поставщик прислал обновлённое КП. Необходимо проверить соответствие спецификации и подтвердить объёмы.",
	"Требуется уточнить возможность поставки в указанные сроки с учётом текущей загрузки склада.",
	"Необходимо сравнить предложения от трёх поставщиков и выбрать оптимальный вариант по цене и срокам.",
	"Запрошены дополнительные сертификаты качества. Ожидаем ответ от поставщика.",
	"Нужно согласовать условия оплаты: предоплата 30%, остаток по факту поставки.",
];

const BASE_CREATED = new Date("2026-03-01T10:00:00.000Z");
const BASE_DEADLINE = new Date("2026-03-24T18:00:00.000Z");

function createMockTasks(): Task[] {
	const tasks: Task[] = [];
	const statuses: TaskStatus[] = ["assigned", "in_progress", "completed", "archived"];

	let idx = 0;
	for (const status of statuses) {
		for (let i = 0; i < 15; i++) {
			const createdAt = new Date(BASE_CREATED);
			createdAt.setDate(BASE_CREATED.getDate() + (idx % 28));

			const deadline = new Date(BASE_DEADLINE);
			deadline.setDate(BASE_DEADLINE.getDate() + (idx % 15));

			tasks.push({
				id: `task-${idx + 1}`,
				title: TASK_TITLES[idx % TASK_TITLES.length],
				procurementItemName: PROCUREMENT_ITEMS[idx % PROCUREMENT_ITEMS.length],
				status,
				createdAt: createdAt.toISOString(),
				deadline: deadline.toISOString(),
				assignee: ASSIGNEES[idx % ASSIGNEES.length],
				description: DESCRIPTIONS[idx % DESCRIPTIONS.length],
				questionCount: (idx % 4) + 1,
				answer:
					status === "completed" ? "Согласовано. Условия поставки подтверждены, договор направлен на подпись." : null,
				attachments: [],
			});
			idx++;
		}
	}

	return tasks;
}

// --- Mutable store ---

let store = createMockTasks();

export function _resetTaskStore() {
	store = createMockTasks();
}

// --- Configurable delay for tests ---

let delayConfig = { min: 300, max: 500 };

export function _setMockDelay(min: number, max: number) {
	delayConfig = { min, max };
}

function simulateDelay(): Promise<void> {
	const ms = delayConfig.min + Math.floor(Math.random() * (delayConfig.max - delayConfig.min + 1));
	if (ms <= 0) return Promise.resolve();
	return new Promise((r) => setTimeout(r, ms));
}

// --- Filtering / sorting ---

function applyFilterParams(tasks: Task[], params?: TaskFilterParams): Task[] {
	if (!params) return tasks;
	let result = tasks;

	if (params.q) {
		const q = params.q.toLowerCase();
		result = result.filter((t) => t.title.toLowerCase().includes(q) || t.procurementItemName.toLowerCase().includes(q));
	}

	if (params.item) {
		result = result.filter((t) => t.procurementItemName === params.item);
	}

	if (params.sort) {
		const dir = params.dir === "asc" ? 1 : -1;
		const field = params.sort;
		result = [...result].sort((a, b) => {
			if (field === "questionCount") return dir * (a.questionCount - b.questionCount);
			return dir * (new Date(a[field]).getTime() - new Date(b[field]).getTime());
		});
	}

	return result;
}

// --- Mock API functions ---

export function getProcurementItems(): string[] {
	const items = new Set(store.map((t) => t.procurementItemName));
	return [...items].sort((a, b) => a.localeCompare(b, "ru"));
}

export async function getAllTasks(
	cursor?: string,
	limit = 20,
	params?: TaskFilterParams,
): Promise<{ tasks: Task[]; nextCursor: string | null }> {
	await simulateDelay();
	const filtered = applyFilterParams(store, params);
	const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
	const slice = filtered.slice(startIndex, startIndex + limit);
	const nextIndex = startIndex + limit;
	return {
		tasks: slice.map((t) => ({ ...t })),
		nextCursor: nextIndex < filtered.length ? String(nextIndex) : null,
	};
}

export async function getTasks(
	status: TaskStatus,
	cursor?: string,
	limit = 20,
	params?: TaskFilterParams,
): Promise<{ tasks: Task[]; nextCursor: string | null }> {
	await simulateDelay();
	const byStatus = store.filter((t) => t.status === status);
	const filtered = applyFilterParams(byStatus, params);
	const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
	const slice = filtered.slice(startIndex, startIndex + limit);
	const nextIndex = startIndex + limit;
	return {
		tasks: slice.map((t) => ({ ...t })),
		nextCursor: nextIndex < filtered.length ? String(nextIndex) : null,
	};
}

export async function getTask(id: string): Promise<Task> {
	await simulateDelay();
	const task = store.find((t) => t.id === id);
	if (!task) throw new Error(`Task ${id} not found`);
	return { ...task };
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
	await simulateDelay();
	const task = store.find((t) => t.id === id);
	if (!task) throw new Error(`Task ${id} not found`);
	task.status = status;
	return { ...task };
}

export async function submitAnswer(id: string, answer: string, attachments: string[] = []): Promise<Task> {
	await simulateDelay();
	const task = store.find((t) => t.id === id);
	if (!task) throw new Error(`Task ${id} not found`);
	task.answer = answer;
	task.attachments = attachments;
	task.status = "completed";
	return { ...task };
}
