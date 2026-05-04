import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, NetworkError, TooManyRequestsError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetIdCounter, _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { SessionClient } from "./session-client";
import { createHttpSessionClient } from "./session-http";
import { createInMemorySessionClient } from "./session-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Session is a small surface — only `login` and `refresh` ship in this slice.
 * The adapter behavior covered: login success returns access + user; login
 * with bad credentials throws AuthError(401); login with unverified email
 * throws AuthError(403); refresh returns a fresh access; refresh with no
 * valid cookie throws AuthError; throttled responses throw
 * TooManyRequestsError with parsed `Retry-After`.
 */

const SEED_USERS = [
	{
		email: "valid@example.com",
		password: "good-pass",
		user: { id: 7, email: "valid@example.com" },
	},
	{
		email: "unverified@example.com",
		password: "good-pass",
		user: { id: 8, email: "unverified@example.com" },
		verified: false,
	},
];

interface Adapter {
	name: string;
	build: () => SessionClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemorySessionClient({ users: SEED_USERS, refreshAvailable: true }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => {
		status: number;
		body?: unknown;
		headers?: Record<string, string>;
	};
}

function httpAdapter(): Adapter {
	let refreshCount = 0;

	const routes: HttpRoute[] = [
		{
			method: "POST",
			path: /^\/auth\/login\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { email: string; password: string };
				if (data.email === "throttled@example.com") {
					return { status: 429, body: { detail: "throttled" }, headers: { "retry-after": "60" } };
				}
				const seed = SEED_USERS.find((u) => u.email === data.email && u.password === data.password);
				if (!seed) return { status: 401, body: { code: "invalid_credentials" } };
				if (seed.verified === false) return { status: 403, body: { code: "email_not_verified" } };
				return { status: 200, body: { access: `access-${seed.user.id}`, user: seed.user } };
			},
		},
		{
			method: "POST",
			path: /^\/auth\/refresh\/$/,
			respond: () => {
				refreshCount += 1;
				return { status: 200, body: { access: `access-refresh-${refreshCount}` } };
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
		const headers = {
			...(hasBody ? { "content-type": "application/json" } : {}),
			...(result.headers ?? {}),
		};
		return new Response(hasBody ? JSON.stringify(result.body) : null, { status: result.status, headers });
	});

	const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null, getCsrfToken: () => null });

	return {
		name: "http",
		build: () => {
			refreshCount = 0;
			return createHttpSessionClient(http);
		},
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(adapters.map((make) => [make().name, make]))("SessionClient contract — %s adapter", (_label, make) => {
	let client: SessionClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		_resetIdCounter();
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("login returns access and the user record on the happy path", async () => {
		const result = await client.login({ email: "valid@example.com", password: "good-pass" });
		expect(result.user.email).toBe("valid@example.com");
		expect(result.user.id).toBe(7);
		expect(typeof result.access).toBe("string");
		expect(result.access.length).toBeGreaterThan(0);
	});

	it("login with bad credentials throws AuthError(401)", async () => {
		try {
			await client.login({ email: "valid@example.com", password: "wrong" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(401);
		}
	});

	it("login with unverified email throws AuthError(403)", async () => {
		try {
			await client.login({ email: "unverified@example.com", password: "good-pass" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(403);
		}
	});

	it("refresh returns a fresh access token when the session is valid", async () => {
		const result = await client.refresh();
		expect(typeof result.access).toBe("string");
		expect(result.access.length).toBeGreaterThan(0);
	});

	it("two refreshes return distinct access tokens", async () => {
		const a = await client.refresh();
		const b = await client.refresh();
		expect(a.access).not.toBe(b.access);
	});
});

/**
 * In-memory-only branches: the in-memory adapter exposes a "no refresh
 * available" mode that the HTTP path can't easily simulate without baking
 * stateful cookie handling into the fake server.
 */
describe("InMemorySessionClient — refresh-unavailable branch", () => {
	beforeEach(() => {
		_setMockDelay(0, 0);
		_resetIdCounter();
	});

	afterEach(() => {
		_resetMockDelay();
	});

	it("refresh throws AuthError(401) when no refresh cookie is available", async () => {
		const client = createInMemorySessionClient({ users: SEED_USERS, refreshAvailable: false });
		try {
			await client.refresh();
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(AuthError);
			expect((err as AuthError).status).toBe(401);
		}
	});

	it("login flips refresh-available so the next refresh succeeds", async () => {
		const client = createInMemorySessionClient({ users: SEED_USERS, refreshAvailable: false });
		await client.login({ email: "valid@example.com", password: "good-pass" });
		const result = await client.refresh();
		expect(typeof result.access).toBe("string");
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface throttling
 * or network-level errors — those branches only fire against the HTTP path.
 */
describe("HTTP-only error branches", () => {
	it("login against a throttled endpoint throws TooManyRequestsError with parsed retryAfter", async () => {
		const client = httpAdapter().build();
		try {
			await client.login({ email: "throttled@example.com", password: "anything" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(TooManyRequestsError);
			expect((err as TooManyRequestsError).retryAfter).toBe(60);
		}
	});

	it("refresh against a 401 backend throws AuthError without triggering the interceptor", async () => {
		const fetchStub = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ code: "refresh_invalid" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			}),
		);
		// refresh callback would loop without skipRefresh; assert it's never invoked.
		const refreshCallback = vi.fn();
		const http = createHttpClient({
			baseUrl: "",
			fetch: fetchStub,
			getToken: () => null,
			getCsrfToken: () => null,
			refresh: refreshCallback,
		});
		const client = createHttpSessionClient(http);

		await expect(client.refresh()).rejects.toBeInstanceOf(AuthError);
		expect(refreshCallback).not.toHaveBeenCalled();
		expect(fetchStub).toHaveBeenCalledTimes(1);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null, getCsrfToken: () => null });
		const client = createHttpSessionClient(http);
		await expect(client.login({ email: "a", password: "b" })).rejects.toBeInstanceOf(NetworkError);
	});
});
