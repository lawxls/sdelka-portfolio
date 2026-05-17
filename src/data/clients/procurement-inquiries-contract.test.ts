import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeProcurementInquiry } from "@/test-utils";
import type { ProcurementInquiry } from "../domains/procurement-inquiries";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { ProcurementInquiriesClient } from "./procurement-inquiries-client";
import { createHttpProcurementInquiriesClient } from "./procurement-inquiries-http";
import { createInMemoryProcurementInquiriesClient } from "./procurement-inquiries-in-memory";

/**
 * Layer B — adapter contract tests. The same scenarios run against the
 * in-memory adapter and the HTTP adapter (with `fetch` stubbed at the network
 * layer). Both runs assert identical observable behavior so the adapters are
 * interchangeable from a hook's point of view.
 *
 * After the inquiries HTTP integration: list/retrieve return the same full
 * `ProcurementInquiry` shape with annotated counts, archive/unarchive are
 * distinct endpoints, and the HTTP adapter translates `{sort,dir}` →
 * `ordering=<sign><field>` plus the magic folder values
 * (`"archive"`→`isArchived=true`, `"none"`→`folder__isnull=true`).
 */

interface Adapter {
	name: string;
	build: () => ProcurementInquiriesClient;
	lastRequest: () => { method: string; path: string; body?: unknown } | null;
}

function memoryAdapter(seed: ProcurementInquiry[]): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryProcurementInquiriesClient({ seed: seed.map((t) => ({ ...t })) }),
		lastRequest: () => null,
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

interface HttpAdapterTrack {
	requests: Array<{ method: string; path: string; body?: unknown }>;
}

function httpAdapter(seed: ProcurementInquiry[]): Adapter & { track: HttpAdapterTrack } {
	const store = new Map<string, ProcurementInquiry>(seed.map((t) => [t.id, { ...t }]));
	const track: HttpAdapterTrack = { requests: [] };
	let counter = 0;

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/procurement\/inquiries\/(\?|$)/,
			respond: ({ url }) => {
				const u = new URL(url, "http://test");
				const q = u.searchParams.get("q")?.toLowerCase();
				const isArchivedParam = u.searchParams.get("isArchived");
				const folderParam = u.searchParams.get("folder");
				const folderIsNullParam = u.searchParams.get("folder__isnull");
				let items = Array.from(store.values()).sort((a, b) =>
					a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
				);
				if (isArchivedParam === "true") items = items.filter((t) => t.isArchived);
				else if (isArchivedParam === "false") items = items.filter((t) => !t.isArchived);
				if (folderParam) items = items.filter((t) => t.folderId === folderParam);
				if (folderIsNullParam === "true") items = items.filter((t) => t.folderId === null);
				if (q) items = items.filter((t) => t.name.toLowerCase().includes(q));
				const ordering = u.searchParams.get("ordering");
				if (ordering) {
					const desc = ordering.startsWith("-");
					const field = desc ? ordering.slice(1) : ordering;
					items = [...items].sort((a, b) => {
						const av = (a as unknown as Record<string, unknown>)[field];
						const bv = (b as unknown as Record<string, unknown>)[field];
						const cmp =
							(av as string | number) < (bv as string | number)
								? -1
								: (av as string | number) > (bv as string | number)
									? 1
									: 0;
						return desc ? -cmp : cmp;
					});
				}
				return { status: 200, body: { next: null, previous: null, results: items } };
			},
		},
		{
			method: "GET",
			path: /^\/procurement\/inquiries\/([^/]+)\/$/,
			respond: ({ url }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
				const t = store.get(id);
				if (!t) return { status: 404 };
				return { status: 200, body: t };
			},
		},
		{
			method: "POST",
			path: /^\/procurement\/inquiries\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as Partial<ProcurementInquiry>;
				if (data.name === "") return { status: 400, body: { fieldErrors: { name: ["required"] } } };
				if (data.name === "__conflict__") return { status: 409, body: { detail: "name taken" } };
				counter += 1;
				const id = `T-${String(counter).padStart(3, "0")}`;
				const inquiry = makeProcurementInquiry(id, { companyId: data.companyId ?? "company-1", ...data });
				store.set(inquiry.id, inquiry);
				return { status: 201, body: inquiry };
			},
		},
		{
			method: "PATCH",
			path: /^\/procurement\/inquiries\/([^/]+)\/$/,
			respond: ({ url, init }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
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
			method: "POST",
			path: /^\/procurement\/inquiries\/([^/]+)\/archive\/$/,
			respond: ({ url }) => {
				const id = decodeURIComponent(new URL(url, "http://test").pathname.split("/").filter(Boolean)[2] ?? "");
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				const updated = { ...existing, isArchived: true };
				store.set(id, updated);
				return { status: 200, body: updated };
			},
		},
		{
			method: "POST",
			path: /^\/procurement\/inquiries\/([^/]+)\/unarchive\/$/,
			respond: ({ url }) => {
				const id = decodeURIComponent(new URL(url, "http://test").pathname.split("/").filter(Boolean)[2] ?? "");
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				const updated = { ...existing, isArchived: false };
				store.set(id, updated);
				return { status: 200, body: updated };
			},
		},
		{
			method: "DELETE",
			path: /^\/procurement\/inquiries\/([^/]+)\/$/,
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

	return {
		name: "http",
		build: () => createHttpProcurementInquiriesClient(http),
		lastRequest: () => track.requests[track.requests.length - 1] ?? null,
		track,
	};
}

const SEED: ProcurementInquiry[] = [
	makeProcurementInquiry("T-001", { name: "Альфа", createdAt: "2026-04-01T10:00:00+03:00" }),
	makeProcurementInquiry("T-002", { name: "Бета", createdAt: "2026-04-10T10:00:00+03:00" }),
	makeProcurementInquiry("T-003", { name: "Гамма", createdAt: "2026-04-20T10:00:00+03:00" }),
];

const adapters: Array<() => Adapter> = [() => memoryAdapter(SEED), () => httpAdapter(SEED)];

describe.each(
	adapters.map((make) => [make().name, make]),
)("ProcurementInquiriesClient contract — %s adapter", (_label, make) => {
	let client: ProcurementInquiriesClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("list returns CursorPage with full inquiry rows + always-present counts", async () => {
		const page = await client.list({});
		expect(page.items).toHaveLength(3);
		expect(page.items[0]).toMatchObject({
			id: expect.any(String),
			name: expect.any(String),
			status: expect.any(String),
			positionsCount: expect.any(Number),
			kpCount: expect.any(Number),
			tasksCount: expect.any(Number),
			suppliersCount: expect.any(Number),
			createdAt: expect.any(String),
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
		const inquiry = await client.get("T-001");
		expect(inquiry.id).toBe("T-001");
		expect(inquiry).toHaveProperty("kpCount");
		expect(inquiry).toHaveProperty("suppliersCount");
	});

	it("get throws NotFoundError when missing", async () => {
		await expect(client.get("T-999")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("create + get roundtrip", async () => {
		const created = await client.create({
			name: "Дельта",
			companyId: "company-1",
			deadline: "2026-06-01",
		});
		expect(created.name).toBe("Дельта");
		expect(created.id).toMatch(/^/);
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

	it("archive flips isArchived true", async () => {
		const result = await client.archive("T-001");
		expect(result.isArchived).toBe(true);
	});

	it("unarchive flips isArchived false", async () => {
		await client.archive("T-001");
		const result = await client.unarchive("T-001");
		expect(result.isArchived).toBe(false);
	});

	it("delete removes the inquiry", async () => {
		await client.delete("T-001");
		await expect(client.get("T-001")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("delete throws NotFoundError when missing", async () => {
		await expect(client.delete("T-999")).rejects.toBeInstanceOf(NotFoundError);
	});
});

/**
 * HTTP-only translations: URL routing, sort ↔ ordering, folder magic values.
 * The in-memory adapter implements the same semantics without an HTTP surface
 * to assert on, so these scenarios are HTTP-only.
 */
describe("HTTP adapter — wire translations", () => {
	it("list hits /procurement/inquiries/ (trailing slash)", async () => {
		const adapter = httpAdapter(SEED);
		await adapter.build().list({});
		expect(adapter.lastRequest()?.path).toMatch(/^\/procurement\/inquiries\//);
	});

	it("get hits /procurement/inquiries/{id}/", async () => {
		const adapter = httpAdapter(SEED);
		await adapter.build().get("T-001");
		expect(adapter.lastRequest()).toMatchObject({ method: "GET", path: "/procurement/inquiries/T-001/" });
	});

	it("archive hits /procurement/inquiries/{id}/archive/", async () => {
		const adapter = httpAdapter(SEED);
		await adapter.build().archive("T-001");
		expect(adapter.lastRequest()).toMatchObject({
			method: "POST",
			path: "/procurement/inquiries/T-001/archive/",
		});
	});

	it("unarchive hits /procurement/inquiries/{id}/unarchive/", async () => {
		const adapter = httpAdapter(SEED);
		await adapter.build().unarchive("T-001");
		expect(adapter.lastRequest()).toMatchObject({
			method: "POST",
			path: "/procurement/inquiries/T-001/unarchive/",
		});
	});

	it("delete hits /procurement/inquiries/{id}/", async () => {
		const adapter = httpAdapter(SEED);
		await adapter.build().delete("T-001");
		expect(adapter.lastRequest()).toMatchObject({ method: "DELETE", path: "/procurement/inquiries/T-001/" });
	});

	it("translates {sort,dir} → ordering=<sign><field>", async () => {
		const adapter = httpAdapter(SEED);
		await adapter.build().list({ sort: "createdAt", dir: "desc" });
		expect(adapter.lastRequest()?.path).toContain("ordering=-createdAt");
		await adapter.build().list({ sort: "suppliersCount", dir: "asc" });
		expect(adapter.lastRequest()?.path).toContain("ordering=suppliersCount");
	});

	it("translates folder='archive' → isArchived=true (no folder param)", async () => {
		const adapter = httpAdapter(SEED);
		await adapter.build().list({ folder: "archive" });
		expect(adapter.lastRequest()?.path).toContain("isArchived=true");
		expect(adapter.lastRequest()?.path).not.toContain("folder=archive");
	});

	it("translates folder='none' → folder__isnull=true + isArchived=false", async () => {
		const adapter = httpAdapter(SEED);
		await adapter.build().list({ folder: "none" });
		const path = adapter.lastRequest()?.path ?? "";
		expect(path).toContain("folder__isnull=true");
		expect(path).toContain("isArchived=false");
	});

	it("passes a folder UUID through unchanged + isArchived=false", async () => {
		const adapter = httpAdapter(SEED);
		await adapter.build().list({ folder: "folder-1" });
		const path = adapter.lastRequest()?.path ?? "";
		expect(path).toContain("folder=folder-1");
		expect(path).toContain("isArchived=false");
	});
});

/**
 * HTTP-only error branches: validation, conflict, network. Same coverage as
 * the previous suite — the in-memory adapter doesn't surface these.
 */
describe("HTTP-only error branches", () => {
	it("create with empty name throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter(SEED).build();
		try {
			await client.create({ name: "", companyId: "c1", deadline: "2026-06-01" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ name: ["required"] });
		}
	});

	it("create with conflicting name throws ConflictError", async () => {
		const client = httpAdapter(SEED).build();
		await expect(
			client.create({ name: "__conflict__", companyId: "c1", deadline: "2026-06-01" }),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpProcurementInquiriesClient(http);
		await expect(client.get("T-001")).rejects.toMatchObject({ name: "NetworkError" });
	});
});
