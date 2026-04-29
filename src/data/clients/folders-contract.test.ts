import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Folder } from "../domains/folders";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetItemsStore } from "../items-mock-data";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { FoldersClient } from "./folders-client";
import { createHttpFoldersClient } from "./folders-http";
import { createInMemoryFoldersClient } from "./folders-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Folders' list shape is `Folder[]` and stats is `FolderStatsResponse` —
 * neither uses `CursorPage<T>`, which is fine: the seam doesn't force a
 * single envelope onto domains where the underlying paging model differs.
 */

const SEED: Folder[] = [
	{ id: "f1", name: "Металлопрокат", color: "blue" },
	{ id: "f2", name: "Стройматериалы", color: "green" },
];

interface Adapter {
	name: string;
	build: () => FoldersClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryFoldersClient({ seed: SEED.map((f) => ({ ...f })) }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	const store = new Map<string, Folder>(SEED.map((f) => [f.id, { ...f }]));
	let counter = 0;

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/api\/folders$/,
			respond: () => ({ status: 200, body: Array.from(store.values()) }),
		},
		{
			method: "GET",
			path: /^\/api\/folders\/stats(\?|$)/,
			respond: () => ({ status: 200, body: { stats: [], archiveCount: 0 } }),
		},
		{
			method: "POST",
			path: /^\/api\/folders$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { name: string; color: string };
				if (!data.name) return { status: 400, body: { fieldErrors: { name: ["required"] } } };
				if (data.name === "__conflict__") return { status: 409, body: { detail: "name taken" } };
				counter += 1;
				const folder: Folder = { id: `new-${counter}`, name: data.name, color: data.color };
				store.set(folder.id, folder);
				return { status: 201, body: folder };
			},
		},
		{
			method: "PATCH",
			path: /^\/api\/folders\/([^/]+)$/,
			respond: ({ url, init }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").pop() ?? "");
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				const data = JSON.parse(init?.body as string) as { name?: string; color?: string };
				if (data.name === "") return { status: 400, body: { fieldErrors: { name: ["required"] } } };
				const updated = { ...existing, ...data };
				store.set(id, updated);
				return { status: 200, body: updated };
			},
		},
		{
			method: "DELETE",
			path: /^\/api\/folders\/([^/]+)$/,
			respond: ({ url }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").pop() ?? "");
				if (!store.has(id)) return { status: 404 };
				store.delete(id);
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
		build: () => createHttpFoldersClient(http),
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(adapters.map((make) => [make().name, make]))("FoldersClient contract — %s adapter", (_label, make) => {
	let client: FoldersClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		// In-memory adapter pulls stats from the items mock — keep it empty so
		// stats is `{ stats: [], archiveCount: 0 }` for parity with the HTTP stub.
		_resetItemsStore();
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("list returns the seeded folders", async () => {
		const folders = await client.list();
		expect(folders.map((f) => f.id).sort()).toEqual(["f1", "f2"]);
	});

	it("stats returns FolderStatsResponse shape", async () => {
		const stats = await client.stats();
		expect(stats).toEqual({ stats: [], archiveCount: 0 });
	});

	it("create + list roundtrip", async () => {
		const created = await client.create({ name: "Новый", color: "red" });
		expect(created.name).toBe("Новый");
		expect(created.color).toBe("red");
		expect(created.id).toBeTruthy();
		const folders = await client.list();
		expect(folders.find((f) => f.id === created.id)?.name).toBe("Новый");
	});

	it("update patches name", async () => {
		const updated = await client.update("f1", { name: "Renamed" });
		expect(updated.name).toBe("Renamed");
		const folders = await client.list();
		expect(folders.find((f) => f.id === "f1")?.name).toBe("Renamed");
	});

	it("update patches color", async () => {
		await client.update("f1", { color: "purple" });
		const folders = await client.list();
		expect(folders.find((f) => f.id === "f1")?.color).toBe("purple");
	});

	it("update throws NotFoundError when missing", async () => {
		await expect(client.update("missing", { name: "x" })).rejects.toBeInstanceOf(NotFoundError);
	});

	it("delete removes the folder", async () => {
		await client.delete("f1");
		const folders = await client.list();
		expect(folders.map((f) => f.id)).toEqual(["f2"]);
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface validation /
 * conflict errors so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	it("create with empty name throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter().build();
		try {
			await client.create({ name: "", color: "red" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ name: ["required"] });
		}
	});

	it("create with conflicting name throws ConflictError", async () => {
		const client = httpAdapter().build();
		await expect(client.create({ name: "__conflict__", color: "red" })).rejects.toBeInstanceOf(ConflictError);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpFoldersClient(http);
		await expect(client.list()).rejects.toMatchObject({ name: "NetworkError" });
	});
});
