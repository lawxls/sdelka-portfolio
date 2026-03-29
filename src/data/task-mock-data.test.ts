import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	_resetTaskStore,
	_setMockDelay,
	getAllTasks,
	getProcurementItems,
	getTask,
	getTasks,
	submitAnswer,
	updateTaskStatus,
} from "./task-mock-data";
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
	it("has 100 tasks distributed across 4 statuses (25 each)", async () => {
		let total = 0;
		for (const status of TASK_STATUSES) {
			const { tasks } = await getTasks(status, undefined, 30);
			expect(tasks.length).toBe(25);
			total += tasks.length;
		}
		expect(total).toBe(100);
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
		const page1 = await getTasks("assigned", undefined, 10);
		expect(page1.tasks).toHaveLength(10);
		expect(page1.nextCursor).toBe("10");

		const page2 = await getTasks("assigned", page1.nextCursor ?? undefined, 10);
		expect(page2.tasks).toHaveLength(10);
		expect(page2.nextCursor).toBe("20");

		const page3 = await getTasks("assigned", page2.nextCursor ?? undefined, 10);
		expect(page3.tasks).toHaveLength(5);
		expect(page3.nextCursor).toBeNull();
	});

	it("returns null cursor when all items fit in one page", async () => {
		const { tasks, nextCursor } = await getTasks("assigned", undefined, 30);
		expect(tasks).toHaveLength(25);
		expect(nextCursor).toBeNull();
	});

	it("defaults to limit of 20", async () => {
		const { tasks } = await getTasks("assigned");
		expect(tasks).toHaveLength(20);
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

describe("getAllTasks", () => {
	it("returns all tasks across all statuses", async () => {
		const { getAllTasks } = await import("./task-mock-data");
		const { tasks } = await getAllTasks();
		expect(tasks.length).toBe(20);
	});

	it("paginates with cursor", async () => {
		const { getAllTasks } = await import("./task-mock-data");
		const page1 = await getAllTasks(undefined, 25);
		expect(page1.tasks).toHaveLength(25);
		expect(page1.nextCursor).toBe("25");

		const page2 = await getAllTasks(page1.nextCursor ?? undefined, 25);
		expect(page2.tasks).toHaveLength(25);
		expect(page2.nextCursor).toBe("50");

		const page3 = await getAllTasks(page2.nextCursor ?? undefined, 25);
		expect(page3.tasks).toHaveLength(25);
		expect(page3.nextCursor).toBe("75");

		const page4 = await getAllTasks(page3.nextCursor ?? undefined, 25);
		expect(page4.tasks).toHaveLength(25);
		expect(page4.nextCursor).toBeNull();
	});
});

describe("getProcurementItems", () => {
	it("returns unique sorted procurement item names", () => {
		const items = getProcurementItems();
		expect(items.length).toBeGreaterThan(0);
		// All unique
		expect(new Set(items).size).toBe(items.length);
		// Sorted in Russian locale
		for (let i = 1; i < items.length; i++) {
			expect(items[i - 1].localeCompare(items[i], "ru")).toBeLessThanOrEqual(0);
		}
	});
});

describe("getTasks with filter params", () => {
	it("filters by search query matching title", async () => {
		const { tasks } = await getTasks("assigned", undefined, 20, { q: "арматур" });
		expect(tasks.length).toBeGreaterThan(0);
		for (const task of tasks) {
			const matches =
				task.title.toLowerCase().includes("арматур") || task.procurementItemName.toLowerCase().includes("арматур");
			expect(matches).toBe(true);
		}
	});

	it("filters by search query matching procurement item name", async () => {
		const { tasks } = await getTasks("assigned", undefined, 20, { q: "пнд" });
		expect(tasks.length).toBeGreaterThan(0);
		for (const task of tasks) {
			const matches =
				task.title.toLowerCase().includes("пнд") || task.procurementItemName.toLowerCase().includes("пнд");
			expect(matches).toBe(true);
		}
	});

	it("filters by procurement item name (exact)", async () => {
		const { tasks } = await getTasks("assigned", undefined, 20, { item: "Арматура А500С" });
		expect(tasks.length).toBeGreaterThan(0);
		for (const task of tasks) {
			expect(task.procurementItemName).toBe("Арматура А500С");
		}
	});

	it("sorts by deadline ascending", async () => {
		const { tasks } = await getTasks("assigned", undefined, 20, { sort: "deadline", dir: "asc" });
		for (let i = 1; i < tasks.length; i++) {
			expect(new Date(tasks[i - 1].deadline).getTime()).toBeLessThanOrEqual(new Date(tasks[i].deadline).getTime());
		}
	});

	it("sorts by questionCount descending", async () => {
		const { tasks } = await getTasks("assigned", undefined, 20, { sort: "questionCount", dir: "desc" });
		for (let i = 1; i < tasks.length; i++) {
			expect(tasks[i - 1].questionCount).toBeGreaterThanOrEqual(tasks[i].questionCount);
		}
	});

	it("returns empty when search matches nothing", async () => {
		const { tasks } = await getTasks("assigned", undefined, 20, { q: "несуществующий_текст_xyz" });
		expect(tasks).toHaveLength(0);
	});
});

describe("getAllTasks with filter params", () => {
	it("applies search filter across all statuses", async () => {
		const { tasks } = await getAllTasks(undefined, 60, { q: "арматур" });
		expect(tasks.length).toBeGreaterThan(0);
		for (const task of tasks) {
			const matches =
				task.title.toLowerCase().includes("арматур") || task.procurementItemName.toLowerCase().includes("арматур");
			expect(matches).toBe(true);
		}
		// Should have tasks from multiple statuses
		const statuses = new Set(tasks.map((t) => t.status));
		expect(statuses.size).toBeGreaterThan(1);
	});

	it("applies sort across all statuses", async () => {
		const { tasks } = await getAllTasks(undefined, 60, { sort: "deadline", dir: "asc" });
		for (let i = 1; i < tasks.length; i++) {
			expect(new Date(tasks[i - 1].deadline).getTime()).toBeLessThanOrEqual(new Date(tasks[i].deadline).getTime());
		}
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
