import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcurementItem } from "../domains/items";
import type { Supplier, SupplierSeed } from "../domains/suppliers";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetItemsStore, _setItems } from "../items-mock-data";
import { _resetSupplierStore, _setSendShouldFail, _setSupplierMockDelay } from "../supplier-mock-data";
import type { SuppliersClient } from "./suppliers-client";
import { createHttpSuppliersClient } from "./suppliers-http";
import { createInMemorySuppliersClient } from "./suppliers-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 */

const ITEM_ID = "item-x";

const ITEM: ProcurementItem = {
	id: ITEM_ID,
	name: "Test Item",
	status: "searching",
	annualQuantity: 100,
	currentPrice: 50,
	bestPrice: null,
	averagePrice: null,
	folderId: null,
	companyId: "company-1",
};

function makeSeed(id: string, overrides: Partial<SupplierSeed> = {}): SupplierSeed {
	return {
		id,
		itemId: ITEM_ID,
		companyName: `Company ${id}`,
		status: "new",
		archived: false,
		email: `info@${id}.test`,
		website: `https://${id}.test`,
		address: "г. Москва, ул. Тестовая, д. 1",
		pricePerUnit: null,
		tco: null,
		rating: null,
		deliveryCost: null,
		paymentType: "prepayment",
		deferralDays: 0,
		leadTimeDays: null,
		agentComment: "",
		documents: [],
		chatHistory: [],
		...overrides,
	};
}

const SEEDS: SupplierSeed[] = [
	makeSeed("supplier-x-1", { companyName: "Альфа" }),
	makeSeed("supplier-x-2", { companyName: "Бета" }),
	makeSeed("supplier-x-3", { companyName: "Гамма", status: "получено_кп", pricePerUnit: 100, tco: 110, rating: 80 }),
];

interface Adapter {
	name: string;
	build: () => SuppliersClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () =>
			createInMemorySuppliersClient({
				seedByItemId: { [ITEM_ID]: SEEDS },
			}),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	const store = new Map<string, Supplier>();
	for (const seed of SEEDS) {
		store.set(seed.id, structuredClone(seed) as unknown as Supplier);
	}

	function listAll(): Supplier[] {
		return Array.from(store.values()).filter((s) => !s.archived);
	}

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers/all$`),
			respond: () => ({ status: 200, body: { suppliers: Array.from(store.values()) } }),
		},
		{
			method: "GET",
			path: /^\/api\/suppliers$/,
			respond: () => ({ status: 200, body: listAll() }),
		},
		{
			method: "GET",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers/([^/]+)$`),
			respond: ({ url }) => {
				const id = decodeURIComponent(new URL(url, "http://test").pathname.split("/").pop() ?? "");
				const found = store.get(id);
				if (!found) return { status: 404 };
				return { status: 200, body: found };
			},
		},
		{
			method: "GET",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers(\\?|$)`),
			respond: ({ url }) => {
				const u = new URL(url, "http://test");
				const search = u.searchParams.get("search")?.toLowerCase();
				let suppliers = Array.from(store.values()).filter((s) => !s.archived);
				if (search) suppliers = suppliers.filter((s) => s.companyName.toLowerCase().includes(search));
				return { status: 200, body: { suppliers, nextCursor: null, total: suppliers.length } };
			},
		},
		{
			method: "POST",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers/archive$`),
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { supplierIds: string[] };
				for (const id of data.supplierIds) {
					const s = store.get(id);
					if (s) store.set(id, { ...s, archived: true });
				}
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers/unarchive$`),
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { supplierIds: string[] };
				for (const id of data.supplierIds) {
					const s = store.get(id);
					if (s) store.set(id, { ...s, archived: false });
				}
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers/delete$`),
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { supplierIds: string[] };
				for (const id of data.supplierIds) store.delete(id);
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers/send-request$`),
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { supplierIds: string[] };
				const transitioned: string[] = [];
				for (const id of data.supplierIds) {
					const s = store.get(id);
					if (s && s.status === "new") {
						store.set(id, { ...s, status: "кп_запрошено" });
						transitioned.push(id);
					}
				}
				return { status: 200, body: transitioned };
			},
		},
		{
			method: "POST",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers/([^/]+)/select$`),
			respond: ({ url }) => {
				const match = new URL(url, "http://test").pathname.match(/\/suppliers\/([^/]+)\/select$/);
				const id = decodeURIComponent(match?.[1] ?? "");
				if (!store.has(id)) return { status: 404 };
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers/select-by-inn$`),
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { inn: string };
				if (!data.inn) return { status: 400, body: { fieldErrors: { inn: ["required"] } } };
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: new RegExp(`^/api/items/${ITEM_ID}/suppliers/([^/]+)/messages$`),
			respond: ({ url, init }) => {
				const match = new URL(url, "http://test").pathname.match(/\/suppliers\/([^/]+)\/messages$/);
				const id = decodeURIComponent(match?.[1] ?? "");
				const found = store.get(id);
				if (!found) return { status: 404 };
				const data = JSON.parse(init?.body as string) as { body: string };
				if (data.body === "__conflict__") return { status: 409, body: { detail: "rejected" } };
				return {
					status: 201,
					body: { sender: "Агент", timestamp: new Date().toISOString(), body: data.body, isOurs: true },
				};
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
		build: () => createHttpSuppliersClient(http),
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(adapters.map((make) => [make().name, make]))("SuppliersClient contract — %s adapter", (_label, make) => {
	let client: SuppliersClient;

	beforeEach(() => {
		_resetSupplierStore();
		_setSupplierMockDelay(0, 0);
		_resetItemsStore();
		_setItems([ITEM], []);
		client = make().build();
	});

	afterEach(() => {
		_resetSupplierStore();
		_resetItemsStore();
		vi.restoreAllMocks();
	});

	it("listForItem returns the seeded suppliers", async () => {
		const { suppliers } = await client.listForItem(ITEM_ID);
		const ids = suppliers.map((s) => s.id);
		expect(ids).toEqual(expect.arrayContaining(["supplier-x-1", "supplier-x-2", "supplier-x-3"]));
	});

	it("list with filter narrows by search term", async () => {
		const page = await client.list(ITEM_ID, { search: "альф" });
		expect(page.suppliers.map((s) => s.companyName)).toContain("Альфа");
		expect(page.suppliers.every((s) => s.companyName.toLowerCase().includes("альф"))).toBe(true);
	});

	it("get returns the supplier", async () => {
		const s = await client.get(ITEM_ID, "supplier-x-1");
		expect(s?.companyName).toBe("Альфа");
	});

	it("get returns null/throws for missing id (adapter-specific shape)", async () => {
		// The in-memory adapter returns null; the HTTP adapter throws NotFoundError.
		// Both signal "not found" — callers must handle either shape until the contract
		// converges. Tests assert observable not-found, not the exact channel.
		try {
			const s = await client.get(ITEM_ID, "nope");
			expect(s).toBeNull();
		} catch (err) {
			expect(err).toBeInstanceOf(NotFoundError);
		}
	});

	it("archive flips supplier off the default list", async () => {
		await client.archive(ITEM_ID, ["supplier-x-1"]);
		const { suppliers } = await client.list(ITEM_ID, {});
		expect(suppliers.find((s) => s.id === "supplier-x-1")).toBeUndefined();
	});

	it("unarchive restores supplier to the default list", async () => {
		await client.archive(ITEM_ID, ["supplier-x-1"]);
		await client.unarchive(ITEM_ID, ["supplier-x-1"]);
		const { suppliers } = await client.list(ITEM_ID, {});
		expect(suppliers.find((s) => s.id === "supplier-x-1")).toBeDefined();
	});

	it("delete removes suppliers", async () => {
		await client.delete(ITEM_ID, ["supplier-x-1"]);
		const { suppliers } = await client.listForItem(ITEM_ID);
		expect(suppliers.find((s) => s.id === "supplier-x-1")).toBeUndefined();
	});

	it("sendRequest transitions new → кп_запрошено and returns ids touched", async () => {
		const ids = await client.sendRequest(ITEM_ID, ["supplier-x-1", "supplier-x-3"]);
		// supplier-x-3 is already получено_кп, so only supplier-x-1 transitions.
		expect(ids).toEqual(["supplier-x-1"]);
	});

	it("sendMessage appends the message", async () => {
		const msg = await client.sendMessage(ITEM_ID, "supplier-x-1", "Тест");
		expect(msg.body).toBe("Тест");
		expect(msg.isOurs).toBe(true);
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface validation /
 * conflict errors so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	beforeEach(() => {
		_resetItemsStore();
		_setItems([ITEM], []);
		_resetSupplierStore();
		_setSendShouldFail(false);
	});

	it("selectSupplierByInn with empty inn throws ValidationError with fieldErrors", async () => {
		const harness = httpAdapter();
		const client = harness.build();
		try {
			await client.selectSupplierByInn(ITEM_ID, "");
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ inn: ["required"] });
		}
	});

	it("sendMessage with conflict body throws ConflictError", async () => {
		const harness = httpAdapter();
		const client = harness.build();
		await expect(client.sendMessage(ITEM_ID, "supplier-x-1", "__conflict__")).rejects.toBeInstanceOf(ConflictError);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpSuppliersClient(http);
		await expect(client.listForItem(ITEM_ID)).rejects.toMatchObject({ name: "NetworkError" });
	});
});
