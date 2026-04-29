import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcurementItem } from "../domains/items";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetIdCounter, _setMockDelay } from "../mock-utils";
import type { ItemsClient } from "./items-client";
import { createHttpItemsClient } from "./items-http";
import { createInMemoryItemsClient } from "./items-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 */

function makeItem(id: string, overrides: Partial<ProcurementItem> = {}): ProcurementItem {
	return {
		id,
		name: `Item ${id}`,
		status: "searching",
		annualQuantity: 100,
		currentPrice: 50,
		bestPrice: 40,
		averagePrice: 45,
		folderId: null,
		companyId: "c1",
		...overrides,
	};
}

interface Adapter {
	name: string;
	build: () => ItemsClient;
}

function memoryAdapter(seed: ProcurementItem[]): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryItemsClient({ seed }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: {
		url: string;
		init?: RequestInit;
	}) => { status: number; body?: unknown } | Promise<{ status: number; body?: unknown }>;
}

function httpAdapter(seed: ProcurementItem[]): Adapter {
	const store = new Map<string, ProcurementItem>(seed.map((i) => [i.id, structuredClone(i)]));
	const archived = new Set<string>();
	let counter = 0;

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/api\/items\/all$/,
			respond: () => ({
				status: 200,
				body: Array.from(store.values()).filter((i) => !archived.has(i.id)),
			}),
		},
		{
			method: "GET",
			path: /^\/api\/items\/totals(\?|$)/,
			respond: () => ({
				status: 200,
				body: { itemCount: store.size, totalOverpayment: 0, totalSavings: 0, totalDeviation: 0 },
			}),
		},
		{
			method: "GET",
			path: /^\/api\/items(\?|$)/,
			respond: ({ url }) => {
				const u = new URL(url, "http://test");
				const q = u.searchParams.get("q")?.toLowerCase();
				const folder = u.searchParams.get("folder") ?? undefined;
				let items = Array.from(store.values());
				if (folder === "archive") items = items.filter((i) => archived.has(i.id));
				else items = items.filter((i) => !archived.has(i.id));
				if (q) items = items.filter((i) => i.name.toLowerCase().includes(q));
				return { status: 200, body: { items, nextCursor: null } };
			},
		},
		{
			method: "GET",
			path: /^\/api\/items\/([^/]+)$/,
			respond: ({ url }) => {
				const id = idFromPath(url, /^\/api\/items\/([^/]+)$/);
				const item = store.get(id);
				if (!item) return { status: 404 };
				return { status: 200, body: item };
			},
		},
		{
			method: "POST",
			path: /^\/api\/items$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { items: { name: string }[] };
				const created = data.items.map((input) => {
					if (!input.name) throw new Error("__invalid__");
					counter += 1;
					return makeItem(`new-${counter}`, { name: input.name });
				});
				for (const item of created) store.set(item.id, item);
				return { status: 201, body: { items: created, isAsync: false } };
			},
		},
		{
			method: "PATCH",
			path: /^\/api\/items\/([^/]+)$/,
			respond: ({ url, init }) => {
				const id = idFromPath(url, /^\/api\/items\/([^/]+)$/);
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				const data = JSON.parse(init?.body as string);
				if (data.name === "__conflict__") return { status: 409, body: { detail: "name taken" } };
				if (data.name === "") return { status: 400, body: { fieldErrors: { name: ["required"] } } };
				const updated = { ...existing, ...data };
				store.set(id, updated);
				return { status: 200, body: updated };
			},
		},
		{
			method: "DELETE",
			path: /^\/api\/items\/([^/]+)$/,
			respond: ({ url }) => {
				const id = idFromPath(url, /^\/api\/items\/([^/]+)$/);
				store.delete(id);
				archived.delete(id);
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: /^\/api\/items\/([^/]+)\/(archive|unarchive)$/,
			respond: ({ url }) => {
				const path = new URL(url, "http://test").pathname;
				const match = path.match(/^\/api\/items\/([^/]+)\/(archive|unarchive)$/);
				if (!match) return { status: 400 };
				const id = decodeURIComponent(match[1]);
				const action = match[2];
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				if (action === "archive") archived.add(id);
				else archived.delete(id);
				return { status: 200, body: existing };
			},
		},
	];

	const exportRoute = /^\/api\/items\/export(\?|$)/;

	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		const url = input;
		const method = init?.method ?? "GET";
		const path = new URL(url, "http://test").pathname + new URL(url, "http://test").search;
		if (method === "GET" && exportRoute.test(path)) {
			return new Response("xlsx-bytes", {
				status: 200,
				headers: {
					"content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"content-disposition": 'attachment; filename="items.xlsx"',
				},
			});
		}
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
		build: () => createHttpItemsClient(http),
	};
}

function idFromPath(url: string, pattern: RegExp): string {
	const path = new URL(url, "http://test").pathname;
	const match = path.match(pattern);
	if (!match) throw new Error(`No id match in ${path}`);
	return decodeURIComponent(match[1]);
}

const SEED: ProcurementItem[] = [
	makeItem("a", { name: "Альфа" }),
	makeItem("b", { name: "Бета" }),
	makeItem("c", { name: "Гамма" }),
];

const adapters: Array<() => Adapter> = [() => memoryAdapter(SEED), () => httpAdapter(SEED)];

describe.each(adapters.map((make) => [make().name, make]))("ItemsClient contract — %s adapter", (_label, make) => {
	let client: ItemsClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		_resetIdCounter();
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("list returns CursorPage with items", async () => {
		const page = await client.list({});
		expect(page.items).toHaveLength(3);
		expect(page.nextCursor).toBeNull();
	});

	it("list filters by q", async () => {
		const page = await client.list({ q: "альф" });
		expect(page.items.map((i) => i.name)).toEqual(["Альфа"]);
	});

	it("get returns the item", async () => {
		const item = await client.get("a");
		expect(item.name).toBe("Альфа");
	});

	it("get throws NotFoundError when missing", async () => {
		await expect(client.get("missing")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("create + get roundtrip", async () => {
		const result = await client.create([{ name: "Дельта" }]);
		expect(result.isAsync).toBe(false);
		expect(result.items?.[0].name).toBe("Дельта");
		const id = result.items?.[0].id as string;
		const fetched = await client.get(id);
		expect(fetched.name).toBe("Дельта");
	});

	it("update patches fields", async () => {
		const updated = await client.update("a", { name: "Альфа-2" });
		expect(updated.name).toBe("Альфа-2");
		const fetched = await client.get("a");
		expect(fetched.name).toBe("Альфа-2");
	});

	it("delete removes the item", async () => {
		await client.delete("a");
		await expect(client.get("a")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("archive moves item to archived set; list excludes by default", async () => {
		await client.archive("a", true);
		const page = await client.list({});
		expect(page.items.map((i) => i.id)).not.toContain("a");
	});

	it("archive(true) then list with folder=archive surfaces only archived", async () => {
		await client.archive("a", true);
		const page = await client.list({ folder: "archive" });
		expect(page.items.map((i) => i.id)).toEqual(["a"]);
	});

	it("totals returns a Totals shape", async () => {
		const totals = await client.totals({});
		expect(totals).toMatchObject({
			itemCount: expect.any(Number),
			totalOverpayment: expect.any(Number),
			totalSavings: expect.any(Number),
			totalDeviation: expect.any(Number),
		});
	});

	it("export returns a blob with a filename", async () => {
		const result = await client.export({});
		expect(result.blob).toBeInstanceOf(Blob);
		expect(result.filename).toMatch(/\.xlsx$/);
	});
});

/**
 * HTTP-only error branches: validation, conflict, network. The in-memory
 * adapter doesn't surface these (no validation step / no conflict logic in its
 * CRUD) so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	it("update with empty name throws ValidationError with fieldErrors", async () => {
		const harness = httpAdapter(SEED);
		const client = harness.build();
		try {
			await client.update("a", { name: "" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ name: ["required"] });
		}
	});

	it("update with conflicting name throws ConflictError", async () => {
		const harness = httpAdapter(SEED);
		const client = harness.build();
		await expect(client.update("a", { name: "__conflict__" })).rejects.toBeInstanceOf(ConflictError);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpItemsClient(http);
		await expect(client.get("a")).rejects.toMatchObject({ name: "NetworkError" });
	});
});
