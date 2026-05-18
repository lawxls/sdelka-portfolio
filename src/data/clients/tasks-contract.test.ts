import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../domains/tasks";
import { ConflictError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { TasksClient } from "./tasks-client";
import { createHttpTasksClient } from "./tasks-http";
import { createInMemoryTasksClient } from "./tasks-in-memory";
import type { TaskWire } from "./tasks-wire";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * The HTTP stub returns the real DRF wire shape — `{ next, previous, results,
 * count }` for paginated GETs, the wire-level `inquiry` field name for the
 * parent inquiry, and the bucket-status filter (`active|completed|archived`).
 */

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		name: `Task ${id}`,
		status: "assigned",
		procurementInquiry: { id: "T-001", name: "ProcurementInquiry", companyId: "company-1" },
		assignee: {
			id: "user-1",
			firstName: "Иван",
			lastName: "Иванов",
			email: "ivan@test.com",
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

function toWire(task: Task): TaskWire {
	return {
		id: task.id,
		name: task.name,
		status: task.status,
		inquiry: task.procurementInquiry,
		assignee: task.assignee,
		createdAt: task.createdAt,
		deadlineAt: task.deadlineAt,
		description: task.description,
		questionCount: task.questionCount,
		completedResponse: task.completedResponse,
		attachments: task.attachments,
		statusBeforeArchive: task.statusBeforeArchive,
		supplierQuestions: task.supplierQuestions,
		updatedAt: task.updatedAt,
	};
}

const SEED: Task[] = [
	makeTask("t1", { status: "assigned", name: "Согласовать цену" }),
	makeTask("t2", { status: "in_progress", name: "Запросить КП" }),
	makeTask("t3", { status: "completed", name: "Подписать договор", completedResponse: "Done" }),
	makeTask("t4", { status: "archived", name: "Закрыть переговоры" }),
];

interface Adapter {
	name: string;
	build: () => TasksClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryTasksClient({ seed: SEED.map((t) => structuredClone(t)) }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

const BUCKET_TO_STATUSES: Record<string, Set<string>> = {
	active: new Set(["assigned", "in_progress"]),
	completed: new Set(["completed"]),
	archived: new Set(["archived"]),
};

function bucketFilter(tasks: Task[], statusParam: string | null): Task[] {
	if (!statusParam) return tasks;
	const buckets = statusParam.split(",");
	const allowed = new Set<string>();
	for (const b of buckets) {
		const set = BUCKET_TO_STATUSES[b];
		if (set) for (const s of set) allowed.add(s);
	}
	return tasks.filter((t) => allowed.has(t.status));
}

function httpAdapter(): Adapter {
	const store = new Map<string, Task>(SEED.map((t) => [t.id, structuredClone(t)]));

	function applyFilters(params: URLSearchParams): Task[] {
		const q = params.get("q")?.toLowerCase();
		const procurementInquiry = params.get("procurementInquiry");
		const company = params.get("company");
		const status = params.get("status");
		let items = Array.from(store.values());
		if (q) items = items.filter((t) => t.name.toLowerCase().includes(q));
		if (procurementInquiry) items = items.filter((t) => t.procurementInquiry.id === procurementInquiry);
		if (company) items = items.filter((t) => t.procurementInquiry.companyId === company);
		items = bucketFilter(items, status);
		return items;
	}

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/tasks\/([^/]+)\/$/,
			respond: ({ url }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
				const task = store.get(id);
				if (!task) return { status: 404 };
				return { status: 200, body: toWire(task) };
			},
		},
		{
			method: "GET",
			path: /^\/tasks\/(\?|$)/,
			respond: ({ url }) => {
				const u = new URL(url, "http://test");
				const filtered = applyFilters(u.searchParams);
				return {
					status: 200,
					body: {
						next: null,
						previous: null,
						count: filtered.length,
						results: filtered.map(toWire),
					},
				};
			},
		},
		{
			method: "POST",
			path: /^\/tasks\/([^/]+)\/change_status\/$/,
			respond: ({ url, init }) => {
				const path = new URL(url, "http://test").pathname;
				const match = path.match(/^\/tasks\/([^/]+)\/change_status\/$/);
				const id = decodeURIComponent(match?.[1] ?? "");
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				const data = JSON.parse(init?.body as string) as {
					status?: Task["status"];
					completedResponse?: string;
				};
				if (data.completedResponse === "__conflict__") return { status: 409, body: { detail: "task locked" } };
				if (data.status === ("invalid" as Task["status"])) {
					return { status: 400, body: { fieldErrors: { status: ["invalid"] } } };
				}
				// Empty body → unarchive (restore statusBeforeArchive).
				const isUnarchive = data.status === undefined && existing.status === "archived";
				const nextStatus = isUnarchive
					? (existing.statusBeforeArchive ?? "assigned")
					: (data.status ?? existing.status);
				if (data.status === undefined && existing.status !== "archived") {
					return { status: 400, body: { fieldErrors: { status: ["required when the task is not archived"] } } };
				}
				const updated: Task = {
					...existing,
					status: nextStatus,
					completedResponse: data.completedResponse ?? existing.completedResponse,
					statusBeforeArchive:
						nextStatus === "archived" && existing.status !== "archived"
							? existing.status
							: nextStatus !== "archived"
								? null
								: existing.statusBeforeArchive,
				};
				store.set(id, updated);
				return { status: 200, body: toWire(updated) };
			},
		},
	];

	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		const url = input;
		const method = init?.method ?? "GET";
		const path = new URL(url, "http://test").pathname + new URL(url, "http://test").search;
		const route = routes.find((r) => r.method === method && r.path.test(path));
		if (!route) throw new Error(`Unmatched ${method} ${url}`);
		const result = await route.respond({ url, init });
		const hasBody = result.body !== undefined && result.status !== 204;
		return new Response(hasBody ? JSON.stringify(result.body) : null, {
			status: result.status,
			headers: hasBody ? { "content-type": "application/json" } : undefined,
		});
	});

	const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => "test-token" });

	return {
		name: "http",
		build: () => createHttpTasksClient(http),
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(adapters.map((make) => [make().name, make]))("TasksClient contract — %s adapter", (_label, make) => {
	let client: TasksClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("listAll returns every task", async () => {
		const all = await client.listAll();
		expect(all.map((t) => t.id).sort()).toEqual(["t1", "t2", "t3", "t4"]);
	});

	it("board groups results into three bucket columns — active (assigned + in_progress) | completed | archived", async () => {
		const board = await client.board();
		expect(board.active?.results.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
		expect(board.completed?.results.map((t) => t.id)).toEqual(["t3"]);
		expect(board.archived?.results.map((t) => t.id)).toEqual(["t4"]);
	});

	it("board filters by q across task name", async () => {
		const board = await client.board({ q: "цен" });
		expect(board.active?.results.map((t) => t.id)).toEqual(["t1"]);
		expect(board.completed?.results ?? []).toHaveLength(0);
	});

	it("board with column param returns a single-column page", async () => {
		const page = await client.board({ column: "active" });
		expect(page.results?.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
		expect(page.active).toBeUndefined();
	});

	it("list narrows by status set (translated to bucket)", async () => {
		const page = await client.list({ statuses: ["completed"] });
		expect(page.results.map((t) => t.id)).toEqual(["t3"]);
	});

	it("get returns the task", async () => {
		const task = await client.get("t1");
		expect(task.name).toBe("Согласовать цену");
		expect(task.procurementInquiry.id).toBe("T-001");
	});

	it("changeStatus moves the task between statuses", async () => {
		const updated = await client.changeStatus("t1", { status: "in_progress" });
		expect(updated.status).toBe("in_progress");
		const fetched = await client.get("t1");
		expect(fetched.status).toBe("in_progress");
	});

	it("changeStatus to archived captures statusBeforeArchive", async () => {
		await client.changeStatus("t2", { status: "archived" });
		const fetched = await client.get("t2");
		expect(fetched.status).toBe("archived");
		expect(fetched.statusBeforeArchive).toBe("in_progress");
	});

	it("changeStatus with empty body unarchives — restores statusBeforeArchive", async () => {
		await client.changeStatus("t2", { status: "archived" });
		const restored = await client.changeStatus("t2", {});
		expect(restored.status).toBe("in_progress");
	});

	it("changeStatus to completed stores completedResponse", async () => {
		const updated = await client.changeStatus("t1", { status: "completed", completedResponse: "Готово" });
		expect(updated.status).toBe("completed");
		expect(updated.completedResponse).toBe("Готово");
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface validation /
 * conflict errors so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	it("changeStatus with conflict body throws ConflictError", async () => {
		const harness = httpAdapter();
		const client = harness.build();
		await expect(
			client.changeStatus("t1", { status: "completed", completedResponse: "__conflict__" }),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it("changeStatus with invalid status throws ValidationError with fieldErrors", async () => {
		const harness = httpAdapter();
		const client = harness.build();
		try {
			await client.changeStatus("t1", { status: "invalid" as Task["status"] });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ status: ["invalid"] });
		}
	});

	it("changeStatus with empty body on non-archived task throws ValidationError", async () => {
		const harness = httpAdapter();
		const client = harness.build();
		try {
			await client.changeStatus("t1", {});
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
		}
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpTasksClient(http);
		await expect(client.listAll()).rejects.toMatchObject({ name: "NetworkError" });
	});
});
