/**
 * Tasks domain types — the import surface used by the tasks client and contract
 * tests. Behavior, fixtures, and helpers live elsewhere; this module is
 * types-only. Components still import nested types and status-icon config
 * directly from `task-types`.
 */
export type { Attachment, Task, TaskSortField, TaskStatus } from "../task-types";

import type { Task, TaskFilterParams, TaskSortField, TaskStatus } from "../task-types";

/**
 * Per-status column in a board response. The board view is a status-keyed
 * object (not a flat cursor page), so it gets its own typed shape rather than
 * `CursorPage<T>`.
 */
export interface BoardColumn {
	results: Task[];
	next: string | null;
	count: number;
}

/**
 * Board response. Either four columns (default board fetch) or a single column
 * payload when `column` is passed (board column pagination).
 */
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

export interface FetchTasksParams extends TaskFilterParams {
	page?: number;
	page_size?: number;
	statuses?: TaskStatus[];
}

export interface TaskListResponse {
	count: number;
	results: Task[];
	next: string | null;
	previous: string | null;
}

export interface ChangeStatusData {
	status: TaskStatus;
	completedResponse?: string;
}
