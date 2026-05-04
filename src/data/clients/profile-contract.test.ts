import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentEmployee } from "../domains/profile";
import { NetworkError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { ProfileClient } from "./profile-client";
import { createHttpProfileClient } from "./profile-http";
import { createInMemoryProfileClient } from "./profile-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Profile is a single-row domain — `me` and `update` both operate on the
 * active session's user record via `/users/me/`. Password changes live on
 * `SessionClient.requestPasswordChange` (email-link flow); see the session
 * contract test.
 */

const SEED_ME: CurrentEmployee = {
	id: 7,
	email: "ivan@example.com",
	first_name: "Иван",
	last_name: "Иванов",
	patronymic: "Иванович",
	phone: "+79991234567",
	avatar_icon: "blue",
	mailing_allowed: true,
	date_joined: "2024-01-15T10:00:00Z",
	role: "admin",
};

interface Adapter {
	name: string;
	build: () => ProfileClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryProfileClient({ me: { ...SEED_ME } }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	let me: CurrentEmployee = { ...SEED_ME };

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/users\/me\/$/,
			respond: () => ({ status: 200, body: me }),
		},
		{
			method: "PATCH",
			path: /^\/users\/me\/$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as Partial<CurrentEmployee>;
				if (data.first_name === "__validation__") {
					return { status: 400, body: { fieldErrors: { first_name: ["invalid"] } } };
				}
				me = { ...me, ...data };
				return { status: 200, body: me };
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
			me = { ...SEED_ME };
			return createHttpProfileClient(http);
		},
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(adapters.map((make) => [make().name, make]))("ProfileClient contract — %s adapter", (_label, make) => {
	let client: ProfileClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("me returns the seeded current employee with full identity + role", async () => {
		const me = await client.me();
		expect(me).toEqual(SEED_ME);
	});

	it("update merges the patch and returns the updated employee", async () => {
		const updated = await client.update({ first_name: "Пётр", mailing_allowed: false });
		expect(updated.first_name).toBe("Пётр");
		expect(updated.last_name).toBe(SEED_ME.last_name);
		expect(updated.mailing_allowed).toBe(false);
		expect(updated.role).toBe(SEED_ME.role);
	});

	it("update + me roundtrip — patch persists on subsequent reads", async () => {
		await client.update({ phone: "+71112223344" });
		const re = await client.me();
		expect(re.phone).toBe("+71112223344");
		expect(re.email).toBe(SEED_ME.email);
	});
});

/**
 * HTTP-only error branches. The in-memory adapter doesn't surface validation
 * errors so they're tested only against the HTTP adapter.
 */
describe("HTTP-only error branches", () => {
	it("update with sentinel name throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter().build();
		try {
			await client.update({ first_name: "__validation__" });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ first_name: ["invalid"] });
		}
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpProfileClient(http);
		await expect(client.me()).rejects.toBeInstanceOf(NetworkError);
	});
});
