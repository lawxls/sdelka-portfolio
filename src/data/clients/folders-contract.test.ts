import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Folder } from "../domains/folders";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { FoldersClient } from "./folders-client";
import { createHttpFoldersClient } from "./folders-http";

/**
 * Adapter contract test for the folders HTTP client. Stubs `fetch` and asserts
 * the wire surface matches the backend (PR #80): cursor-paginated list, stats
 * endpoint shape, CRUD round-trip, and standard error mapping.
 */

const SEED: Folder[] = [
	{ id: "f1", name: "Металлопрокат", color: "blue" },
	{ id: "f2", name: "Стройматериалы", color: "green" },
];

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

interface HttpAdapterTrack {
	requests: Array<{ method: string; path: string; body?: unknown }>;
}

function httpAdapter(): { build: () => FoldersClient; track: HttpAdapterTrack } {
	const store = new Map<string, Folder>(SEED.map((f) => [f.id, { ...f }]));
	const track: HttpAdapterTrack = { requests: [] };
	let counter = 0;

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/folders\/(\?|$)/,
			respond: () => ({
				// Real DRF cursor envelope: `next`/`previous` are opaque URLs, `results`
				// is the page of folders. `pageSize=200` is large enough that the FE
				// only ever sees one page in practice.
				status: 200,
				body: { next: null, previous: null, results: Array.from(store.values()) },
			}),
		},
		{
			method: "GET",
			path: /^\/folders\/stats\/(\?|$)/,
			respond: () => ({ status: 200, body: { stats: [], archiveCount: 0 } }),
		},
		{
			method: "POST",
			path: /^\/folders\/$/,
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
			path: /^\/folders\/([^/]+)\/$/,
			respond: ({ url, init }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
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
			path: /^\/folders\/([^/]+)\/$/,
			respond: ({ url }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
				if (!store.has(id)) return { status: 404 };
				store.delete(id);
				return { status: 204 };
			},
		},
	];

	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		const url = input;
		const method = init?.method ?? "GET";
		const fullPath = new URL(url, "http://test").pathname + new URL(url, "http://test").search;
		track.requests.push({
			method,
			path: fullPath,
			body: init?.body ? JSON.parse(init.body as string) : undefined,
		});
		const route = routes.find((r) => r.method === method && r.path.test(fullPath));
		if (!route) throw new Error(`Unmatched ${method} ${url}`);
		const result = await route.respond({ url, init });
		const hasBody = result.body !== undefined && result.status !== 204;
		return new Response(hasBody ? JSON.stringify(result.body) : null, {
			status: result.status,
			headers: hasBody ? { "content-type": "application/json" } : undefined,
		});
	});

	const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => "test-token" });
	return { build: () => createHttpFoldersClient(http), track };
}

describe("FoldersClient HTTP contract", () => {
	let adapter: ReturnType<typeof httpAdapter>;
	let client: FoldersClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		adapter = httpAdapter();
		client = adapter.build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("list flattens the DRF cursor envelope into Folder[]", async () => {
		const folders = await client.list();
		expect(folders.map((f) => f.id).sort()).toEqual(["f1", "f2"]);
	});

	it("list requests pageSize=200 (single-page fetch)", async () => {
		await client.list();
		const last = adapter.track.requests[adapter.track.requests.length - 1];
		expect(last.method).toBe("GET");
		expect(last.path).toContain("pageSize=200");
	});

	it("stats hits /folders/stats/ and returns FolderStatsResponse shape", async () => {
		const stats = await client.stats();
		expect(stats).toEqual({ stats: [], archiveCount: 0 });
		expect(adapter.track.requests[0].path).toMatch(/^\/folders\/stats\//);
	});

	it("stats threads `company` filter through the query string", async () => {
		await client.stats({ company: "c1" });
		expect(adapter.track.requests[0].path).toContain("company=c1");
	});

	it("create round-trips and appears in list", async () => {
		const created = await client.create({ name: "Новый", color: "red" });
		expect(created.name).toBe("Новый");
		expect(created.color).toBe("red");
		expect(created.id).toBeTruthy();
		const folders = await client.list();
		expect(folders.find((f) => f.id === created.id)?.name).toBe("Новый");
	});

	it("update patches name (PATCH /folders/{id}/)", async () => {
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

	it("delete removes the folder (DELETE /folders/{id}/)", async () => {
		await client.delete("f1");
		const folders = await client.list();
		expect(folders.map((f) => f.id)).toEqual(["f2"]);
	});

	it("create with empty name throws ValidationError with fieldErrors", async () => {
		try {
			await client.create({ name: "", color: "red" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ name: ["required"] });
		}
	});

	it("create with conflicting name throws ConflictError", async () => {
		await expect(client.create({ name: "__conflict__", color: "red" })).rejects.toBeInstanceOf(ConflictError);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const offline = createHttpFoldersClient(http);
		await expect(offline.list()).rejects.toMatchObject({ name: "NetworkError" });
	});
});
