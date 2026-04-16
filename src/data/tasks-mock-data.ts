import { createBlobUrl, delay, nextId, paginate } from "./mock-utils";
import type { Attachment, Task, TaskFilterParams, TaskStatus } from "./task-types";

// --- Seed data ---

const assigneeAlex = {
	id: "user-1",
	firstName: "Алексей",
	lastName: "Иванов",
	email: "a.ivanov@sdelka.ru",
	avatarIcon: "blue",
};
const assigneeMaria = {
	id: "user-2",
	firstName: "Мария",
	lastName: "Петрова",
	email: "m.petrova@sdelka.ru",
	avatarIcon: "green",
};
const assigneeDmitry = {
	id: "user-3",
	firstName: "Дмитрий",
	lastName: "Козлов",
	email: "d.kozlov@sdelka.ru",
	avatarIcon: "orange",
};
const assigneeElena = {
	id: "user-4",
	firstName: "Елена",
	lastName: "Смирнова",
	email: "e.smirnova@sdelka.ru",
	avatarIcon: "red",
};

const SEED_TASKS: Task[] = [
	{
		id: "task-1",
		name: "Согласование цены с МеталлТрейд",
		status: "assigned",
		item: { id: "item-1", name: "Арматура А500С ∅12", companyId: "company-1" },
		assignee: assigneeAlex,
		createdAt: "2026-04-01T09:15:00.000Z",
		deadlineAt: "2026-04-20T18:00:00.000Z",
		description:
			"Запросить у МеталлТрейд обновлённое КП на арматуру А500С ∅12. Уточнить минимальную партию и сроки поставки на склад Москва.",
		questionCount: 2,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-1", question: "Минимальная партия?", answer: null },
			{ id: "sq-2", question: "Срок поставки?", answer: null },
		],
		updatedAt: "2026-04-01T09:15:00.000Z",
	},
	{
		id: "task-2",
		name: "Запросить образцы трубы профильной",
		status: "assigned",
		item: { id: "item-2", name: "Труба профильная 40×20", companyId: "company-1" },
		assignee: assigneeMaria,
		createdAt: "2026-04-03T11:30:00.000Z",
		deadlineAt: "2026-04-18T18:00:00.000Z",
		description: "Запросить образцы у ТрубоСталь для проверки соответствия ГОСТ.",
		questionCount: 1,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [{ id: "sq-3", question: "Возможность отгрузки образцов?", answer: null }],
		updatedAt: "2026-04-03T11:30:00.000Z",
	},
	{
		id: "task-3",
		name: "Проверить сертификаты на кладочную сетку",
		status: "assigned",
		item: { id: "item-4", name: "Сетка кладочная 50×50", companyId: "company-1" },
		assignee: assigneeDmitry,
		createdAt: "2026-04-05T14:00:00.000Z",
		deadlineAt: "2026-04-22T18:00:00.000Z",
		description: "Получить от поставщика копии сертификатов соответствия на партию кладочной сетки.",
		questionCount: 0,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [],
		updatedAt: "2026-04-05T14:00:00.000Z",
	},
	{
		id: "task-4",
		name: "Уточнить график поставок проволоки",
		status: "assigned",
		item: { id: "item-14", name: "Проволока вязальная 1.2мм", companyId: "company-1" },
		assignee: assigneeElena,
		createdAt: "2026-04-08T08:45:00.000Z",
		deadlineAt: "2026-04-25T18:00:00.000Z",
		description: "Согласовать с поставщиком помесячный график поставок на квартал.",
		questionCount: 1,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [{ id: "sq-4", question: "Возможна ли помесячная отгрузка?", answer: null }],
		updatedAt: "2026-04-08T08:45:00.000Z",
	},
	{
		id: "task-5",
		name: "Переговоры по цементу М500",
		status: "in_progress",
		item: { id: "item-5", name: "Цемент М500 Д0", companyId: "company-1" },
		assignee: assigneeAlex,
		createdAt: "2026-03-20T10:00:00.000Z",
		deadlineAt: "2026-04-15T18:00:00.000Z",
		description: "Вести переговоры с ЦементСтрой о снижении цены при увеличении объёма до 1000 т/год.",
		questionCount: 3,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [
			{ id: "sq-5", question: "Скидка за объём?", answer: "5% при объёме от 1000 т" },
			{ id: "sq-6", question: "Условия отсрочки?", answer: null },
			{ id: "sq-7", question: "Сроки поставки?", answer: null },
		],
		updatedAt: "2026-04-10T12:00:00.000Z",
	},
	{
		id: "task-6",
		name: "Анализ КП по дюбелям",
		status: "in_progress",
		item: { id: "item-10", name: "Дюбель распорный 10×60", companyId: "company-1" },
		assignee: assigneeMaria,
		createdAt: "2026-03-25T09:20:00.000Z",
		deadlineAt: "2026-04-12T18:00:00.000Z",
		description: "Сравнить предложения от КрепёжОпт и альтернативных поставщиков. Подготовить сравнительную таблицу.",
		questionCount: 2,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [],
		updatedAt: "2026-04-05T14:30:00.000Z",
	},
	{
		id: "task-7",
		name: "Обсудить условия по трубе профильной",
		status: "in_progress",
		item: { id: "item-2", name: "Труба профильная 40×20", companyId: "company-1" },
		assignee: assigneeDmitry,
		createdAt: "2026-03-28T11:00:00.000Z",
		deadlineAt: "2026-04-17T18:00:00.000Z",
		description: "Провести встречу с ТрубоСталь по обновлению условий договора на 2026 год.",
		questionCount: 2,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [],
		updatedAt: "2026-04-08T10:15:00.000Z",
	},
	{
		id: "task-8",
		name: "Подтверждение поставки швеллера",
		status: "completed",
		item: { id: "item-3", name: "Швеллер 10П", companyId: "company-1" },
		assignee: assigneeAlex,
		createdAt: "2026-03-10T09:00:00.000Z",
		deadlineAt: "2026-03-25T18:00:00.000Z",
		description: "Подтвердить у поставщика готовность партии к отгрузке.",
		questionCount: 1,
		completedResponse:
			"Партия готова к отгрузке 27 марта. Поставщик подтвердил соответствие спецификации, документы готовы.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [{ id: "sq-8", question: "Дата отгрузки?", answer: "27 марта 2026" }],
		updatedAt: "2026-03-22T16:20:00.000Z",
	},
	{
		id: "task-9",
		name: "Согласование договора на болты",
		status: "completed",
		item: { id: "item-8", name: "Болт М12×80 оцинкованный", companyId: "company-1" },
		assignee: assigneeElena,
		createdAt: "2026-03-05T08:30:00.000Z",
		deadlineAt: "2026-03-20T18:00:00.000Z",
		description: "Согласовать и подписать годовой договор с КрепёжОпт.",
		questionCount: 0,
		completedResponse: "Договор подписан 18 марта. Условия: отсрочка 30 дней, объём 15000 шт/год, цена 19 ₽/шт.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [],
		updatedAt: "2026-03-18T14:00:00.000Z",
	},
	{
		id: "task-10",
		name: "Выбор поставщика фитингов",
		status: "completed",
		item: { id: "item-13", name: "Фитинг латунный ½″", companyId: "company-1" },
		assignee: assigneeMaria,
		createdAt: "2026-02-28T10:00:00.000Z",
		deadlineAt: "2026-03-18T18:00:00.000Z",
		description: "По результатам трёх КП выбрать оптимального поставщика фитингов.",
		questionCount: 1,
		completedResponse: "Выбран АкваПром. Цена 128 ₽/шт, отсрочка 14 дней, доставка бесплатно от 500 шт.",
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [{ id: "sq-9", question: "Минимальный заказ?", answer: "500 шт для бесплатной доставки" }],
		updatedAt: "2026-03-16T11:30:00.000Z",
	},
	{
		id: "task-11",
		name: "Старый запрос по гвоздям",
		status: "archived",
		item: { id: "item-archived-1", name: "Гвозди строительные 100", companyId: "company-1" },
		assignee: assigneeDmitry,
		createdAt: "2026-01-15T10:00:00.000Z",
		deadlineAt: "2026-02-01T18:00:00.000Z",
		description: "Позиция больше не закупается. Архивировано.",
		questionCount: 0,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: "assigned",
		supplierQuestions: [],
		updatedAt: "2026-02-10T09:00:00.000Z",
	},
	{
		id: "task-12",
		name: "Обсуждение цены на сварную сетку",
		status: "archived",
		item: { id: "item-archived-2", name: "Сетка сварная 100×100", companyId: "company-1" },
		assignee: assigneeAlex,
		createdAt: "2026-01-20T11:30:00.000Z",
		deadlineAt: "2026-02-05T18:00:00.000Z",
		description: "Позиция выведена из закупки — решение директора.",
		questionCount: 0,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: "in_progress",
		supplierQuestions: [],
		updatedAt: "2026-02-08T16:00:00.000Z",
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
