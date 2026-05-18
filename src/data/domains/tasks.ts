/**
 * Tasks domain types — the import surface used by the tasks client and contract
 * tests. Behavior, fixtures, and helpers live elsewhere; this module is
 * types-only. Components still import nested types and status-icon config
 * directly from `task-types`.
 */
export type { Attachment, Task, TaskSortField, TaskStatus } from "../task-types";

import type { Task, TaskFilterParams, TaskSortField, TaskStatus } from "../task-types";

/**
 * Per-bucket column in a board response. The board view is keyed by the API's
 * bucket-status (active | completed | archived), so it gets its own typed
 * shape rather than `CursorPage<T>`.
 */
export interface BoardColumn {
	results: Task[];
	next: string | null;
	count: number;
}

/**
 * Bucket-status keys used in the board response. The SPA collapses raw
 * statuses (assigned + in_progress) into the `active` bucket so the column
 * layout aligns with the API's `status` filter.
 */
export type TaskBoardBucket = "active" | "completed" | "archived";

/**
 * Board response. Either three buckets (default board fetch) or a single
 * column payload when `column` is passed (board column pagination).
 */
export interface TaskBoardResponse {
	active?: BoardColumn;
	completed?: BoardColumn;
	archived?: BoardColumn;
	results?: Task[];
	next?: string | null;
}

export interface FetchTaskBoardParams {
	q?: string;
	procurementInquiry?: string;
	company?: string;
	sort?: TaskSortField;
	dir?: "asc" | "desc";
	column?: TaskBoardBucket;
	cursor?: string;
}

export interface FetchTasksParams extends TaskFilterParams {
	page?: number;
	page_size?: number;
	statuses?: TaskStatus[];
	cursor?: string;
}

export interface TaskListResponse {
	count: number;
	results: Task[];
	next: string | null;
	previous: string | null;
}

export interface ChangeStatusData {
	status?: TaskStatus;
	completedResponse?: string;
}
