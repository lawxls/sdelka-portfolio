import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetTaskStore, _setMockDelay, getTask, getTasks, submitAnswer, updateTaskStatus } from "./task-mock-data";
import type { TaskStatus } from "./task-types";
import { TASK_STATUSES } from "./task-types";

beforeEach(() => {
	_resetTaskStore();
	_setMockDelay(0, 0);
});

afterEach(() => {
	_resetTaskStore();
});

describe("mock task store", () => {
	it("has 60 tasks distributed across 4 statuses (~15 each)", async () => {
		let total = 0;
		for (const status of TASK_STATUSES) {
			const { tasks } = await getTasks(status);
			expect(tasks.length).toBe(15);
			total += tasks.length;
		}
		expect(total).toBe(60);
	});

	it("has 4 distinct assignees with Russian names", async () => {
		const assignees = new Set<string>();
		for (const status of TASK_STATUSES) {
			const { tasks } = await getTasks(status);
			for (const task of tasks) {
				assignees.add(task.assignee.name);
			}
		}
		expect(assignees.size).toBe(4);
		for (const name of assignees) {
			expect(name).toMatch(/[А-Яа-яЁё]/);
		}
	});

	it("completed tasks have answers", async () => {
		const { tasks } = await getTasks("completed");
		for (const task of tasks) {
			expect(task.answer).toBeTruthy();
		}
	});

	it("non-completed tasks have no answers", async () => {
		for (const status of ["assigned", "in_progress", "archived"] as TaskStatus[]) {
			const { tasks } = await getTasks(status);
			for (const task of tasks) {
				expect(task.answer).toBeNull();
			}
		}
	});
});

describe("getTasks", () => {
	it("filters by status", async () => {
		const { tasks } = await getTasks("in_progress");
		for (const task of tasks) {
			expect(task.status).toBe("in_progress");
		}
	});

	it("returns paginated results with cursor", async () => {
		const page1 = await getTasks("assigned", undefined, 5);
		expect(page1.tasks).toHaveLength(5);
		expect(page1.nextCursor).toBe("5");

		const page2 = await getTasks("assigned", page1.nextCursor ?? undefined, 5);
		expect(page2.tasks).toHaveLength(5);
		expect(page2.nextCursor).toBe("10");

		const page3 = await getTasks("assigned", page2.nextCursor ?? undefined, 5);
		expect(page3.tasks).toHaveLength(5);
		expect(page3.nextCursor).toBeNull();
	});

	it("returns null cursor when all items fit in one page", async () => {
		const { tasks, nextCursor } = await getTasks("assigned", undefined, 20);
		expect(tasks).toHaveLength(15);
		expect(nextCursor).toBeNull();
	});

	it("defaults to limit of 20", async () => {
		const { tasks } = await getTasks("assigned");
		expect(tasks).toHaveLength(15);
	});
});

describe("getTask", () => {
	it("returns a single task by id", async () => {
		const task = await getTask("task-1");
		expect(task.id).toBe("task-1");
		expect(task.title).toBeTruthy();
		expect(task.status).toBe("assigned");
	});

	it("throws for unknown id", async () => {
		await expect(getTask("nonexistent")).rejects.toThrow("not found");
	});
});

describe("updateTaskStatus", () => {
	it("updates status in store", async () => {
		const updated = await updateTaskStatus("task-1", "in_progress");
		expect(updated.status).toBe("in_progress");

		const fetched = await getTask("task-1");
		expect(fetched.status).toBe("in_progress");
	});

	it("throws for unknown id", async () => {
		await expect(updateTaskStatus("nonexistent", "completed")).rejects.toThrow("not found");
	});
});

describe("submitAnswer", () => {
	it("sets answer text and moves task to completed", async () => {
		const updated = await submitAnswer("task-1", "Ответ на вопрос", ["doc.pdf"]);
		expect(updated.answer).toBe("Ответ на вопрос");
		expect(updated.attachments).toEqual(["doc.pdf"]);
		expect(updated.status).toBe("completed");

		const fetched = await getTask("task-1");
		expect(fetched.answer).toBe("Ответ на вопрос");
		expect(fetched.status).toBe("completed");
	});

	it("throws for unknown id", async () => {
		await expect(submitAnswer("nonexistent", "answer")).rejects.toThrow("not found");
	});
});
