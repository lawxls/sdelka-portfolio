import type { Attachment, ChangeStatusData, Task, TaskBoardResponse, TaskListResponse } from "../domains/tasks";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { TasksClient } from "./tasks-client";

function buildQuery(params: object): string {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		if (Array.isArray(value)) {
			for (const v of value) sp.append(key, String(v));
		} else {
			sp.set(key, String(value));
		}
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}

const enc = encodeURIComponent;

export function createHttpTasksClient(http: HttpClient = defaultHttpClient): TasksClient {
	return {
		listAll: () => http.get<Task[]>(`/api/tasks/all`),

		list: (params) => http.get<TaskListResponse>(`/api/tasks${buildQuery(params ?? {})}`),

		board: (params) => http.get<TaskBoardResponse>(`/api/tasks/board${buildQuery(params ?? {})}`),

		get: (id) => http.get<Task>(`/api/tasks/${enc(id)}`),

		changeStatus: (id, data: ChangeStatusData) => http.post<Task>(`/api/tasks/${enc(id)}/status`, { body: data }),

		uploadAttachments: async (_id: string, _files: File[]): Promise<Attachment[]> => {
			// Attachment upload is multipart/form-data; the shared httpClient is JSON-only
			// today. Production composition root falls back to the in-memory adapter for
			// uploads until the backend exposes the endpoint and the client gains a
			// FormData path.
			throw new Error("HTTP uploadAttachments not implemented yet");
		},

		deleteAttachment: (id, attachmentId) => http.delete<void>(`/api/tasks/${enc(id)}/attachments/${enc(attachmentId)}`),
	};
}
