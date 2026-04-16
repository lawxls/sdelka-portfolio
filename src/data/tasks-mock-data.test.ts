import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "./task-types";
import {
	_getAllTasks,
	_resetTasksStore,
	_setTasks,
	changeTaskStatusMock,
	deleteTaskAttachmentMock,
	fetchTaskBoardMock,
	fetchTaskMock,
	fetchTasksMock,
	uploadTaskAttachmentsMock,
} from "./tasks-mock-data";

function makeStoredTask(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		name: `Task ${id}`,
		status: "assigned",
		item: { id: "item-1", name: "Item", companyId: "company-1" },
		assignee: {
			id: "user-1",
			firstName: "Иван",
			lastName: "Иванов",
			email: "i@test.com",
			avatarIcon: "blue",
		},
		createdAt: "2026-03-01T10:00:00.000Z",
		deadlineAt: "2026-04-01T18:00:00.000Z",
		description: "desc",
		questionCount: 0,
		completedResponse: null,
		attachments: [],
		statusBeforeArchive: null,
		supplierQuestions: [],
		updatedAt: "2026-03-01T10:00:00.000Z",
		...overrides,
	};
}

beforeEach(() => {
	_resetTasksStore();
});

describe("fetchTaskBoardMock", () => {
	it("returns all four columns with seed data grouped by status", async () => {
		const result = await fetchTaskBoardMock();
		expect(result.assigned?.results.length).toBeGreaterThan(0);
		expect(result.in_progress?.results.length).toBeGreaterThan(0);
		expect(result.completed?.results.length).toBeGreaterThan(0);
		expect(result.archived?.results.length).toBeGreaterThan(0);
		for (const t of result.assigned?.results ?? []) expect(t.status).toBe("assigned");
		for (const t of result.completed?.results ?? []) expect(t.status).toBe("completed");
	});

	it("each column reports its own total count", async () => {
		_setTasks([
			makeStoredTask("a1", { status: "assigned" }),
			makeStoredTask("a2", { status: "assigned" }),
			makeStoredTask("ip1", { status: "in_progress" }),
		]);
		const result = await fetchTaskBoardMock();
		expect(result.assigned?.count).toBe(2);
		expect(result.in_progress?.count).toBe(1);
		expect(result.completed?.count).toBe(0);
	});

	it("filters by q across task name", async () => {
		_setTasks([
			makeStoredTask("t1", { status: "assigned", name: "Арматура А500С" }),
			makeStoredTask("t2", { status: "assigned", name: "Цемент М500" }),
		]);
		const result = await fetchTaskBoardMock({ q: "армат" });
		expect(result.assigned?.results).toHaveLength(1);
		expect(result.assigned?.results[0].id).toBe("t1");
	});

	it("filters by item id", async () => {
		_setTasks([
			makeStoredTask("t1", { status: "assigned", item: { id: "item-a", name: "A", companyId: "c1" } }),
			makeStoredTask("t2", { status: "assigned", item: { id: "item-b", name: "B", companyId: "c1" } }),
		]);
		const result = await fetchTaskBoardMock({ item: "item-a" });
		expect(result.assigned?.results).toHaveLength(1);
		expect(result.assigned?.results[0].id).toBe("t1");
	});

	it("filters by company id", async () => {
		_setTasks([
			makeStoredTask("t1", { status: "assigned", item: { id: "i1", name: "A", companyId: "c1" } }),
			makeStoredTask("t2", { status: "assigned", item: { id: "i2", name: "B", companyId: "c2" } }),
		]);
		const result = await fetchTaskBoardMock({ company: "c2" });
		expect(result.assigned?.results).toHaveLength(1);
		expect(result.assigned?.results[0].id).toBe("t2");
	});

	it("sorts assigned column by deadline_at asc", async () => {
		_setTasks([
			makeStoredTask("t1", { status: "assigned", deadlineAt: "2026-05-01T00:00:00.000Z" }),
			makeStoredTask("t2", { status: "assigned", deadlineAt: "2026-04-01T00:00:00.000Z" }),
			makeStoredTask("t3", { status: "assigned", deadlineAt: "2026-06-01T00:00:00.000Z" }),
		]);
		const result = await fetchTaskBoardMock({ sort: "deadline_at", dir: "asc" });
		expect(result.assigned?.results.map((t) => t.id)).toEqual(["t2", "t1", "t3"]);
	});

	it("supports per-column pagination with column + cursor", async () => {
		const many = Array.from({ length: 25 }, (_, i) =>
			makeStoredTask(`t${i + 1}`, {
				status: "assigned",
				deadlineAt: `2026-05-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
			}),
		);
		_setTasks(many);
		const first = await fetchTaskBoardMock({ column: "assigned", sort: "deadline_at", dir: "asc" });
		expect(first.results).toHaveLength(20);
		expect(first.next).toBe("t21");

		const second = await fetchTaskBoardMock({
			column: "assigned",
			cursor: first.next ?? undefined,
			sort: "deadline_at",
			dir: "asc",
		});
		expect(second.results).toHaveLength(5);
		expect(second.next).toBeNull();
	});
});

describe("fetchTasksMock (list)", () => {
	it("returns paginated list with count + next + previous", async () => {
		const many = Array.from({ length: 35 }, (_, i) => makeStoredTask(`t${i + 1}`, { status: "assigned" }));
		_setTasks(many);
		const page1 = await fetchTasksMock({ page: 1, page_size: 20 });
		expect(page1.results).toHaveLength(20);
		expect(page1.count).toBe(35);
		expect(page1.next).toBeTruthy();
		expect(page1.previous).toBeNull();

		const page2 = await fetchTasksMock({ page: 2, page_size: 20 });
		expect(page2.results).toHaveLength(15);
		expect(page2.next).toBeNull();
		expect(page2.previous).toBeTruthy();
	});

	it("filters by q", async () => {
		_setTasks([makeStoredTask("t1", { name: "Foo" }), makeStoredTask("t2", { name: "Bar" })]);
		const result = await fetchTasksMock({ q: "foo" });
		expect(result.results).toHaveLength(1);
		expect(result.results[0].id).toBe("t1");
	});
});

describe("fetchTaskMock (detail)", () => {
	it("returns a single task by id", async () => {
		_setTasks([makeStoredTask("only-1", { name: "Only" })]);
		const result = await fetchTaskMock("only-1");
		expect(result.id).toBe("only-1");
		expect(result.name).toBe("Only");
	});

	it("throws when task does not exist", async () => {
		_setTasks([]);
		await expect(fetchTaskMock("missing")).rejects.toThrow(/not found/);
	});
});

describe("changeTaskStatusMock", () => {
	it("updates status in the store", async () => {
		_setTasks([makeStoredTask("t1", { status: "assigned" })]);
		const result = await changeTaskStatusMock("t1", { status: "in_progress" });
		expect(result.status).toBe("in_progress");
		expect(_getAllTasks().find((t) => t.id === "t1")?.status).toBe("in_progress");
	});

	it("stores completedResponse when transitioning to completed", async () => {
		_setTasks([makeStoredTask("t1", { status: "assigned" })]);
		const result = await changeTaskStatusMock("t1", { status: "completed", completedResponse: "Done" });
		expect(result.completedResponse).toBe("Done");
		expect(_getAllTasks().find((t) => t.id === "t1")?.completedResponse).toBe("Done");
	});

	it("captures statusBeforeArchive when moving to archived", async () => {
		_setTasks([makeStoredTask("t1", { status: "in_progress" })]);
		await changeTaskStatusMock("t1", { status: "archived" });
		const stored = _getAllTasks().find((t) => t.id === "t1");
		expect(stored?.status).toBe("archived");
		expect(stored?.statusBeforeArchive).toBe("in_progress");
	});

	it("throws when task does not exist", async () => {
		_setTasks([]);
		await expect(changeTaskStatusMock("missing", { status: "assigned" })).rejects.toThrow(/not found/);
	});
});

describe("uploadTaskAttachmentsMock", () => {
	beforeEach(() => {
		const orig = URL.createObjectURL;
		vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
		return () => {
			vi.stubGlobal("URL", { ...URL, createObjectURL: orig });
		};
	});

	it("creates attachment records on the task with file metadata + blob URL", async () => {
		_setTasks([makeStoredTask("t1", { status: "assigned" })]);
		const file = new File(["hello"], "doc.pdf", { type: "application/pdf" });
		const attachments = await uploadTaskAttachmentsMock("t1", [file]);
		expect(attachments).toHaveLength(1);
		expect(attachments[0].fileName).toBe("doc.pdf");
		expect(attachments[0].contentType).toBe("application/pdf");
		expect(attachments[0].fileType).toBe("pdf");
		expect(attachments[0].fileUrl).toBe("blob:mock");

		const stored = _getAllTasks().find((t) => t.id === "t1");
		expect(stored?.attachments).toHaveLength(1);
		expect(stored?.attachments[0].fileName).toBe("doc.pdf");
	});

	it("appends multiple files without dropping existing attachments", async () => {
		_setTasks([makeStoredTask("t1", { status: "assigned" })]);
		await uploadTaskAttachmentsMock("t1", [new File(["a"], "a.txt")]);
		await uploadTaskAttachmentsMock("t1", [new File(["b"], "b.txt"), new File(["c"], "c.txt")]);
		const stored = _getAllTasks().find((t) => t.id === "t1");
		expect(stored?.attachments).toHaveLength(3);
		expect(stored?.attachments.map((a) => a.fileName)).toEqual(["a.txt", "b.txt", "c.txt"]);
	});

	it("falls back to octet-stream when file type is empty", async () => {
		_setTasks([makeStoredTask("t1", { status: "assigned" })]);
		const file = new File(["x"], "noext", { type: "" });
		const [attachment] = await uploadTaskAttachmentsMock("t1", [file]);
		expect(attachment.contentType).toBe("application/octet-stream");
		expect(attachment.fileType).toBe("");
	});
});

describe("deleteTaskAttachmentMock", () => {
	it("removes the attachment from the task", async () => {
		_setTasks([
			makeStoredTask("t1", {
				attachments: [
					{
						id: "att-1",
						fileName: "a.pdf",
						fileSize: 10,
						fileType: "pdf",
						contentType: "application/pdf",
						fileUrl: "/f/a",
						uploadedAt: "2026-03-01T10:00:00.000Z",
					},
					{
						id: "att-2",
						fileName: "b.pdf",
						fileSize: 20,
						fileType: "pdf",
						contentType: "application/pdf",
						fileUrl: "/f/b",
						uploadedAt: "2026-03-01T10:00:00.000Z",
					},
				],
			}),
		]);
		await deleteTaskAttachmentMock("t1", "att-1");
		const stored = _getAllTasks().find((t) => t.id === "t1");
		expect(stored?.attachments).toHaveLength(1);
		expect(stored?.attachments[0].id).toBe("att-2");
	});

	it("no-ops when attachment does not exist", async () => {
		_setTasks([makeStoredTask("t1")]);
		await deleteTaskAttachmentMock("t1", "missing");
		const stored = _getAllTasks().find((t) => t.id === "t1");
		expect(stored?.attachments).toHaveLength(0);
	});
});

describe("seed coherence", () => {
	it("references real item ids from items seed", async () => {
		_resetTasksStore();
		const all = _getAllTasks();
		const itemIds = new Set(all.map((t) => t.item.id));
		expect(itemIds.has("item-1")).toBe(true);
		expect(itemIds.has("item-2")).toBe(true);
	});

	it("distributes seed tasks across all four statuses", async () => {
		_resetTasksStore();
		const result = await fetchTaskBoardMock();
		expect((result.assigned?.count ?? 0) > 0).toBe(true);
		expect((result.in_progress?.count ?? 0) > 0).toBe(true);
		expect((result.completed?.count ?? 0) > 0).toBe(true);
		expect((result.archived?.count ?? 0) > 0).toBe(true);
	});
});
