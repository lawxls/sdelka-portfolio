import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkError, NotFoundError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { InvitationsClient } from "./invitations-client";
import { createHttpInvitationsClient } from "./invitations-http";
import { createInMemoryInvitationsClient } from "./invitations-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Invitations is a small surface — only `verify(code)`. No list, no detail.
 * Pure lookup-by-code lifecycle between creation (workspace-employees) and
 * acceptance (auth registration).
 */

interface Adapter {
	name: string;
	build: () => InvitationsClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		// Treat an empty code as invalid so both adapters agree on the
		// "missing-code" branch even though the legacy mock was always-valid.
		build: () => createInMemoryInvitationsClient({ isValid: (code) => code !== "" && code !== "BAD" }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	const routes: HttpRoute[] = [
		{
			method: "POST",
			path: /^\/api\/invitations\/verify$/,
			respond: ({ init }) => {
				const data = JSON.parse(init?.body as string) as { code: string };
				if (data.code === "") return { status: 400, body: { fieldErrors: { code: ["required"] } } };
				if (data.code === "__missing__") return { status: 404, body: { detail: "invitation not found" } };
				if (data.code === "BAD") return { status: 200, body: { valid: false } };
				return { status: 200, body: { valid: true } };
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
		build: () => createHttpInvitationsClient(http),
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(
	adapters.map((make) => [make().name, make]),
)("InvitationsClient contract — %s adapter", (_label, make) => {
	let client: InvitationsClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("verify returns valid: true for a known-good code", async () => {
		const result = await client.verify("ABC12");
		expect(result).toEqual({ valid: true });
	});

	it("verify returns valid: false for a code the backend rejects", async () => {
		const result = await client.verify("BAD");
		expect(result).toEqual({ valid: false });
	});
});

/**
 * HTTP-only error branches. The in-memory adapter does not surface validation /
 * not-found errors — `verify` always resolves with a boolean — so these branches
 * are exercised against the HTTP adapter only.
 */
describe("HTTP-only error branches", () => {
	it("verify with empty code throws ValidationError with fieldErrors", async () => {
		const client = httpAdapter().build();
		try {
			await client.verify("");
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ code: ["required"] });
		}
	});

	it("verify against an unknown code throws NotFoundError", async () => {
		const client = httpAdapter().build();
		await expect(client.verify("__missing__")).rejects.toBeInstanceOf(NotFoundError);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpInvitationsClient(http);
		await expect(client.verify("ABC12")).rejects.toBeInstanceOf(NetworkError);
	});
});
