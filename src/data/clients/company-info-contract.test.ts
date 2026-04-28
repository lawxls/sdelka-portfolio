import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyInfo } from "../domains/company-info";
import { NetworkError, NotFoundError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { CompanyInfoClient } from "./company-info-client";
import { createHttpCompanyInfoClient } from "./company-info-http";
import { createInMemoryCompanyInfoClient } from "./company-info-in-memory";

/**
 * Layer B — adapter contract tests. The same suite runs once against the
 * in-memory adapter and once against the HTTP adapter (with `fetch` stubbed at
 * the network layer). Both runs assert identical observable behavior so the
 * adapters are interchangeable from a hook's point of view.
 *
 * Company-info is a single-row read-only domain — only `get()` returning
 * `{ name }`. No list, no detail, no mutations.
 */

const SEED_INFO: CompanyInfo = { name: "Acme Workspace" };

interface Adapter {
	name: string;
	build: () => CompanyInfoClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryCompanyInfoClient({ info: { ...SEED_INFO } }),
	};
}

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

function httpAdapter(): Adapter {
	let info: CompanyInfo = { ...SEED_INFO };

	const routes: HttpRoute[] = [
		{
			method: "GET",
			path: /^\/api\/workspace\/company-info$/,
			respond: () => ({ status: 200, body: info }),
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
			info = { ...SEED_INFO };
			return createHttpCompanyInfoClient(http);
		},
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(
	adapters.map((make) => [make().name, make]),
)("CompanyInfoClient contract — %s adapter", (_label, make) => {
	let client: CompanyInfoClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("get returns the seeded workspace identity", async () => {
		const result = await client.get();
		expect(result).toEqual(SEED_INFO);
	});
});

/**
 * HTTP-only error branches. The in-memory adapter never errors on `get()`
 * (it just reads the singleton), so these branches run only against HTTP.
 */
describe("HTTP-only error branches", () => {
	it("404 on unknown workspace surfaces as NotFoundError", async () => {
		const fetchStub = vi.fn(
			async () =>
				new Response(JSON.stringify({ detail: "workspace not found" }), {
					status: 404,
					headers: { "content-type": "application/json" },
				}),
		);
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => "test-token" });
		const client = createHttpCompanyInfoClient(http);
		await expect(client.get()).rejects.toBeInstanceOf(NotFoundError);
	});

	it("network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpCompanyInfoClient(http);
		await expect(client.get()).rejects.toBeInstanceOf(NetworkError);
	});
});
