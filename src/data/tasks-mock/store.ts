import { SEED_TASKS_HYDRATED } from "../seeds/tasks";
import type { Task } from "../task-types";

let tasksStore: Task[] = [];

/** Defensive deep-copy of a stored Task — used both on read (to keep callers
 * from accidentally mutating the store) and on store-replacement (so callers
 * holding a Task reference can't reach back into the singleton). */
export function cloneTask(t: Task): Task {
	return {
		...t,
		item: { ...t.item },
		assignee: t.assignee ? { ...t.assignee } : null,
		attachments: t.attachments.map((a) => ({ ...a })),
		supplierQuestions: t.supplierQuestions.map((q) => ({ ...q })),
	};
}

function seedStore() {
	tasksStore = SEED_TASKS_HYDRATED.map(cloneTask);
}

seedStore();

export function _resetTasksStore(): void {
	seedStore();
}

export function _setTasks(tasks: Task[]): void {
	tasksStore = tasks.map(cloneTask);
}

export function _getAllTasks(): Task[] {
	return tasksStore.map(cloneTask);
}

/** Read-side accessor for queries. Returns the live array reference; callers
 * must not mutate it. Mutations go through `writeTaskAt` so they remain
 * visible to readers even after `_setTasks` replaces the underlying array. */
export function readTasks(): Task[] {
	return tasksStore;
}

/** Write-side accessor for mutations. Replaces the task at `idx` in the live
 * store. Mutations are responsible for cloning if they need to. */
export function writeTaskAt(idx: number, task: Task): void {
	tasksStore[idx] = task;
}

export function getTaskAt(idx: number): Task {
	return tasksStore[idx];
}

export function findTaskIndex(id: string): number {
	return tasksStore.findIndex((t) => t.id === id);
}

export function requireTaskIdx(id: string): number {
	const idx = findTaskIndex(id);
	if (idx === -1) throw new Error(`Task ${id} not found`);
	return idx;
}
