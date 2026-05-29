import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, ValidationError } from "../errors";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import { createHttpGeneratedQuestionsClient } from "./generated-questions-http";

/**
 * Adapter contract test for the generated-questions HTTP client. Stubs `fetch`
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
			path: /^\/procurement\/generated-questions\/preview\/$/,
			respond: ({ init }) => {
				const body = JSON.parse(init?.body as string) as { positions?: unknown[] };
				if (!Array.isArray(body.positions) || body.positions.length === 0) {
					return { status: 400, body: { fieldErrors: { positions: ["required"] } } };
				}
				return {
					status: 200,
					body: {
						questions: [
							{ questionText: "Marka materiala?", suggests: ["Standart", "Premium"] },
							{ questionText: "Срочность поставки?", suggests: ["Срочно", "По графику"] },
						],
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
	return { build: () => createHttpGeneratedQuestionsClient(http), track };
}

describe("GeneratedQuestionsClient HTTP contract", () => {
	let adapter: ReturnType<typeof httpAdapter>;

	beforeEach(() => {
		_setMockDelay(0, 0);
		adapter = httpAdapter();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("preview POSTs the camelCase body to /procurement/generated-questions/preview/", async () => {
		const client = adapter.build();
		await client.preview({
			positions: [
				{
					name: "Арматура",
					description: "А500С",
					unit: "шт",
					quantityPerDelivery: 50,
					annualQuantity: 600,
					currentSupplier: {
						companyName: "ООО Поставщик",
						inn: "1234567890",
						deferralDays: 0,
						pricePerUnit: 125.5,
						paymentType: "prepayment",
						deliveryIncluded: false,
						deliveryCost: 1000,
					},
				},
			],
			folderId: "f1",
			additionalInfo: "Срочно",
			deliveryAddressId: "addr-1",
			unloading: "supplier",
			analoguesNotAllowed: false,
		});
		const last = adapter.track.requests.at(-1);
		expect(last?.method).toBe("POST");
		expect(last?.path).toBe("/procurement/generated-questions/preview/");
		expect(last?.body).toEqual({
			positions: [
				{
					name: "Арматура",
					description: "А500С",
					unit: "шт",
					quantityPerDelivery: 50,
					annualQuantity: 600,
					currentSupplier: {
						companyName: "ООО Поставщик",
						inn: "1234567890",
						deferralDays: 0,
						pricePerUnit: 125.5,
						paymentType: "prepayment",
						deliveryIncluded: false,
						deliveryCost: 1000,
					},
				},
			],
			folderId: "f1",
			additionalInfo: "Срочно",
			deliveryAddressId: "addr-1",
			unloading: "supplier",
			analoguesNotAllowed: false,
		});
	});

	it("preview returns the parsed questions array", async () => {
		const client = adapter.build();
		const result = await client.preview({ positions: [{ name: "Арматура" }] });
		expect(result.questions).toHaveLength(2);
		expect(result.questions[0]).toEqual({ questionText: "Marka materiala?", suggests: ["Standart", "Premium"] });
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
		const client = createHttpGeneratedQuestionsClient(http);
		await expect(client.preview({ positions: [{ name: "X" }] })).rejects.toBeInstanceOf(AuthError);
	});

	it("preview network failures bubble up as NetworkError", async () => {
		const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => null });
		const client = createHttpGeneratedQuestionsClient(http);
		await expect(client.preview({ positions: [{ name: "X" }] })).rejects.toMatchObject({ name: "NetworkError" });
	});
});
