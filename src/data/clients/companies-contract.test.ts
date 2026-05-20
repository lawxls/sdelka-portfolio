import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Company } from "../domains/companies";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetIdCounter, _setMockDelay } from "../mock-utils";
import type { CompaniesClient } from "./companies-client";
import { createHttpCompaniesClient } from "./companies-http";
import { createInMemoryCompaniesClient } from "./companies-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * HTTP harness mimics the Django backend: cursor pagination shape
 * `{ next, previous, results }`, `?ordering=` accepting snake_case fields,
 * and a flat `/companies/addresses/` resource scoped via the `companyId` body
 * field on writes. The two-step `create()` (company POST + address POST) is
 * orchestrated inside the adapter; the contract test asserts on the final
 * `Company` shape and on partial-failure error propagation.
 */

function makeStored(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		inn: "",
		website: "",
		additionalComments: "",
		isMain: false,
		cardFile: null,
		cardFileName: "",
		employeeCount: 0,
		procurementItemCount: 0,
		addressesCount: 1,
		createdAt: "2026-05-18T10:00:00+03:00",
		updatedAt: "2026-05-18T10:00:00+03:00",
		addresses: [{ id: `addr-${id}`, name: "Офис", address: "г. Москва", phone: "", isMain: true }],
		...overrides,
	};
}

interface Adapter {
	name: string;
	build: () => CompaniesClient;
}

function memoryAdapter(seed: Company[]): Adapter {
	return { name: "memory", build: () => createInMemoryCompaniesClient(seed) };
}

interface HttpRoute {
	method: string;
	path: string | RegExp;
	respond: (req: {
		url: string;
		init?: RequestInit;
	}) => { status: number; body?: unknown } | Promise<{ status: number; body?: unknown }>;
}

interface HttpHarness extends Adapter {
	name: "http";
	calls: { url: string; method: string; body?: unknown }[];
}

interface HarnessOptions {
	failAddressCreate?: boolean;
}

function httpAdapter(seed: Company[], opts: HarnessOptions = {}): HttpHarness {
	const store = new Map<string, Company>(seed.map((c) => [c.id, structuredClone(c)]));
	const calls: HttpHarness["calls"] = [];
	let addressIdCounter = 1000;

	function summarize(c: Company) {
		return {
			id: c.id,
			name: c.name,
			isMain: c.isMain,
			addressesCount: c.addressesCount,
			employeeCount: c.employeeCount,
			procurementItemCount: c.procurementItemCount,
			createdAt: c.createdAt,
			updatedAt: c.updatedAt,
		};
	}

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/companies\/(\?|$)/,
			respond: ({ url }) => {
				const u = new URL(url, "http://test");
				const q = u.searchParams.get("q")?.toLowerCase();
				const ordering = u.searchParams.get("ordering");
				let items = Array.from(store.values());
				if (q) items = items.filter((c) => c.name.toLowerCase().includes(q));
				if (ordering) {
					const desc = ordering.startsWith("-");
					const field = ordering.replace(/^-/, "");
					items = [...items].sort((a, b) => {
						const mul = desc ? -1 : 1;
						if (field === "name") return mul * a.name.localeCompare(b.name, "ru");
						if (field === "employee_count") return mul * (a.employeeCount - b.employeeCount);
						if (field === "procurement_item_count") return mul * (a.procurementItemCount - b.procurementItemCount);
						if (field === "created_at") return mul * a.createdAt.localeCompare(b.createdAt);
						return 0;
					});
				}
				return {
					status: 200,
					body: { next: null, previous: null, results: items.map(summarize) },
				};
			},
		},
		{
			method: "GET",
			path: /^\/companies\/([^/]+)\/$/,
			respond: ({ url }) => {
				const id = idFromPath(url, /^\/companies\/([^/]+)\/$/);
				const c = store.get(id);
				if (!c) return { status: 404 };
				return { status: 200, body: c };
			},
		},
		{
			method: "POST",
			path: /^\/companies\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string);
				if (!data.name) return { status: 400, body: { fieldErrors: { name: ["required"] } } };
				const id = `company-${store.size + 1}`;
				const now = "2026-05-18T10:00:00+03:00";
				const company: Company = {
					id,
					name: data.name,
					inn: data.inn ?? "",
					website: data.website ?? "",
					additionalComments: data.additionalComments ?? "",
					isMain: false,
					cardFile: null,
					cardFileName: "",
					employeeCount: 0,
					procurementItemCount: 0,
					addressesCount: 0,
					createdAt: now,
					updatedAt: now,
					addresses: [],
				};
				store.set(id, company);
				return { status: 201, body: company };
			},
		},
		{
			method: "PATCH",
			path: /^\/companies\/([^/]+)\/$/,
			respond: ({ url, init }) => {
				const id = idFromPath(url, /^\/companies\/([^/]+)\/$/);
				const existing = store.get(id);
				if (!existing) return { status: 404 };
				const data = JSON.parse(init?.body as string);
				if (data.name === "__conflict__") return { status: 409, body: { detail: "name taken" } };
				const updated = { ...existing, ...data };
				store.set(id, updated);
				return { status: 200, body: updated };
			},
		},
		{
			method: "DELETE",
			path: /^\/companies\/([^/]+)\/$/,
			respond: ({ url }) => {
				const id = idFromPath(url, /^\/companies\/([^/]+)\/$/);
				store.delete(id);
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: /^\/companies\/([^/]+)\/archive\/$/,
			respond: ({ url }) => {
				const id = idFromPath(url, /^\/companies\/([^/]+)\/archive\/$/);
				if (!store.has(id)) return { status: 404 };
				if (store.size <= 1) return { status: 409, body: { detail: "cannot archive the only company" } };
				store.delete(id);
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: /^\/companies\/addresses\/$/,
			respond: ({ init }) => {
				if (opts.failAddressCreate) {
					return { status: 400, body: { fieldErrors: { address: ["required"] } } };
				}
				const data = JSON.parse(init?.body as string);
				const c = store.get(data.companyId);
				if (!c) return { status: 400, body: { company_id: "Object does not belong to your workspace." } };
				addressIdCounter += 1;
				const address = {
					id: `addr-${addressIdCounter}`,
					companyId: data.companyId,
					name: data.name,
					address: data.address,
					phone: data.phone ?? "",
					isMain: data.isMain ?? false,
					createdAt: "2026-05-18T10:00:00+03:00",
					updatedAt: "2026-05-18T10:00:00+03:00",
				};
				c.addresses.push({
					id: address.id,
					name: address.name,
					address: address.address,
					phone: address.phone,
					isMain: address.isMain,
				});
				c.addressesCount = c.addresses.length;
				return { status: 201, body: address };
			},
		},
		{
			method: "PATCH",
			path: /^\/companies\/addresses\/([^/]+)\/$/,
			respond: ({ url, init }) => {
				const addressId = idFromPath(url, /^\/companies\/addresses\/([^/]+)\/$/);
				const data = JSON.parse(init?.body as string);
				for (const c of store.values()) {
					const idx = c.addresses.findIndex((a) => a.id === addressId);
					if (idx === -1) continue;
					c.addresses[idx] = { ...c.addresses[idx], ...data };
					return {
						status: 200,
						body: { ...c.addresses[idx], companyId: c.id, createdAt: c.createdAt, updatedAt: c.updatedAt },
					};
				}
				return { status: 404 };
			},
		},
		{
			method: "DELETE",
			path: /^\/companies\/addresses\/([^/]+)\/$/,
			respond: ({ url }) => {
				const addressId = idFromPath(url, /^\/companies\/addresses\/([^/]+)\/$/);
				for (const c of store.values()) {
					const before = c.addresses.length;
					c.addresses = c.addresses.filter((a) => a.id !== addressId);
					if (c.addresses.length !== before) {
						c.addressesCount = c.addresses.length;
						return { status: 204 };
					}
				}
				return { status: 404 };
			},
		},
		{
			method: "POST",
			path: /^\/companies\/([^/]+)\/card\/$/,
			respond: ({ url, init }) => {
				const id = idFromPath(url, /^\/companies\/([^/]+)\/card\/$/);
				const c = store.get(id);
				if (!c) return { status: 404 };
				const form = init?.body as FormData;
				const file = form.get("cardFile") as File | null;
				if (!file) return { status: 400, body: { fieldErrors: { cardFile: ["required"] } } };
				c.cardFile = `mock://companies/cards/${encodeURIComponent(file.name)}`;
				c.cardFileName = file.name;
				return { status: 200, body: c };
			},
		},
		{
			method: "DELETE",
			path: /^\/companies\/([^/]+)\/card\/$/,
			respond: ({ url }) => {
				const id = idFromPath(url, /^\/companies\/([^/]+)\/card\/$/);
				const c = store.get(id);
				if (!c) return { status: 404 };
				c.cardFile = null;
				c.cardFileName = "";
				return { status: 200, body: c };
			},
		},
	];

	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		const url = input;
		const method = init?.method ?? "GET";
		const body = init?.body instanceof FormData ? init.body : init?.body ? JSON.parse(init.body as string) : undefined;
		calls.push({ url, method, body });
		const path = new URL(url, "http://test").pathname + new URL(url, "http://test").search;
		const route = routes.find(
			(r) => r.method === method && (typeof r.path === "string" ? r.path === path : r.path.test(path)),
		);
		if (!route) throw new Error(`Unmatched ${method} ${url}`);
		const result = await route.respond({ url, init });
		const hasBody = result.body !== undefined && result.status !== 204;
		return new Response(hasBody ? JSON.stringify(result.body) : null, {
			status: result.status,
			headers: hasBody ? { "content-type": "application/json" } : undefined,
		});
	});

	const http = createHttpClient({
		baseUrl: "",
		fetch: fetchStub,
		getToken: () => "test-token",
	});

	return {
		name: "http",
		build: () => createHttpCompaniesClient(http),
		calls,
	};
}

function idFromPath(url: string, pattern: RegExp): string {
	const path = new URL(url, "http://test").pathname;
	const match = path.match(pattern);
	if (!match) throw new Error(`No id match in ${path}`);
	return decodeURIComponent(match[1]);
}

const SEED: Company[] = [makeStored("c1", { name: "Альфа" }), makeStored("c2", { name: "Бета" })];

const adapters: Array<() => Adapter> = [() => memoryAdapter(SEED), () => httpAdapter(SEED)];

describe.each(adapters.map((make) => [make().name, make]))("CompaniesClient contract — %s adapter", (_label, make) => {
	let client: CompaniesClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		_resetIdCounter();
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("list returns CursorPage with summaries that omit addresses", async () => {
		const page = await client.list({});
		expect(page.items).toHaveLength(2);
		expect(page.items[0]).not.toHaveProperty("addresses");
		expect(page.items[0]).not.toHaveProperty("employees");
		expect(typeof page.items[0].addressesCount).toBe("number");
	});

	it("list filters by q", async () => {
		const page = await client.list({ q: "альф" });
		expect(page.items.map((c) => c.name)).toEqual(["Альфа"]);
	});

	it("get returns full Company with inlined addresses", async () => {
		const company = await client.get("c1");
		expect(company.name).toBe("Альфа");
		expect(company.addresses).toHaveLength(1);
	});

	it("get throws NotFoundError when missing", async () => {
		await expect(client.get("missing")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("create + get roundtrip persists the company and its address", async () => {
		const created = await client.create({
			name: "Новая",
			address: { name: "Офис", address: "г. Москва", phone: "+71234567890" },
		});
		expect(created.id).toBeTruthy();
		expect(created.addresses.map((a) => a.address)).toEqual(["г. Москва"]);
		const fetched = await client.get(created.id);
		expect(fetched.name).toBe("Новая");
		expect(fetched.addresses).toHaveLength(1);
	});

	it("update patches fields", async () => {
		const updated = await client.update("c1", { name: "Альфа-2" });
		expect(updated.name).toBe("Альфа-2");
		const fetched = await client.get("c1");
		expect(fetched.name).toBe("Альфа-2");
	});

	it("delete removes the company", async () => {
		await client.delete("c1");
		await expect(client.get("c1")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("archive moves the company out of the active list", async () => {
		await client.archive("c1");
		await expect(client.get("c1")).rejects.toBeInstanceOf(NotFoundError);
		const all = await client.listAll();
		expect(all.map((c) => c.id)).toEqual(["c2"]);
	});

	it("archive of the only remaining company is rejected", async () => {
		await client.archive("c1");
		await expect(client.archive("c2")).rejects.toBeTruthy();
	});

	it("createAddress appends an address", async () => {
		const address = await client.createAddress("c1", {
			name: "Склад",
			address: "г. Тула",
			phone: "+74567",
		});
		expect(address.id).toBeTruthy();
		const company = await client.get("c1");
		expect(company.addresses.map((a) => a.name)).toContain("Склад");
	});

	it("updateAddress patches the requested fields", async () => {
		const updated = await client.updateAddress("c1", "addr-c1", { name: "Главный офис" });
		expect(updated.name).toBe("Главный офис");
	});

	it("deleteAddress removes the address", async () => {
		await client.deleteAddress("c1", "addr-c1");
		const company = await client.get("c1");
		expect(company.addresses.find((a) => a.id === "addr-c1")).toBeUndefined();
	});

	it("listAll returns every summary in workspace order", async () => {
		const all = await client.listAll();
		expect(all.map((c) => c.name).sort()).toEqual(["Альфа", "Бета"]);
	});

	it("uploadCard sets cardFile + cardFileName on the company", async () => {
		const file = new File(["%PDF-1.4 stub"], "card.pdf", { type: "application/pdf" });
		const updated = await client.uploadCard("c1", file);
		expect(updated.cardFile).toBeTruthy();
		expect(updated.cardFileName).toBe("card.pdf");
	});

	it("deleteCard clears the card fields", async () => {
		const file = new File(["data"], "card.pdf", { type: "application/pdf" });
		await client.uploadCard("c1", file);
		const cleared = await client.deleteCard("c1");
		expect(cleared.cardFile).toBeNull();
		expect(cleared.cardFileName).toBe("");
	});
});

/**
 * HTTP-only branches: validation, conflict, ordering translation, two-step
 * create orchestration, partial-failure error propagation. The in-memory
 * adapter doesn't surface these (no validation or workflow steps in its CRUD),
 * so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	it("create with empty name throws ValidationError with fieldErrors", async () => {
		const harness = httpAdapter(SEED);
		const client = harness.build();
		try {
			await client.create({
				name: "",
				address: { name: "Офис", address: "г. Москва", phone: "+71234567890" },
			});
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ name: ["required"] });
		}
	});

	it("update with conflicting name throws ConflictError", async () => {
		const harness = httpAdapter(SEED);
		const client = harness.build();
		await expect(client.update("c1", { name: "__conflict__" })).rejects.toBeInstanceOf(ConflictError);
	});

	it("network failures bubble up as the typed NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpCompaniesClient(http);
		await expect(client.get("c1")).rejects.toMatchObject({ name: "NetworkError" });
	});

	it("create orchestrates company POST then per-address POST in order", async () => {
		const harness = httpAdapter(SEED);
		const client = harness.build();
		await client.create({
			name: "Новая",
			address: { name: "Офис", address: "г. Москва", phone: "+71234567890" },
		});
		const writes = harness.calls.filter((c) => c.method === "POST");
		expect(writes[0].url).toBe("/companies/");
		expect(writes[1].url).toBe("/companies/addresses/");
		expect(writes[1].body).toMatchObject({ name: "Офис", address: "г. Москва" });
	});

	it("createAddress hits the flat top-level addresses URL with companyId body", async () => {
		const harness = httpAdapter(SEED);
		const client = harness.build();
		await client.createAddress("c1", { name: "Склад", address: "г. Тула", phone: "" });
		const write = harness.calls.find((c) => c.method === "POST" && c.url === "/companies/addresses/");
		expect(write?.body).toMatchObject({ companyId: "c1", name: "Склад", address: "г. Тула" });
	});

	it("partial-failure on create surfaces a typed error and the company is reachable via get()", async () => {
		const harness = httpAdapter(SEED, { failAddressCreate: true });
		const client = harness.build();
		await expect(
			client.create({
				name: "Новая",
				address: { name: "Офис", address: "г. Москва", phone: "" },
			}),
		).rejects.toBeInstanceOf(ValidationError);
		const writes = harness.calls.filter((c) => c.method === "POST");
		const createdId = (JSON.parse(JSON.stringify(writes[0].body)) as { name: string }).name;
		expect(createdId).toBe("Новая");
		// The company POST landed before the address POST failed, so the company
		// exists on the server. A subsequent get() round-trips it.
		const company = await client.get("company-3");
		expect(company.name).toBe("Новая");
	});

	it("list translates FE sort/dir into DRF ordering=", async () => {
		const harness = httpAdapter(SEED);
		const client = harness.build();
		await client.list({ sort: "employeeCount", dir: "desc" });
		const call = harness.calls.find((c) => c.method === "GET" && c.url.startsWith("/companies/"));
		expect(call?.url).toContain("ordering=-employee_count");
	});

	it("listAll auto-paginates via cursor and concatenates pages", async () => {
		const fetchStub = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						next: "https://api.test/companies/?cursor=page-2",
						previous: null,
						results: [{ id: "c1" }, { id: "c2" }],
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				),
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ next: null, previous: null, results: [{ id: "c3" }] }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
			);
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => "t" });
		const client = createHttpCompaniesClient(http);
		const all = await client.listAll();
		expect(all.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
		expect(fetchStub).toHaveBeenCalledTimes(2);
		expect((fetchStub.mock.calls[1] as [string])[0]).toContain("cursor=page-2");
	});
});
