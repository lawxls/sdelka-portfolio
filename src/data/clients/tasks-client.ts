import type {
	Attachment,
	ChangeStatusData,
	FetchTaskBoardParams,
	FetchTasksParams,
	Task,
	TaskBoardResponse,
	TaskListResponse,
} from "../domains/tasks";

/**
 * Public seam for the tasks domain. Implementations are in-memory (mock store)
 * or HTTP. Hooks pull this through context, so swapping adapters is a one-line
 * change in the composition root.
 *
 * The board view returns a status-keyed payload (`TaskBoardResponse`) — its
 * own typed shape, distinct from the cursor-paginated `list`. Per-column
 * pagination is folded into the same `board` call (caller passes `column` +
 * `cursor`), keeping the surface narrow.
 */
export interface TasksClient {
	/** All tasks across statuses (no filter / pagination). Drives the global "Все задачи" surface. */
	listAll(): Promise<Task[]>;
	/** Page-based list. Filter + sort + status set narrow the result; `page_size` defaults to 20. */
	list(params?: FetchTasksParams): Promise<TaskListResponse>;
	/** Board view. Without `column`, returns four columns. With `column` + optional `cursor`, returns one column page. */
	board(params?: FetchTaskBoardParams): Promise<TaskBoardResponse>;
	get(id: string): Promise<Task>;
	changeStatus(id: string, data: ChangeStatusData): Promise<Task>;
	uploadAttachments(id: string, files: File[]): Promise<Attachment[]>;
	deleteAttachment(id: string, attachmentId: string): Promise<void>;
}
