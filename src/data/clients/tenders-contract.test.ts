import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcurementInquiry } from "../domains/tenders";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetItemsStore } from "../items-mock-data";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { TendersClient } from "./tenders-client";
import { createHttpTendersClient } from "./tenders-http";
import { createInMemoryTendersClient } from "./tenders-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * The tenders list response is `CursorPage<TenderSummary>`; `get` returns the
 * full `ProcurementInquiry` record.
 */

function makeTender(id: string, overrides: Partial<ProcurementInquiry> = {}): ProcurementInquiry {
	return {
		id,
		name: `Tender ${id}`,
		companyId: "company-1",
		folderId: null,
		budget: 1_000_000,
		createdAt: "2026-04-01",
		deadline: "2026-05-15",
		...overrides,
	};
}

interface Adapter {
	name: string;
	build: () => TendersClient;
}

function memoryAdapter(seed: ProcurementInquiry[]): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryTendersClient({ seed: seed.map((t) => ({ ...t })) }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(seed: ProcurementInquiry[]): Adapter {
	const store = new Map<string, ProcurementInquiry>(seed.map((t) => [t.id, { ...t }]));
	let counter = 0;

	function summary(t: ProcurementInquiry) {
		return {
			id: t.id,
			name: t.name,
			companyId: t.companyId,
			folderId: t.folderId,
			budget: t.budget,
			createdAt: t.createdAt,
			deadline: t.deadline,
			status: "searching" as const,
			positionsCount: 0,
			kpCount: 0,
			suppliersCount: 0,
			tasksCount: 0,
		};
	}

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/tenders(\?|$)/,
			respond: ({ url }) => {
				const u = new URL(url, "http://test");
				const q = u.searchParams.get("q")?.toLowerCase();
				let items = Array.from(store.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
				if (q) items = items.filter((t) => t.name.toLowerCase().includes(q));
				return { status: 200, body: { items: items.map(summary), nextCursor: null } };
			},
		},
		{
			method: "GET",
			path: /^\/tenders\/([^/]+)$/,
			respond: ({ url }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").pop() ?? "");
				const t = store.get(id);
				if (!t) return { status: 404 };
				return { status: 200, body: t };
			},
		},
		{
			method: "POST",
			path: /^\/tenders$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as Partial<ProcurementInquiry>;
				if (!data.name) return { status: 400, body: { fieldErrors: { name: ["required"] } } };
				if (data.name === "__conflict__") return { status: 409, body: { detail: "name taken" } };
				counter += 1;
				const tender = makeTender(`T-${String(counter).padStart(3, "0")}`, data as Partial<ProcurementInquiry>);
				store.set(tender.id, tender);
				return { status: 201, body: tender };
			},
		},
		{
			method: "PATCH",
			path: /^\/tenders\/([^/]+)$/,
			respond: ({ url, init }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").pop() ?? "");
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				const data = JSON.parse(init?.body as string) as Partial<ProcurementInquiry>;
				if (data.name === "") return { status: 400, body: { fieldErrors: { name: ["required"] } } };
				const updated = { ...existing, ...data, id: existing.id };
				store.set(id, updated);
				return { status: 200, body: updated };
			},
		},
		{
			method: "DELETE",
			path: /^\/tenders\/([^/]+)$/,
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
		build: () => createHttpTendersClient(http),
	};
}

const SEED: ProcurementInquiry[] = [
	makeTender("T-001", { name: "Альфа", createdAt: "2026-04-01" }),
	makeTender("T-002", { name: "Бета", createdAt: "2026-04-10" }),
	makeTender("T-003", { name: "Гамма", createdAt: "2026-04-20" }),
];

const adapters: Array<() => Adapter> = [() => memoryAdapter(SEED), () => httpAdapter(SEED)];

describe.each(adapters.map((make) => [make().name, make]))("TendersClient contract — %s adapter", (_label, make) => {
	let client: TendersClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		_resetItemsStore();
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("list returns CursorPage with summaries", async () => {
		const page = await client.list({});
		expect(page.items).toHaveLength(3);
		expect(page.items[0]).toMatchObject({
			id: expect.any(String),
			name: expect.any(String),
			budget: expect.any(Number),
			positionsCount: expect.any(Number),
			kpCount: expect.any(Number),
			createdAt: expect.any(String),
			deadline: expect.any(String),
			status: expect.any(String),
		});
	});

	it("list sorts by createdAt desc by default", async () => {
		const page = await client.list({});
		expect(page.items.map((t) => t.id)).toEqual(["T-003", "T-002", "T-001"]);
	});

	it("list filters by q", async () => {
		const page = await client.list({ q: "альф" });
		expect(page.items.map((t) => t.name)).toEqual(["Альфа"]);
	});

	it("get returns the full ProcurementInquiry", async () => {
		const tender = await client.get("T-001");
		expect(tender.id).toBe("T-001");
		expect(tender.budget).toBe(1_000_000);
	});

	it("get throws NotFoundError when missing", async () => {
		await expect(client.get("T-999")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("create + get roundtrip", async () => {
		const created = await client.create({
			name: "Дельта",
			companyId: "company-1",
			budget: 500_000,
			deadline: "2026-06-01",
		});
		expect(created.name).toBe("Дельта");
		expect(created.id).toMatch(/^T-/);
		const fetched = await client.get(created.id);
		expect(fetched.name).toBe("Дельта");
	});

	it("update patches fields", async () => {
		const updated = await client.update("T-001", { name: "Альфа-2" });
		expect(updated.name).toBe("Альфа-2");
		const fetched = await client.get("T-001");
		expect(fetched.name).toBe("Альфа-2");
	});

	it("update throws NotFoundError when missing", async () => {
		await expect(client.update("T-999", { name: "x" })).rejects.toBeInstanceOf(NotFoundError);
	});

	it("delete removes the tender", async () => {
		await client.delete("T-001");
		await expect(client.get("T-001")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("delete throws NotFoundError when missing", async () => {
		await expect(client.delete("T-999")).rejects.toBeInstanceOf(NotFoundError);
	});
});

/**
 * HTTP-only error branches: validation, conflict, network. The in-memory
 * adapter doesn't surface these so they're tested only against the HTTP
 * adapter.
 */
describe("HTTP-only error branches", () => {
	it("create with empty name throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter(SEED).build();
		try {
			await client.create({ name: "", companyId: "c1", budget: 0, deadline: "2026-06-01" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ name: ["required"] });
		}
	});

	it("create with conflicting name throws ConflictError", async () => {
		const client = httpAdapter(SEED).build();
		await expect(
			client.create({ name: "__conflict__", companyId: "c1", budget: 0, deadline: "2026-06-01" }),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpTendersClient(http);
		await expect(client.get("T-001")).rejects.toMatchObject({ name: "NetworkError" });
	});
});
