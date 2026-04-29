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
 */

function makeStored(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		website: "",
		description: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses: [{ id: `addr-${id}`, name: "Офис", address: "г. Москва", phone: "", isMain: true }],
		employees: [],
		...overrides,
	};
}

interface Adapter {
	name: string;
	build: () => CompaniesClient;
	cleanup?: () => void;
}

interface MemoryAdapter extends Adapter {
	name: "memory";
}

function memoryAdapter(seed: Company[]): MemoryAdapter {
	return {
		name: "memory",
		build: () => createInMemoryCompaniesClient(seed),
	};
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

function httpAdapter(seed: Company[]): HttpHarness {
	const store = new Map<string, Company>(seed.map((c) => [c.id, structuredClone(c)]));
	let employeeIdCounter = 1000;
	const calls: HttpHarness["calls"] = [];

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/api\/companies\/all$/,
			respond: () =>
				Promise.resolve({
					status: 200,
					body: Array.from(store.values()).map(toSummary),
				}),
		},
		{
			method: "GET",
			path: /^\/api\/companies(\?|$)/,
			respond: ({ url }) => {
				const u = new URL(url, "http://test");
				const q = u.searchParams.get("q")?.toLowerCase();
				let items = Array.from(store.values());
				if (q) items = items.filter((c) => c.name.toLowerCase().includes(q));
				return { status: 200, body: { items: items.map(toSummary), nextCursor: null } };
			},
		},
		{
			method: "GET",
			path: /^\/api\/companies\/([^/]+)$/,
			respond: ({ url }) => {
				const id = idFromPath(url, /^\/api\/companies\/([^/]+)$/);
				const c = store.get(id);
				if (!c) return { status: 404 };
				return { status: 200, body: c };
			},
		},
		{
			method: "POST",
			path: /^\/api\/companies$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string);
				if (!data.name) return { status: 400, body: { fieldErrors: { name: ["required"] } } };
				const id = `company-${store.size + 1}`;
				const company: Company = makeStored(id, {
					name: data.name,
					website: data.website ?? "",
					addresses: [
						{
							id: `addr-${id}`,
							name: data.address.name,
							address: data.address.address,
							phone: data.address.phone,
							isMain: data.address.isMain ?? true,
						},
					],
				});
				store.set(id, company);
				return { status: 201, body: company };
			},
		},
		{
			method: "PATCH",
			path: /^\/api\/companies\/([^/]+)$/,
			respond: ({ url, init }) => {
				const id = idFromPath(url, /^\/api\/companies\/([^/]+)$/);
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
			path: /^\/api\/companies\/([^/]+)$/,
			respond: ({ url }) => {
				const id = idFromPath(url, /^\/api\/companies\/([^/]+)$/);
				store.delete(id);
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: /^\/api\/companies\/([^/]+)\/addresses$/,
			respond: ({ url, init }) => {
				const id = idFromPath(url, /^\/api\/companies\/([^/]+)\/addresses$/);
				const c = store.get(id);
				if (!c) return { status: 404 };
				const data = JSON.parse(init?.body as string);
				const address = {
					id: `addr-${id}-${c.addresses.length + 1}`,
					name: data.name,
					address: data.address,
					phone: data.phone,
					isMain: data.isMain ?? false,
				};
				c.addresses.push(address);
				return { status: 201, body: address };
			},
		},
		{
			method: "POST",
			path: /^\/api\/companies\/([^/]+)\/employees$/,
			respond: ({ url, init }) => {
				const id = idFromPath(url, /^\/api\/companies\/([^/]+)\/employees$/);
				const c = store.get(id);
				if (!c) return { status: 404 };
				const data = JSON.parse(init?.body as string);
				employeeIdCounter += 1;
				const employee = {
					...data,
					id: employeeIdCounter,
					permissions: {
						id: `perm-${employeeIdCounter}`,
						employeeId: employeeIdCounter,
						procurement: "none" as const,
						tasks: "none" as const,
						companies: "none" as const,
						employees: "none" as const,
						emails: "none" as const,
					},
				};
				c.employees.push(employee);
				return { status: 201, body: employee };
			},
		},
	];

	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		const url = input;
		const method = init?.method ?? "GET";
		const body = init?.body ? JSON.parse(init.body as string) : undefined;
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

function toSummary(c: Company) {
	return {
		id: c.id,
		name: c.name,
		isMain: c.isMain,
		addresses: c.addresses.map((a) => ({ id: a.id, name: a.name, address: a.address, isMain: a.isMain })),
		employeeCount: c.employees.length || c.employeeCount,
		procurementItemCount: c.procurementItemCount,
	};
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

	it("list returns CursorPage with summaries", async () => {
		const page = await client.list({});
		expect(page.items).toHaveLength(2);
		expect(page.items[0]).not.toHaveProperty("employees");
	});

	it("list filters by q", async () => {
		const page = await client.list({ q: "альф" });
		expect(page.items.map((c) => c.name)).toEqual(["Альфа"]);
	});

	it("get returns full Company", async () => {
		const company = await client.get("c1");
		expect(company.name).toBe("Альфа");
		expect(company.addresses).toHaveLength(1);
	});

	it("get throws NotFoundError when missing", async () => {
		await expect(client.get("missing")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("create + get roundtrip", async () => {
		const created = await client.create({
			name: "Новая",
			address: { name: "Офис", address: "г. Москва", phone: "+71234567890" },
		});
		expect(created.id).toBeTruthy();
		const fetched = await client.get(created.id);
		expect(fetched.name).toBe("Новая");
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

	it("createEmployee appends an employee with default permissions", async () => {
		const employee = await client.createEmployee("c1", {
			firstName: "Анна",
			lastName: "С",
			patronymic: "В",
			position: "M",
			role: "user",
			phone: "+7",
			email: "a@b",
		});
		expect(employee.id).toBeGreaterThan(0);
		expect(employee.permissions.procurement).toBe("none");
	});
});

/**
 * HTTP-only branches: validation, conflict, network. The in-memory adapter
 * doesn't surface these (no validation step / no conflict logic in its CRUD)
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
});
