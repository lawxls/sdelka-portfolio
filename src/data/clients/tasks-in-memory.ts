import type {
	Attachment,
	ChangeStatusData,
	FetchTaskBoardParams,
	FetchTasksParams,
	Task,
	TaskBoardResponse,
	TaskListResponse,
} from "../domains/tasks";
import {
	_setTasks,
	changeTaskStatusMock,
	deleteTaskAttachmentMock,
	fetchAllTasksMock,
	fetchTaskBoardMock,
	fetchTaskMock,
	fetchTasksMock,
	uploadTaskAttachmentsMock,
} from "../tasks-mock-data";
import type { TasksClient } from "./tasks-client";

export interface InMemoryTasksOptions {
	/** Replace the module-level mock store with these tasks at construction time.
	 * Used by tests to seed deterministically without reaching into `_setTasks`. */
	seed?: Task[];
}

/**
 * Build an in-memory tasks adapter wrapping the module-level mock store
 * (`tasks-mock-data`). The store is a singleton so any cross-cutting tooling
 * (test setup, debug panels) sees the same state the hook sees. Passing `seed`
 * replaces the singleton's contents so a test lands deterministically without
 * reaching into `_setTasks` directly.
 */
export function createInMemoryTasksClient(options?: InMemoryTasksOptions): TasksClient {
	if (options?.seed !== undefined) {
		_setTasks(options.seed);
	}

	return {
		async listAll(): Promise<Task[]> {
			return fetchAllTasksMock();
		},

		async list(params?: FetchTasksParams): Promise<TaskListResponse> {
			return fetchTasksMock(params ?? {});
		},

		async board(params?: FetchTaskBoardParams): Promise<TaskBoardResponse> {
			return fetchTaskBoardMock(params ?? {});
		},

		async get(id: string): Promise<Task> {
			return fetchTaskMock(id);
		},

		async changeStatus(id: string, data: ChangeStatusData): Promise<Task> {
			return changeTaskStatusMock(id, data);
		},

		async uploadAttachments(id: string, files: File[]): Promise<Attachment[]> {
			return uploadTaskAttachmentsMock(id, files);
		},

		async deleteAttachment(id: string, attachmentId: string): Promise<void> {
			return deleteTaskAttachmentMock(id, attachmentId);
		},
	};
}
