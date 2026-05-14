import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Subscription } from "../domains/subscription";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { SubscriptionClient } from "./subscription-client";
import { createHttpSubscriptionClient } from "./subscription-http";
import { createInMemorySubscriptionClient } from "./subscription-in-memory";

/**
 * Layer B — adapter contract for the subscription domain. The in-memory and
 * HTTP adapters must be observably interchangeable from a hook's perspective.
 * Subscription is a single-row domain like profile; `current` returns the
 * active workspace snapshot, `topUp` purchases extra requests.
 */

const SEED: Subscription = {
	tariff_id: "business",
	tariff_name: "Бизнес",
	requests_used: 12,
	requests_limit: 15,
	employees_used: 3,
	employees_limit: 5,
	emails_sent: 184,
	emails_limit: 500,
};

interface Adapter {
	name: string;
	build: () => SubscriptionClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemorySubscriptionClient({ subscription: { ...SEED } }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	let snapshot: Subscription = { ...SEED };

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/billing\/subscription\/$/,
			respond: () => ({ status: 200, body: snapshot }),
		},
		{
			method: "POST",
			path: /^\/billing\/subscription\/top-up\/$/,
			respond: ({ init }) => {
				const { quantity } = JSON.parse(init?.body as string) as { quantity: number };
				snapshot = { ...snapshot, requests_limit: snapshot.requests_limit + quantity };
				return {
					status: 200,
					body: {
						requests_added: quantity,
						requests_limit: snapshot.requests_limit,
						total_price: quantity * 2_900,
					},
				};
			},
		},
	];

	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		const method = init?.method ?? "GET";
		const path = new URL(input, "http://test").pathname + new URL(input, "http://test").search;
		const route = routes.find((r) => r.method === method && r.path.test(path));
		if (!route) throw new Error(`Unmatched ${method} ${input}`);
		const result = await route.respond({ url: input, init });
		const hasBody = result.body !== undefined && result.status !== 204;
		return new Response(hasBody ? JSON.stringify(result.body) : null, {
			status: result.status,
			headers: hasBody ? { "content-type": "application/json" } : undefined,
		});
	});

	const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => "test-token" });

	return {
		name: "http",
		build: () => {
			snapshot = { ...SEED };
			return createHttpSubscriptionClient(http);
		},
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(
	adapters.map((make) => [make().name, make]),
)("SubscriptionClient contract — %s adapter", (_label, make) => {
	let client: SubscriptionClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("current returns the seeded subscription snapshot", async () => {
		const snap = await client.current();
		expect(snap).toEqual(SEED);
	});

	it("topUp raises the requests_limit and returns the delta", async () => {
		const result = await client.topUp({ quantity: 3 });
		expect(result.requests_added).toBe(3);
		expect(result.requests_limit).toBe(SEED.requests_limit + 3);
		expect(result.total_price).toBeGreaterThan(0);

		const re = await client.current();
		expect(re.requests_limit).toBe(SEED.requests_limit + 3);
		expect(re.requests_used).toBe(SEED.requests_used);
	});
});
