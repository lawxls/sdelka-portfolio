/**
 * Tasks mock data — barrel re-exporting the decomposed sub-modules. The
 * actual store, queries, mutations, and seed live in `tasks-mock/` and
 * `seeds/tasks.ts` respectively. This file preserves the import surface
 * the in-memory adapter and the legacy mock-store test rely on.
 */

export {
	changeTaskStatusMock,
	deleteTaskAttachmentMock,
	uploadTaskAttachmentsMock,
} from "./tasks-mock/mutations";
export {
	fetchAllTasksMock,
	fetchTaskBoardMock,
	fetchTaskMock,
	fetchTasksMock,
} from "./tasks-mock/queries";
export { _getAllTasks, _resetTasksStore, _setTasks } from "./tasks-mock/store";
