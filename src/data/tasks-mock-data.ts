import { createBlobUrl, delay, nextId, paginate } from "./mock-utils";
import type { Attachment, Task, TaskFilterParams, TaskStatus } from "./task-types";

// --- Seed data ---

const assigneeIvan = {
	id: "user-1",
	firstName: "Иван",
	lastName: "Журавлёв",
	email: "ivan.zhuravlyov.58@mostholding.ru",
	avatarIcon: "blue",
};
const assigneeOlga = {
	id: "user-2",
	firstName: "Ольга",
	lastName: "Соколова",
	email: "o.sokolova@ormatek.com",
	avatarIcon: "green",
};
const assigneeDmitry = {
	id: "user-3",
	firstName: "Дмитрий",
	lastName: "Орлов",
	email: "d.orlov@ormatek.com",
	avatarIcon: "orange",
};
const assigneeEkaterina = {
	id: "user-4",
	firstName: "Екатерина",
	lastName: "Белова",
	email: "e.belova@ormatek.com",
	avatarIcon: "red",
};

const ITEM_REF = { id: "item-1", name: "Полотно ПВД 2600 мм", companyId: "company-1" };

const SEED_TASKS: Task[] = [
	// --- Assigned (6) ---
	{
		id: "task-1",
		name: "Список документов для договора",
		status: "assigned",
		item: ITEM_REF,
		assignee: assigneeIvan,
		createdAt: "2026-04-08T15:42:00.000Z",
		deadlineAt: "2026-04-22T18:00:00.000Z",
		description: "Поставщики просят уточнить перечень документов, необходимых для заключения договора поставки.",
		questionCount: 3,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-1-1", question: "Какие документы нужны со стороны ОРМАТЕК для заключения договора?", answer: null },
			{ id: "sq-1-2", question: "Требуется ли доверенность на получение товара?", answer: null },
			{ id: "sq-1-3", question: "Нужна ли карточка предприятия?", answer: null },
		],
		updatedAt: "2026-04-08T15:42:00.000Z",
	},
	{
		id: "task-2",
		name: "Срок принятия решения по КП",
		status: "assigned",
		item: ITEM_REF,
		assignee: assigneeOlga,
		createdAt: "2026-02-27T11:48:00.000Z",
		deadlineAt: "2026-04-20T18:00:00.000Z",
		description:
			"Несколько поставщиков уточняют, в какие сроки ОРМАТЕК готов принять окончательное решение по предложениям.",
		questionCount: 3,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-2-1", question: "До какого числа действует срок рассмотрения КП?", answer: null },
			{ id: "sq-2-2", question: "Будет ли возможность скорректировать цену после первичной оценки?", answer: null },
			{ id: "sq-2-3", question: "Какие критерии выбора поставщика являются ключевыми?", answer: null },
		],
		updatedAt: "2026-02-27T11:48:00.000Z",
	},
	{
		id: "task-3",
		name: "Приглашение к ЭДО",
		status: "assigned",
		item: ITEM_REF,
		assignee: assigneeDmitry,
		createdAt: "2026-04-13T16:48:00.000Z",
		deadlineAt: "2026-04-25T18:00:00.000Z",
		description: "Поставщик просит прислать приглашение к ЭДО в Диадоке для обмена закрывающими документами.",
		questionCount: 1,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [{ id: "sq-3-1", question: "В каком операторе ЭДО работает ОРМАТЕК?", answer: null }],
		updatedAt: "2026-04-13T16:48:00.000Z",
	},
	{
		id: "task-4",
		name: "Отсутствует текст запроса в письме (ООО Профессиональные Решения)",
		status: "assigned",
		item: ITEM_REF,
		assignee: assigneeEkaterina,
		createdAt: "2026-04-08T12:29:00.000Z",
		deadlineAt: "2026-04-18T18:00:00.000Z",
		description: "Поставщик получил письмо без содержательной части запроса. Нужно повторно отправить спецификацию.",
		questionCount: 1,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [{ id: "sq-4-1", question: "Можно ли повторно прислать ТЗ с характеристиками?", answer: null }],
		updatedAt: "2026-04-08T12:29:00.000Z",
	},
	{
		id: "task-5",
		name: "Цвет плёнки (прозрачность)",
		status: "assigned",
		item: ITEM_REF,
		assignee: assigneeIvan,
		createdAt: "2026-02-25T15:17:00.000Z",
		deadlineAt: "2026-04-20T18:00:00.000Z",
		description: "Поставщики уточняют цвет плёнки — прозрачная или матовая, допустим ли лёгкий молочный оттенок.",
		questionCount: 1,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-5-1", question: "Допустим ли молочный оттенок при условии сохранения первичного сырья?", answer: null },
		],
		updatedAt: "2026-02-25T15:17:00.000Z",
	},
	{
		id: "task-6",
		name: "Уточнение параметров плёнки и объёмов (КРЕДО)",
		status: "assigned",
		item: ITEM_REF,
		assignee: assigneeOlga,
		createdAt: "2026-04-10T11:05:00.000Z",
		deadlineAt: "2026-04-24T18:00:00.000Z",
		description: "КРЕДО просит подтвердить плотность, толщину и помесячный график отгрузок.",
		questionCount: 2,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-6-1", question: "Какая требуется толщина плёнки (мкм)?", answer: null },
			{ id: "sq-6-2", question: "Каков помесячный график отгрузок в течение года?", answer: null },
		],
		updatedAt: "2026-04-10T11:05:00.000Z",
	},
	// --- Completed (10) ---
	{
		id: "task-7",
		name: "Уточнение объёма одной партии для расчёта доставки",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeDmitry,
		createdAt: "2026-02-18T11:59:00.000Z",
		deadlineAt: "2026-02-25T18:00:00.000Z",
		description: "Поставщик запрашивает объём одной поставки для расчёта стоимости транспортной логистики.",
		questionCount: 3,
		completedResponse:
			"Партия — 15 000 м (≈1 500 кг), ежемесячная отгрузка. Доставка — до производства в Аксайском р-не Ростовской обл.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-7-1", question: "Объём одной партии?", answer: "15 000 м" },
			{ id: "sq-7-2", question: "Периодичность поставок?", answer: "Ежемесячно" },
			{ id: "sq-7-3", question: "Адрес доставки?", answer: "Ростовская обл., Аксайский р-н, Южная промзона" },
		],
		updatedAt: "2026-02-20T14:30:00.000Z",
	},
	{
		id: "task-8",
		name: "Согласование альтернативы: полурукав 1,3 м вместо полотна 2,6 м",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeIvan,
		createdAt: "2026-02-19T12:54:00.000Z",
		deadlineAt: "2026-02-26T18:00:00.000Z",
		description: "Часть поставщиков предлагает полурукав 1 300 мм (с разворотом до 2 600 мм) как аналог полотна.",
		questionCount: 2,
		completedResponse:
			"Полурукав с разворотом до 2 600 мм допустим при условии первичного сырья и соответствующей толщины. Цену сравниваем с полотном по цене за 1 кг.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-8-1", question: "Допустим ли полурукав 1,3 м с разворотом?", answer: "Да, при первичном сырье" },
			{ id: "sq-8-2", question: "Как сравниваете цену?", answer: "За 1 кг материала" },
		],
		updatedAt: "2026-02-21T10:15:00.000Z",
	},
	{
		id: "task-9",
		name: "Рассмотрение предложения без НДС (Polystan)",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeOlga,
		createdAt: "2026-02-20T12:43:00.000Z",
		deadlineAt: "2026-02-27T18:00:00.000Z",
		description: "Polystan работает по УСН без НДС — уточнить, принимаем ли предложения от таких поставщиков.",
		questionCount: 1,
		completedResponse: "ОРМАТЕК принимает предложения и без НДС. Сравнение КП — по итоговой цене с учётом доставки.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-9-1", question: "Рассматриваем ли предложения без НДС?", answer: "Да, по итоговой цене с доставкой" },
		],
		updatedAt: "2026-02-22T09:40:00.000Z",
	},
	{
		id: "task-10",
		name: "Уточнение условий договора и объёмов для Армодверь",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeEkaterina,
		createdAt: "2026-02-18T12:03:00.000Z",
		deadlineAt: "2026-02-25T18:00:00.000Z",
		description: "Поставщик Армодверь уточняет годовой объём и условия оплаты.",
		questionCount: 1,
		completedResponse: "Годовой объём — 180 000 м. Оплата — 100% предоплата в течение 2 банковских дней.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-10-1", question: "Годовой объём и условия оплаты?", answer: "180 000 м, 100% предоплата (2 б. д.)" },
		],
		updatedAt: "2026-02-19T11:00:00.000Z",
	},
	{
		id: "task-11",
		name: "Уточнение характеристик плёнки и доставки для ООО «Арли»",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeDmitry,
		createdAt: "2026-02-16T09:38:00.000Z",
		deadlineAt: "2026-02-23T18:00:00.000Z",
		description: "ООО «Арли» просит полное ТЗ: ширина, толщина, цвет и условия доставки.",
		questionCount: 2,
		completedResponse:
			"ПВД 2 600 мм, прозрачная, первичка. Доставка до Аксайского р-на включается в счёт. Толщина — по согласованию.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-11-1", question: "Точные характеристики плёнки?", answer: "ПВД 2 600 мм, первичка, прозрачная" },
			{ id: "sq-11-2", question: "Условия доставки?", answer: "До производства в Аксайском р-не, включена в счёт" },
		],
		updatedAt: "2026-02-17T16:20:00.000Z",
	},
	{
		id: "task-12",
		name: "Уточнение точного адреса доставки (номер дома/склада)",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeIvan,
		createdAt: "2026-02-17T10:12:00.000Z",
		deadlineAt: "2026-02-24T18:00:00.000Z",
		description: "Транспортные компании поставщиков запрашивают точные координаты разгрузки.",
		questionCount: 1,
		completedResponse:
			"Ростовская обл., Аксайский р-н, Грушевское с/п, Южная промзона, склад №3. Контакт: Королёв С., +7 (863) 320-01-01.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-12-1", question: "Точный адрес и контакт на складе?", answer: "Южная промзона, склад №3, Королёв С." },
		],
		updatedAt: "2026-02-18T13:40:00.000Z",
	},
	{
		id: "task-13",
		name: "Подтверждение первичного сырья (без вторсырья)",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeOlga,
		createdAt: "2026-02-15T14:20:00.000Z",
		deadlineAt: "2026-02-22T18:00:00.000Z",
		description: "Часть поставщиков предлагает ТУ-сырьё. Нужно подтвердить требование к первичке.",
		questionCount: 1,
		completedResponse: "Требование — только первичное сырьё (без вторсырья). Предложения на ТУ-сырьё не рассматриваем.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [{ id: "sq-13-1", question: "Допустимо ли ТУ-сырьё?", answer: "Нет, только первичка" }],
		updatedAt: "2026-02-16T12:00:00.000Z",
	},
	{
		id: "task-14",
		name: "Запрос образца плёнки перед заключением договора",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeEkaterina,
		createdAt: "2026-02-20T10:50:00.000Z",
		deadlineAt: "2026-02-28T18:00:00.000Z",
		description: "Нужен ли образец плёнки для ОТК перед первой отгрузкой.",
		questionCount: 1,
		completedResponse: "Образец 2×2 м запрашиваем у финалистов — после отбора по цене и условиям оплаты.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-14-1", question: "Когда и какой образец нужен?", answer: "2×2 м после отбора финалистов" },
		],
		updatedAt: "2026-02-22T15:10:00.000Z",
	},
	{
		id: "task-15",
		name: "Согласование условий отсрочки оплаты",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeDmitry,
		createdAt: "2026-02-22T11:30:00.000Z",
		deadlineAt: "2026-03-01T18:00:00.000Z",
		description: "Поставщики уточняют, рассматривает ли ОРМАТЕК отсрочку 14–30 дней вместо предоплаты.",
		questionCount: 2,
		completedResponse:
			"Первая поставка — 100% предоплата. После трёх успешных отгрузок — обсуждается отсрочка до 14 дней.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-15-1", question: "Возможна ли отсрочка?", answer: "Со второго контракта — до 14 дней" },
			{ id: "sq-15-2", question: "Когда пересматриваются условия?", answer: "После 3 успешных отгрузок" },
		],
		updatedAt: "2026-02-24T09:20:00.000Z",
	},
	{
		id: "task-16",
		name: "Сравнение цены за 1 кг vs за 1 м у разных поставщиков",
		status: "completed",
		item: ITEM_REF,
		assignee: assigneeIvan,
		createdAt: "2026-02-24T16:00:00.000Z",
		deadlineAt: "2026-03-03T18:00:00.000Z",
		description: "Поставщики указывают цены по-разному: кто-то за 1 кг, кто-то за 1 м. Нужен единый подход.",
		questionCount: 1,
		completedResponse:
			"Для итогового сравнения приводим все предложения к цене за 1 кг (с учётом толщины и плотности).",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-16-1", question: "Как приводим цены к общему знаменателю?", answer: "К цене за 1 кг" },
		],
		updatedAt: "2026-02-26T10:40:00.000Z",
	},
];

// --- Mutable store ---

let tasksStore: Task[] = [];

function cloneTask(t: Task): Task {
	return {
		...t,
		item: { ...t.item },
		assignee: t.assignee ? { ...t.assignee } : null,
		attachments: t.attachments.map((a) => ({ ...a })),
		supplierQuestions: t.supplierQuestions.map((q) => ({ ...q })),
	};
}

function seedStore() {
	tasksStore = SEED_TASKS.map(cloneTask);
}

seedStore();

export function _resetTasksStore(): void {
	seedStore();
}

export function _setTasks(tasks: Task[]): void {
	tasksStore = tasks.map(cloneTask);
}

export function _getAllTasks(): Task[] {
	return tasksStore.map(cloneTask);
}

// --- Internal helpers ---

function findTaskIndex(id: string): number {
	return tasksStore.findIndex((t) => t.id === id);
}

function requireTaskIdx(id: string): number {
	const idx = findTaskIndex(id);
	if (idx === -1) throw new Error(`Task ${id} not found`);
	return idx;
}

type TaskSortField = "created_at" | "deadline_at" | "question_count";

function getSortValue(t: Task, field: TaskSortField): number {
	if (field === "created_at") return new Date(t.createdAt).getTime();
	if (field === "deadline_at") return new Date(t.deadlineAt).getTime();
	return t.questionCount;
}

function sortTasks(tasks: Task[], field: TaskSortField, dir: "asc" | "desc"): Task[] {
	const mul = dir === "asc" ? 1 : -1;
	return [...tasks].sort((a, b) => mul * (getSortValue(a, field) - getSortValue(b, field)));
}

function applyFilters(tasks: Task[], params: TaskFilterParams): Task[] {
	const q = params.q?.trim().toLowerCase();
	return tasks.filter((t) => {
		if (q && !t.name.toLowerCase().includes(q)) return false;
		if (params.item && t.item.id !== params.item) return false;
		if (params.company && t.item.companyId !== params.company) return false;
		return true;
	});
}

function applySortIfAny(tasks: Task[], params: TaskFilterParams): Task[] {
	if (!params.sort) return tasks;
	return sortTasks(tasks, params.sort, params.dir ?? "asc");
}

const COLUMN_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 20;

// --- Mock API: board ---

export interface BoardColumn {
	results: Task[];
	next: string | null;
	count: number;
}

export interface TaskBoardResponse {
	assigned?: BoardColumn;
	in_progress?: BoardColumn;
	completed?: BoardColumn;
	archived?: BoardColumn;
	results?: Task[];
	next?: string | null;
}

export interface FetchTaskBoardParams {
	q?: string;
	item?: string;
	company?: string;
	sort?: TaskSortField;
	dir?: "asc" | "desc";
	column?: TaskStatus;
	cursor?: string;
}

function buildColumn(status: TaskStatus, params: FetchTaskBoardParams, cursor?: string): BoardColumn {
	const filterParams: TaskFilterParams = {
		q: params.q,
		item: params.item,
		company: params.company,
		sort: params.sort,
		dir: params.dir,
	};
	const filtered = applyFilters(tasksStore, filterParams).filter((t) => t.status === status);
	const sorted = applySortIfAny(filtered, filterParams);
	const page = paginate({
		items: sorted,
		cursor,
		limit: COLUMN_PAGE_SIZE,
		getId: (t) => t.id,
	});
	return {
		results: page.items.map(cloneTask),
		next: page.nextCursor,
		count: filtered.length,
	};
}

export async function fetchTaskBoardMock(params: FetchTaskBoardParams = {}): Promise<TaskBoardResponse> {
	await delay();
	if (params.column) {
		const col = buildColumn(params.column, params, params.cursor);
		return { results: col.results, next: col.next };
	}
	return {
		assigned: buildColumn("assigned", params),
		in_progress: buildColumn("in_progress", params),
		completed: buildColumn("completed", params),
		archived: buildColumn("archived", params),
	};
}

// --- Mock API: list ---

export interface FetchTasksParams {
	page?: number;
	page_size?: number;
	q?: string;
	item?: string;
	company?: string;
	sort?: TaskSortField;
	dir?: "asc" | "desc";
}

export interface TaskListResponse {
	count: number;
	results: Task[];
	next: string | null;
	previous: string | null;
}

export async function fetchTasksMock(params: FetchTasksParams = {}): Promise<TaskListResponse> {
	await delay();
	const filterParams: TaskFilterParams = {
		q: params.q,
		item: params.item,
		company: params.company,
		sort: params.sort,
		dir: params.dir,
	};
	const filtered = applyFilters(tasksStore, filterParams);
	const sorted = applySortIfAny(filtered, filterParams);
	const pageSize = params.page_size ?? LIST_PAGE_SIZE;
	const page = params.page ?? 1;
	const start = (page - 1) * pageSize;
	const end = start + pageSize;
	const slice = sorted.slice(start, end);
	return {
		count: filtered.length,
		results: slice.map(cloneTask),
		next: end < filtered.length ? `page=${page + 1}` : null,
		previous: page > 1 ? `page=${page - 1}` : null,
	};
}

// --- Mock API: detail ---

export async function fetchTaskMock(id: string): Promise<Task> {
	await delay();
	const idx = findTaskIndex(id);
	if (idx === -1) throw new Error(`Task ${id} not found`);
	return cloneTask(tasksStore[idx]);
}

// --- Mock API: status change ---

export async function changeTaskStatusMock(
	id: string,
	data: { status: TaskStatus; completedResponse?: string },
): Promise<Task> {
	await delay();
	const idx = requireTaskIdx(id);
	const current = tasksStore[idx];
	const updated: Task = {
		...current,
		status: data.status,
		completedResponse: data.completedResponse ?? current.completedResponse,
		updatedAt: new Date().toISOString(),
	};
	if (data.status === "archived" && current.status !== "archived") {
		updated.statusBeforeArchive = current.status;
	}
	tasksStore[idx] = updated;
	return cloneTask(updated);
}

// --- Mock API: attachments ---

function fileExtension(name: string): string {
	const lastDot = name.lastIndexOf(".");
	return lastDot === -1 ? "" : name.slice(lastDot + 1).toLowerCase();
}

export async function uploadTaskAttachmentsMock(id: string, files: File[]): Promise<Attachment[]> {
	await delay();
	const idx = requireTaskIdx(id);
	const created: Attachment[] = files.map((file) => ({
		id: nextId("att"),
		fileName: file.name,
		fileSize: file.size,
		fileType: fileExtension(file.name),
		contentType: file.type || "application/octet-stream",
		fileUrl: createBlobUrl(file),
		uploadedAt: new Date().toISOString(),
	}));
	const current = tasksStore[idx];
	tasksStore[idx] = {
		...current,
		attachments: [...current.attachments, ...created],
		updatedAt: new Date().toISOString(),
	};
	return created.map((a) => ({ ...a }));
}

export async function deleteTaskAttachmentMock(id: string, attachmentId: string): Promise<void> {
	await delay();
	const idx = requireTaskIdx(id);
	const current = tasksStore[idx];
	tasksStore[idx] = {
		...current,
		attachments: current.attachments.filter((a) => a.id !== attachmentId),
		updatedAt: new Date().toISOString(),
	};
}
