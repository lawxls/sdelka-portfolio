import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { fetchCompanyInfo, parseDecimals, validateCode } from "./api-client";
import { setToken } from "./auth";

function mockHostname(hostname: string) {
	vi.spyOn(window, "location", "get").mockReturnValue({
		...window.location,
		hostname,
	});
}

beforeEach(() => {
	mockHostname("acme.localhost");
});

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("parseDecimals", () => {
	it("converts string decimal fields to numbers", () => {
		const input = {
			currentPrice: "123.45",
			bestPrice: "99.00",
			averagePrice: "110.50",
			totalOverpayment: "500.00",
			totalSavings: "200.00",
			totalDeviation: "15.30",
		};
		const result = parseDecimals(input);
		expect(result).toEqual({
			currentPrice: 123.45,
			bestPrice: 99,
			averagePrice: 110.5,
			totalOverpayment: 500,
			totalSavings: 200,
			totalDeviation: 15.3,
		});
	});

	it("preserves null values", () => {
		const input = { bestPrice: null, averagePrice: null, name: "test" };
		const result = parseDecimals(input);
		expect(result).toEqual({ bestPrice: null, averagePrice: null, name: "test" });
	});

	it("preserves non-decimal fields", () => {
		const input = { name: "Widget", status: "searching", id: "uuid-1" };
		const result = parseDecimals(input);
		expect(result).toEqual({ name: "Widget", status: "searching", id: "uuid-1" });
	});

	it("handles nested items array", () => {
		const input = {
			items: [
				{ currentPrice: "10.00", bestPrice: null, name: "A" },
				{ currentPrice: "20.50", bestPrice: "15.00", name: "B" },
			],
		};
		const result = parseDecimals(input);
		expect(result).toEqual({
			items: [
				{ currentPrice: 10, bestPrice: null, name: "A" },
				{ currentPrice: 20.5, bestPrice: 15, name: "B" },
			],
		});
	});
});

describe("validateCode", () => {
	it("sends code to POST /api/v1/company/validate-code with X-Tenant header", async () => {
		let capturedHeaders: Headers | undefined;
		let capturedBody: unknown;

		server.use(
			http.post("/api/v1/company/validate-code", async ({ request }) => {
				capturedHeaders = request.headers;
				capturedBody = await request.json();
				return HttpResponse.json({ token: "eyJ.test.jwt" });
			}),
		);

		const result = await validateCode("ABC12");
		expect(capturedHeaders?.get("X-Tenant")).toBe("acme");
		expect(capturedHeaders?.get("Content-Type")).toBe("application/json");
		expect(capturedBody).toEqual({ code: "ABC12" });
		expect(result).toEqual({ token: "eyJ.test.jwt" });
	});

	it("throws on 401 response", async () => {
		server.use(
			http.post("/api/v1/company/validate-code", () => {
				return HttpResponse.json({ detail: "Invalid credentials." }, { status: 401 });
			}),
		);

		await expect(validateCode("wrong")).rejects.toThrow();
	});

	it("does not send Authorization header", async () => {
		let capturedHeaders: Headers | undefined;

		server.use(
			http.post("/api/v1/company/validate-code", ({ request }) => {
				capturedHeaders = request.headers;
				return HttpResponse.json({ token: "eyJ.test.jwt" });
			}),
		);

		setToken("existing-token");
		await validateCode("ABC12");
		expect(capturedHeaders?.get("Authorization")).toBeNull();
	});
});

describe("fetchCompanyInfo", () => {
	it("sends GET /api/v1/company/info/ with auth headers", async () => {
		let capturedHeaders: Headers | undefined;

		server.use(
			http.get("/api/v1/company/info/", ({ request }) => {
				capturedHeaders = request.headers;
				return HttpResponse.json({ name: "Acme Corp" });
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await fetchCompanyInfo();
		expect(capturedHeaders?.get("X-Tenant")).toBe("acme");
		expect(capturedHeaders?.get("Authorization")).toBe("Bearer eyJ.test.jwt");
		expect(result).toEqual({ name: "Acme Corp" });
	});

	it("clears token on 401 response", async () => {
		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ detail: "Invalid credentials." }, { status: 401 });
			}),
		);

		setToken("expired-token");
		await expect(fetchCompanyInfo()).rejects.toThrow();
		expect(localStorage.getItem("auth-token")).toBeNull();
	});
});
