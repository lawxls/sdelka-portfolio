import { describe, expect, it, vi } from "vitest";
import type { Task } from "../task-types";
import { composeTaskBoard, type ListLikeResponse } from "./tasks-board";

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		name: `Task ${id}`,
		status: "assigned",
		procurementInquiry: { id: "T-001", name: "Запрос", companyId: "c-1" },
		assignee: null,
		createdAt: "2026-03-01T10:00:00Z",
		deadlineAt: "2026-04-01T18:00:00Z",
		description: "",
		questionCount: 0,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [],
		updatedAt: "2026-03-01T10:00:00Z",
		...overrides,
	};
}

function page(tasks: Task[], next: string | null = null): ListLikeResponse {
	return { results: tasks, count: tasks.length, next };
}

describe("composeTaskBoard", () => {
	it("fires three parallel list calls, one per bucket", async () => {
		const calls: string[] = [];
		const list = vi.fn(async (params: { status?: string }) => {
			calls.push(params.status ?? "<none>");
			return page([]);
		});
		await composeTaskBoard(list, {});
		expect(list).toHaveBeenCalledTimes(3);
		expect(calls.sort()).toEqual(["active", "archived", "completed"]);
	});

	it("places each bucket's results under the matching key", async () => {
		const list = vi.fn(async ({ status }: { status?: string }) => {
			if (status === "active") return page([makeTask("a", { status: "assigned" })]);
			if (status === "completed") return page([makeTask("c", { status: "completed" })]);
			if (status === "archived") return page([makeTask("x", { status: "archived" })]);
			return page([]);
		});
		const board = await composeTaskBoard(list, {});
		expect(board.active?.results.map((t) => t.id)).toEqual(["a"]);
		expect(board.completed?.results.map((t) => t.id)).toEqual(["c"]);
		expect(board.archived?.results.map((t) => t.id)).toEqual(["x"]);
	});

	it("propagates shared filters (q, company, procurementInquiry) to every call", async () => {
		const list = vi.fn(async (_params: object) => page([]));
		await composeTaskBoard(list, { q: "кабель", company: "c-1", procurementInquiry: "T-001" });
		for (const call of list.mock.calls) {
			expect(call[0]).toMatchObject({ q: "кабель", company: "c-1", procurementInquiry: "T-001" });
		}
	});

	it("returns per-column count + next", async () => {
		const list = vi.fn(async ({ status }: { status?: string }) => {
			if (status === "active") return page([makeTask("a"), makeTask("b")], "cursor-a");
			return page([], null);
		});
		const board = await composeTaskBoard(list, {});
		expect(board.active).toEqual({
			results: [makeTask("a"), makeTask("b")],
			count: 2,
			next: "cursor-a",
		});
		expect(board.completed?.next).toBeNull();
	});

	it("with column=active + cursor returns a single-column page", async () => {
		const list = vi.fn(async (params: { status?: string; cursor?: string }) => {
			expect(params.status).toBe("active");
			expect(params.cursor).toBe("c-7");
			return page([makeTask("p1"), makeTask("p2")], "c-8");
		});
		const board = await composeTaskBoard(list, { column: "active", cursor: "c-7" });
		expect(list).toHaveBeenCalledTimes(1);
		expect(board.results?.map((t) => t.id)).toEqual(["p1", "p2"]);
		expect(board.next).toBe("c-8");
		expect(board.active).toBeUndefined();
	});
});
