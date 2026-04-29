import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../domains/tasks";
import { ConflictError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { TasksClient } from "./tasks-client";
import { createHttpTasksClient } from "./tasks-http";
import { createInMemoryTasksClient } from "./tasks-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 */

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		name: `Task ${id}`,
		status: "assigned",
		item: { id: "item-1", name: "Item", companyId: "company-1" },
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

function httpAdapter(): Adapter {
	const store = new Map<string, Task>(SEED.map((t) => [t.id, structuredClone(t)]));

	function applyFilters(params: URLSearchParams): Task[] {
		const q = params.get("q")?.toLowerCase();
		const item = params.get("item");
		const company = params.get("company");
		const statuses = params.getAll("statuses");
		return Array.from(store.values()).filter((t) => {
			if (q && !t.name.toLowerCase().includes(q)) return false;
			if (item && t.item.id !== item) return false;
			if (company && t.item.companyId !== company) return false;
			if (statuses.length > 0 && !statuses.includes(t.status)) return false;
			return true;
		});
	}

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/api\/tasks\/all$/,
			respond: () => ({ status: 200, body: Array.from(store.values()) }),
		},
		{
			method: "GET",
			path: /^\/api\/tasks\/board(\?|$)/,
			respond: ({ url }) => {
				const u = new URL(url, "http://test");
				const filtered = applyFilters(u.searchParams);
				const column = u.searchParams.get("column");
				if (column) {
					const colTasks = filtered.filter((t) => t.status === column);
					return { status: 200, body: { results: colTasks, next: null } };
				}
				const byStatus = (s: string) => {
					const list = filtered.filter((t) => t.status === s);
					return { results: list, next: null, count: list.length };
				};
				return {
					status: 200,
					body: {
						assigned: byStatus("assigned"),
						in_progress: byStatus("in_progress"),
						completed: byStatus("completed"),
						archived: byStatus("archived"),
					},
				};
			},
		},
		{
			method: "GET",
			path: /^\/api\/tasks(\?|$)/,
			respond: ({ url }) => {
				const u = new URL(url, "http://test");
				const filtered = applyFilters(u.searchParams);
				const pageSize = Number.parseInt(u.searchParams.get("page_size") ?? "20", 10);
				const page = Number.parseInt(u.searchParams.get("page") ?? "1", 10);
				const start = (page - 1) * pageSize;
				const end = start + pageSize;
				const slice = filtered.slice(start, end);
				return {
					status: 200,
					body: {
						count: filtered.length,
						results: slice,
						next: end < filtered.length ? `page=${page + 1}` : null,
						previous: page > 1 ? `page=${page - 1}` : null,
					},
				};
			},
		},
		{
			method: "GET",
			path: /^\/api\/tasks\/([^/]+)$/,
			respond: ({ url }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").pop() ?? "");
				const task = store.get(id);
				if (!task) return { status: 404 };
				return { status: 200, body: task };
			},
		},
		{
			method: "POST",
			path: /^\/api\/tasks\/([^/]+)\/status$/,
			respond: ({ url, init }) => {
				const path = new URL(url, "http://test").pathname;
				const match = path.match(/^\/api\/tasks\/([^/]+)\/status$/);
				const id = decodeURIComponent(match?.[1] ?? "");
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				const data = JSON.parse(init?.body as string) as {
					status: Task["status"];
					completedResponse?: string;
				};
				if (data.completedResponse === "__conflict__") return { status: 409, body: { detail: "task locked" } };
				if (data.status === ("invalid" as Task["status"])) {
					return { status: 400, body: { fieldErrors: { status: ["invalid"] } } };
				}
				const updated: Task = {
					...existing,
					status: data.status,
					completedResponse: data.completedResponse ?? existing.completedResponse,
					statusBeforeArchive:
						data.status === "archived" && existing.status !== "archived"
							? existing.status
							: existing.statusBeforeArchive,
				};
				store.set(id, updated);
				return { status: 200, body: updated };
			},
		},
		{
			method: "DELETE",
			path: /^\/api\/tasks\/([^/]+)\/attachments\/([^/]+)$/,
			respond: ({ url }) => {
				const path = new URL(url, "http://test").pathname;
				const match = path.match(/^\/api\/tasks\/([^/]+)\/attachments\/([^/]+)$/);
				const id = decodeURIComponent(match?.[1] ?? "");
				const attId = decodeURIComponent(match?.[2] ?? "");
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				store.set(id, { ...existing, attachments: existing.attachments.filter((a) => a.id !== attId) });
				return { status: 204 };
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
		// `make().build()` constructs an adapter; the in-memory factory reseeds the
		// singleton via the `seed` option, so we don't reach into `_setTasks`.
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

	it("board groups results into four status-keyed columns", async () => {
		const board = await client.board();
		expect(board.assigned?.results.map((t) => t.id)).toEqual(["t1"]);
		expect(board.in_progress?.results.map((t) => t.id)).toEqual(["t2"]);
		expect(board.completed?.results.map((t) => t.id)).toEqual(["t3"]);
		expect(board.archived?.results.map((t) => t.id)).toEqual(["t4"]);
	});

	it("board filters by q across task name", async () => {
		const board = await client.board({ q: "цен" });
		expect(board.assigned?.results.map((t) => t.id)).toEqual(["t1"]);
		expect(board.in_progress?.results ?? []).toHaveLength(0);
	});

	it("board with column param returns a single-column page", async () => {
		const page = await client.board({ column: "assigned" });
		expect(page.results?.map((t) => t.id)).toEqual(["t1"]);
		expect(page.assigned).toBeUndefined();
	});

	it("list returns paginated results with count + next + previous", async () => {
		const page1 = await client.list({ page: 1, page_size: 2 });
		expect(page1.results).toHaveLength(2);
		expect(page1.count).toBe(4);
		expect(page1.next).toBeTruthy();
		expect(page1.previous).toBeNull();

		const page2 = await client.list({ page: 2, page_size: 2 });
		expect(page2.results).toHaveLength(2);
		expect(page2.next).toBeNull();
		expect(page2.previous).toBeTruthy();
	});

	it("list narrows by status set", async () => {
		const page = await client.list({ statuses: ["completed"] });
		expect(page.results.map((t) => t.id)).toEqual(["t3"]);
	});

	it("get returns the task", async () => {
		const task = await client.get("t1");
		expect(task.name).toBe("Согласовать цену");
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

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpTasksClient(http);
		await expect(client.listAll()).rejects.toMatchObject({ name: "NetworkError" });
	});
});
