import type { BoardColumn, FetchTaskBoardParams, FetchTasksParams, TaskBoardResponse } from "../domains/tasks";
import type { Task } from "../task-types";
import { TASK_STATUS_BUCKETS, type TaskStatusBucket } from "./tasks-buckets";

/**
 * Tasks board composer — converts the SPA-canonical "board" request into a
 * fan-out of single-bucket list calls. The backend's `status` filter only
 * supports buckets, so the four columns the SPA used to render collapse to
 * three: `active` (assigned + in_progress) | `completed` | `archived`.
 *
 * The composer is shape-agnostic about *how* `list` returns its data — it
 * works against the SPA-canonical list shape so it can be unit-tested with a
 * plain stub.
 */

export interface ListLikeResponse {
	results: Task[];
	count: number;
	next: string | null;
}

export type ListFn = (params: FetchTasksParams & { status?: string }) => Promise<ListLikeResponse>;

const PAGE_SIZE = 20;

function pickBucketFromColumn(column: string | undefined): TaskStatusBucket | undefined {
	if (column === "active" || column === "completed" || column === "archived") return column;
	return undefined;
}

/** Compose a board response from three parallel bucket-filtered list calls.
 * If `column` is set on the params, returns a single-column page instead
 * (used by per-column pagination). */
export async function composeTaskBoard(list: ListFn, params: FetchTaskBoardParams = {}): Promise<TaskBoardResponse> {
	const shared: FetchTasksParams = {
		q: params.q,
		procurementInquiry: params.procurementInquiry,
		company: params.company,
		sort: params.sort,
		dir: params.dir,
		page_size: PAGE_SIZE,
	};

	const single = pickBucketFromColumn(params.column);
	if (single) {
		const page = await list({ ...shared, status: single, cursor: params.cursor });
		return { results: page.results, next: page.next };
	}

	const buckets = TASK_STATUS_BUCKETS;
	const pages = await Promise.all(buckets.map((bucket) => list({ ...shared, status: bucket })));
	const response: TaskBoardResponse = {};
	for (let i = 0; i < buckets.length; i += 1) {
		const bucket = buckets[i];
		const page = pages[i];
		const column: BoardColumn = { results: page.results, count: page.count, next: page.next };
		response[bucket] = column;
	}
	return response;
}
