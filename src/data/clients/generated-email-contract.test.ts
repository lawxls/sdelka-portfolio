import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import { createHttpGeneratedEmailClient } from "./generated-email-http";

/**
 * Adapter contract test for the generated-email HTTP client. Stubs `fetch`
 * and asserts the preview endpoint round-trips, including auth/validation
 * error mapping.
 */

interface HttpRoute {
	method: string;
	path: RegExp;
	respond: (req: { url: string; init?: RequestInit }) => { status: number; body?: unknown };
}

interface HttpAdapterTrack {
	requests: Array<{ method: string; path: string; body?: unknown }>;
}

function httpAdapter() {
	const track: HttpAdapterTrack = { requests: [] };

	const routes: HttpRoute[] = [
		{
			method: "POST",
			path: /^\/procurement\/generated-email\/preview\/$/,
			respond: ({ init }) => {
				const body = JSON.parse(init?.body as string) as { positions?: unknown[] };
				if (!Array.isArray(body.positions) || body.positions.length === 0) {
					return { status: 400, body: { fieldErrors: { positions: ["required"] } } };
				}
				return {
					status: 200,
					body: {
						subject: "Запрос КП — Арматура",
						body: "Здравствуйте!\nПросим направить КП.\nСпасибо!",
					},
				};
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
	return { build: () => createHttpGeneratedEmailClient(http), track };
}

describe("GeneratedEmailClient HTTP contract", () => {
	let adapter: ReturnType<typeof httpAdapter>;

	beforeEach(() => {
		_setMockDelay(0, 0);
		adapter = httpAdapter();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("preview POSTs the camelCase body to /procurement/generated-email/preview/", async () => {
		const client = adapter.build();
		await client.preview({
			positions: [{ name: "Арматура", description: "А500С", unit: "шт", quantityPerDelivery: 50 }],
			folderId: "f1",
			folderName: "Металлопрокат",
			deadline: "2026-06-15",
			cashAllowed: true,
			analoguesNotAllowed: false,
			generatedQuestions: [{ questionText: "Срок?", suggests: ["Срочно", "По графику"], answer: "Срочно" }],
			regenerateIndex: 1,
		});
		const last = adapter.track.requests.at(-1);
		expect(last?.method).toBe("POST");
		expect(last?.path).toBe("/procurement/generated-email/preview/");
		expect(last?.body).toEqual({
			positions: [{ name: "Арматура", description: "А500С", unit: "шт", quantityPerDelivery: 50 }],
			folderId: "f1",
			folderName: "Металлопрокат",
			deadline: "2026-06-15",
			cashAllowed: true,
			analoguesNotAllowed: false,
			generatedQuestions: [{ questionText: "Срок?", suggests: ["Срочно", "По графику"], answer: "Срочно" }],
			regenerateIndex: 1,
		});
	});

	it("preview returns the parsed subject and body", async () => {
		const client = adapter.build();
		const result = await client.preview({ positions: [{ name: "Арматура" }] });
		expect(result.subject).toBe("Запрос КП — Арматура");
		expect(result.body).toContain("Спасибо!");
	});

	it("preview surfaces ValidationError on 400 with fieldErrors", async () => {
		const client = adapter.build();
		try {
			await client.preview({ positions: [] });
			throw new Error("expected throw");
		} catch (err) {
			expect(err).toBeInstanceOf(ValidationError);
			expect((err as ValidationError).fieldErrors).toEqual({ positions: ["required"] });
		}
	});

	it("preview surfaces AuthError on 401", async () => {
		const fetchStub = vi.fn(async () => new Response(null, { status: 401 }));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpGeneratedEmailClient(http);
		await expect(client.preview({ positions: [{ name: "X" }] })).rejects.toBeInstanceOf(AuthError);
	});

	it("preview network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpGeneratedEmailClient(http);
		await expect(client.preview({ positions: [{ name: "X" }] })).rejects.toMatchObject({ name: "NetworkError" });
	});
});
