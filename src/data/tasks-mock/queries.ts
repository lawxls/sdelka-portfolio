import type {
	BoardColumn,
	FetchTaskBoardParams,
	FetchTasksParams,
	TaskBoardResponse,
	TaskListResponse,
} from "../domains/tasks";
import { delay, paginate } from "../mock-utils";
import type { Task, TaskFilterParams, TaskSortField, TaskStatus } from "../task-types";
import { cloneTask, findTaskIndex, readTasks } from "./store";

const COLUMN_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 20;

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

function buildColumn(status: TaskStatus, params: FetchTaskBoardParams, cursor?: string): BoardColumn {
	const filterParams: TaskFilterParams = {
		q: params.q,
		item: params.item,
		company: params.company,
		sort: params.sort,
		dir: params.dir,
	};
	const filtered = applyFilters(readTasks(), filterParams).filter((t) => t.status === status);
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

export async function fetchAllTasksMock(): Promise<Task[]> {
	await delay();
	return readTasks().map(cloneTask);
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
	let filtered = applyFilters(readTasks(), filterParams);
	if (params.statuses && params.statuses.length > 0) {
		const allowed = new Set(params.statuses);
		filtered = filtered.filter((t) => allowed.has(t.status));
	}
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

export async function fetchTaskMock(id: string): Promise<Task> {
	await delay();
	const idx = findTaskIndex(id);
	if (idx === -1) throw new Error(`Task ${id} not found`);
	return cloneTask(readTasks()[idx]);
}
