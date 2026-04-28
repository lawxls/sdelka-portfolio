import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NetworkError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { Notification } from "../notification-types";
import type { NotificationsClient } from "./notifications-client";
import { createHttpNotificationsClient } from "./notifications-http";
import { createInMemoryNotificationsClient } from "./notifications-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Notifications' list shape is `NotificationsResponse` (a flat snapshot plus
 * read-id set) — not `CursorPage<T>`. The session-only read state in the
 * in-memory adapter is exposed through the same surface the HTTP backend
 * persists per-user.
 */

const SEED: Notification[] = [
	{ id: "n1", type: "task_assigned", taskId: "task-1", createdAt: "2026-04-22T12:00:00.000Z" },
	{ id: "n2", type: "search_completed", itemId: "item-1", createdAt: "2026-04-22T11:00:00.000Z" },
	{ id: "n3", type: "offer_received", itemId: "item-1", supplierId: "s-1", createdAt: "2026-04-22T10:00:00.000Z" },
];

interface Adapter {
	name: string;
	build: () => NotificationsClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryNotificationsClient({ seed: SEED.map((n) => ({ ...n })) }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	const list = SEED.map((n) => ({ ...n }));
	const readIds = new Set<string>();

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/api\/notifications$/,
			respond: () => ({
				status: 200,
				body: {
					notifications: list.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
					readIds: [...readIds],
				},
			}),
		},
		{
			method: "POST",
			path: /^\/api\/notifications\/([^/]+)\/read$/,
			respond: ({ url }) => {
				const path = new URL(url, "http://test").pathname;
				const id = decodeURIComponent(path.split("/").slice(-2)[0] ?? "");
				if (id === "__conflict__") return { status: 409, body: { detail: "already processed" } };
				if (id === "__validation__") return { status: 400, body: { fieldErrors: { id: ["invalid"] } } };
				if (!list.some((n) => n.id === id)) return { status: 404 };
				readIds.add(id);
				return { status: 204 };
			},
		},
		{
			method: "POST",
			path: /^\/api\/notifications\/read-all$/,
			respond: () => {
				for (const n of list) readIds.add(n.id);
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
		build: () => createHttpNotificationsClient(http),
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(
	adapters.map((make) => [make().name, make]),
)("NotificationsClient contract — %s adapter", (_label, make) => {
	let client: NotificationsClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("list returns the seeded notifications, sorted desc by createdAt", async () => {
		const { notifications } = await client.list();
		expect(notifications.map((n) => n.id)).toEqual(["n1", "n2", "n3"]);
	});

	it("list starts with no read ids", async () => {
		const { readIds } = await client.list();
		expect(readIds).toEqual([]);
	});

	it("markAsRead adds the id to the read set for that notification only", async () => {
		await client.markAsRead("n1");
		const { readIds } = await client.list();
		expect(readIds).toContain("n1");
		expect(readIds).not.toContain("n2");
	});

	it("markAsRead is idempotent", async () => {
		await client.markAsRead("n1");
		await client.markAsRead("n1");
		const { readIds } = await client.list();
		expect(readIds.filter((id) => id === "n1")).toHaveLength(1);
	});

	it("markAllAsRead marks every current notification as read", async () => {
		await client.markAllAsRead();
		const { readIds } = await client.list();
		expect(new Set(readIds)).toEqual(new Set(["n1", "n2", "n3"]));
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface validation /
 * conflict / not-found errors so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	it("markAsRead with unknown id throws NotFoundError", async () => {
		const client = httpAdapter().build();
		await expect(client.markAsRead("missing")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("markAsRead with conflict response throws ConflictError", async () => {
		const client = httpAdapter().build();
		await expect(client.markAsRead("__conflict__")).rejects.toBeInstanceOf(ConflictError);
	});

	it("markAsRead with validation response throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter().build();
		try {
			await client.markAsRead("__validation__");
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ id: ["invalid"] });
		}
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpNotificationsClient(http);
		await expect(client.list()).rejects.toBeInstanceOf(NetworkError);
	});
});
