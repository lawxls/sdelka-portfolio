import type {
	Attachment,
	ChangeStatusData,
	FetchTaskBoardParams,
	FetchTasksParams,
	Task,
	TaskListResponse,
} from "../domains/tasks";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import { buildQueryString, type DrfCursorPage, toCursorPage } from "./drf";
import { composeTaskBoard, type ListLikeResponse } from "./tasks-board";
import { statusesToBucketString, TASK_STATUS_BUCKETS } from "./tasks-buckets";
import type { TasksClient } from "./tasks-client";
import { type TaskWire, taskFromApi } from "./tasks-wire";

const enc = encodeURIComponent;

const LIST_ALL_PAGE_SIZE = 200;
const LIST_ALL_HARD_CAP_PAGES = 500;

interface ListParamsInternal extends FetchTasksParams {
	status?: string;
}

function listQuery(params: ListParamsInternal): string {
	return buildQueryString({
		q: params.q,
		procurementInquiry: params.procurementInquiry,
		company: params.company,
		status: params.status ?? statusesToBucketString(params.statuses),
		sort: params.sort,
		dir: params.dir,
		cursor: params.cursor,
		pageSize: params.page_size,
	});
}

export function createHttpTasksClient(http: HttpClient = defaultHttpClient): TasksClient {
	const fetchListPage = async (params: ListParamsInternal): Promise<ListLikeResponse> => {
		const wire = await http.get<DrfCursorPage<TaskWire> & { count?: number }>(`/tasks/${listQuery(params)}`);
		const { items, nextCursor } = toCursorPage(wire);
		return {
			results: items.map(taskFromApi),
			count: wire.count ?? items.length,
			next: nextCursor,
		};
	};

	return {
		listAll: async () => {
			// Explicit bucket filter so the request is unambiguous (the API may
			// require `status` to be set). Sequential because each cursor token
			// depends on the previous response.
			const status = TASK_STATUS_BUCKETS.join(",");
			const collected: Task[] = [];
			let cursor: string | undefined;
			for (let i = 0; i < LIST_ALL_HARD_CAP_PAGES; i += 1) {
				const page = await fetchListPage({ cursor, page_size: LIST_ALL_PAGE_SIZE, status });
				collected.push(...page.results);
				if (!page.next) return collected;
				cursor = page.next;
			}
			throw new Error(`tasks.listAll: hit ${LIST_ALL_HARD_CAP_PAGES}-page cap`);
		},

		list: async (params): Promise<TaskListResponse> => {
			const page = await fetchListPage(params ?? {});
			return { results: page.results, count: page.count, next: page.next, previous: null };
		},

		board: (params?: FetchTaskBoardParams) => composeTaskBoard(fetchListPage, params),

		get: async (id) => taskFromApi(await http.get<TaskWire>(`/tasks/${enc(id)}/`)),

		changeStatus: async (id, data: ChangeStatusData) => {
			const body: Record<string, unknown> = {};
			if (data.status !== undefined) body.status = data.status;
			if (data.completedResponse !== undefined) body.completedResponse = data.completedResponse;
			return taskFromApi(await http.post<TaskWire>(`/tasks/${enc(id)}/change_status/`, { body }));
		},

		// Attachment endpoints are multipart-only and not yet on the API.
		// The composition root swaps in the in-memory implementation.
		uploadAttachments: async (_id: string, _files: File[]): Promise<Attachment[]> => {
			throw new Error("HTTP uploadAttachments not implemented yet");
		},
		deleteAttachment: async (_id: string, _attachmentId: string): Promise<void> => {
			throw new Error("HTTP deleteAttachment not implemented yet");
		},
	};
}
