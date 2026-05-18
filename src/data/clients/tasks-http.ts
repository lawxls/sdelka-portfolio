import type {
	Attachment,
	ChangeStatusData,
	FetchTaskBoardParams,
	FetchTasksParams,
	Task,
	TaskListResponse,
} from "../domains/tasks";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import { type DrfCursorPage, toCursorPage } from "./drf";
import { composeTaskBoard, type ListLikeResponse } from "./tasks-board";
import { statusesToBucketString } from "./tasks-buckets";
import type { TasksClient } from "./tasks-client";
import { type TaskWire, taskFromApi } from "./tasks-wire";

function buildQuery(params: Record<string, unknown>): string {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		sp.set(key, String(value));
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}

const enc = encodeURIComponent;

const LIST_ALL_PAGE_SIZE = 200;

interface ListParamsInternal extends FetchTasksParams {
	status?: string;
}

/** Translate the SPA's list params to the DRF query surface. `statuses?:
 * TaskStatus[]` collapses into the API's bucket-string `status=` filter. */
function listQuery(params: ListParamsInternal): string {
	return buildQuery({
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
			const collected: Task[] = [];
			let cursor: string | undefined;
			while (true) {
				const page = await fetchListPage({ cursor, page_size: LIST_ALL_PAGE_SIZE });
				collected.push(...page.results);
				if (!page.next) break;
				cursor = page.next;
			}
			return collected;
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

		uploadAttachments: async (_id: string, _files: File[]): Promise<Attachment[]> => {
			// Attachment upload is multipart/form-data; the shared httpClient is JSON-only
			// today. Production composition root falls back to the in-memory adapter for
			// uploads until the backend exposes the endpoint and the client gains a
			// FormData path.
			throw new Error("HTTP uploadAttachments not implemented yet");
		},

		deleteAttachment: async (_id: string, _attachmentId: string): Promise<void> => {
			throw new Error("HTTP deleteAttachment not implemented yet");
		},
	};
}
