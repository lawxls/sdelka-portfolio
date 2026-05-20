import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Tariff } from "../domains/tariffs";
import { createHttpClient } from "../http-client";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { TariffsClient } from "./tariffs-client";
import { createHttpTariffsClient } from "./tariffs-http";
import { createInMemoryTariffsClient } from "./tariffs-in-memory";

/**
 * Layer B — adapter contract for the tariffs catalog. Both adapters must serve
 * the same shape: prices as numbers (HTTP parses the DRF decimal string),
 * features ordered by `position`, results sorted by `displayOrder`. The HTTP
 * adapter reads camelCase keys produced by `djangorestframework-camel-case`.
 */

const SEED: Tariff[] = [
	{
		id: "id-start",
		slug: "start",
		name: "Старт",
		shortDescription: "",
		fullDescription: "",
		priceType: "fixed",
		price: 19_900,
		yearlyPrice: 199_900,
		yearlyPriceDiscount: 16,
		monthlyInquiryLimit: 5,
		dailyInquiryLimit: null,
		inquiriesPerMonth: 5,
		inquiriesPerYear: 65,
		maxEmployees: 2,
		maxCompanies: 1,
		dailyEmailLimit: 300,
		isPopular: false,
		displayOrder: 10,
		features: [
			{ position: 1, name: "Поиск поставщиков" },
			{ position: 2, name: "Генерация и рассылка RFQ" },
		],
	},
	{
		id: "id-enterprise",
		slug: "enterprise",
		name: "Корпорация",
		shortDescription: "Стоимость и лимиты под объём вашей закупочной функции",
		fullDescription: "",
		priceType: "individual",
		price: null,
		yearlyPrice: null,
		yearlyPriceDiscount: 0,
		monthlyInquiryLimit: null,
		dailyInquiryLimit: null,
		inquiriesPerMonth: null,
		inquiriesPerYear: null,
		maxEmployees: null,
		maxCompanies: null,
		dailyEmailLimit: null,
		isPopular: false,
		displayOrder: 30,
		features: [{ position: 1, name: "Индивидуальные лимиты" }],
	},
];

interface Adapter {
	name: string;
	build: () => TariffsClient;
}

function memoryAdapter(): Adapter {
	return {
		name: "memory",
		build: () => createInMemoryTariffsClient({ tariffs: SEED.map((t) => ({ ...t, features: [...t.features] })) }),
	};
}

function httpAdapter(): Adapter {
	const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
		const method = init?.method ?? "GET";
		const path = new URL(input, "http://test").pathname;
		if (method !== "GET" || !/^\/tariffs\/$/.test(path)) {
			throw new Error(`Unmatched ${method} ${input}`);
		}
		const body = SEED.map((t) => ({
			...t,
			price: t.price === null ? null : t.price.toFixed(2),
			yearlyPrice: t.yearlyPrice === null ? null : t.yearlyPrice.toFixed(2),
		}));
		return new Response(JSON.stringify(body), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	});

	const http = createHttpClient({ baseUrl: "", fetch: fetchStub, getToken: () => "test-token" });

	return {
		name: "http",
		build: () => createHttpTariffsClient(http),
	};
}

const adapters: Array<() => Adapter> = [() => memoryAdapter(), () => httpAdapter()];

describe.each(adapters.map((make) => [make().name, make]))("TariffsClient contract — %s adapter", (_label, make) => {
	let client: TariffsClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = make().build();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("list returns the seeded tariffs ordered by displayOrder", async () => {
		const tariffs = await client.list();
		expect(tariffs.map((t) => t.slug)).toEqual(["start", "enterprise"]);
	});

	it("parses decimal prices to numbers and preserves null prices", async () => {
		const tariffs = await client.list();
		const start = tariffs.find((t) => t.slug === "start");
		const enterprise = tariffs.find((t) => t.slug === "enterprise");
		expect(start?.price).toBe(19_900);
		expect(start?.yearlyPrice).toBe(199_900);
		expect(enterprise?.price).toBeNull();
		expect(enterprise?.yearlyPrice).toBeNull();
	});

	it("returns feature lists for each tariff", async () => {
		const tariffs = await client.list();
		const start = tariffs.find((t) => t.slug === "start");
		expect(start?.features.map((f) => f.name)).toEqual(["Поиск поставщиков", "Генерация и рассылка RFQ"]);
	});

	it("returns inquiriesPerMonth and inquiriesPerYear distinctly from the quota limit", async () => {
		const tariffs = await client.list();
		const start = tariffs.find((t) => t.slug === "start");
		expect(start?.inquiriesPerMonth).toBe(5);
		expect(start?.inquiriesPerYear).toBe(65);
		const enterprise = tariffs.find((t) => t.slug === "enterprise");
		expect(enterprise?.inquiriesPerMonth).toBeNull();
		expect(enterprise?.inquiriesPerYear).toBeNull();
	});

	it("preserves shortDescription on individual-price tariffs", async () => {
		const tariffs = await client.list();
		const enterprise = tariffs.find((t) => t.slug === "enterprise");
		expect(enterprise?.shortDescription).toBe("Стоимость и лимиты под объём вашей закупочной функции");
	});
});
