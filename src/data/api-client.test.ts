import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { mockHostname } from "@/test-utils";
import {
	createFolder,
	createItemsBatch,
	deleteFolder,
	deleteItem,
	fetchCompanyInfo,
	fetchFolderStats,
	fetchFolders,
	fetchItems,
	fetchTotals,
	parseDecimals,
	updateFolder,
	updateItem,
	validateCode,
} from "./api-client";
import { setToken } from "./auth";

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

describe("fetchFolders", () => {
	it("sends GET /api/v1/company/folders/ with auth headers", async () => {
		let capturedHeaders: Headers | undefined;
		const folders = [{ id: "f1", name: "Test", color: "blue" }];

		server.use(
			http.get("/api/v1/company/folders/", ({ request }) => {
				capturedHeaders = request.headers;
				return HttpResponse.json({ folders });
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await fetchFolders();
		expect(capturedHeaders?.get("X-Tenant")).toBe("acme");
		expect(capturedHeaders?.get("Authorization")).toBe("Bearer eyJ.test.jwt");
		expect(result).toEqual({ folders });
	});
});

describe("fetchFolderStats", () => {
	it("sends GET /api/v1/company/folders/stats with auth headers", async () => {
		const stats = [
			{ folderId: "f1", itemCount: 10 },
			{ folderId: null, itemCount: 5 },
		];

		server.use(
			http.get("/api/v1/company/folders/stats", () => {
				return HttpResponse.json({ stats });
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await fetchFolderStats();
		expect(result).toEqual({ stats });
	});
});

describe("createFolder", () => {
	it("sends POST /api/v1/company/folders/ with name and color", async () => {
		let capturedBody: unknown;

		server.use(
			http.post("/api/v1/company/folders/", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ id: "new-id", name: "Test", color: "blue" }, { status: 201 });
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await createFolder({ name: "Test", color: "blue" });
		expect(capturedBody).toEqual({ name: "Test", color: "blue" });
		expect(result).toEqual({ id: "new-id", name: "Test", color: "blue" });
	});

	it("throws on 400 (duplicate name)", async () => {
		server.use(
			http.post("/api/v1/company/folders/", () => {
				return HttpResponse.json({ name: ["Folder with this name already exists."] }, { status: 400 });
			}),
		);

		setToken("eyJ.test.jwt");
		await expect(createFolder({ name: "Dup", color: "red" })).rejects.toThrow();
	});
});

describe("updateFolder", () => {
	it("sends PATCH /api/v1/company/folders/:id/ with partial data", async () => {
		let capturedBody: unknown;

		server.use(
			http.patch("/api/v1/company/folders/:id/", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({ id: "f1", name: "Renamed", color: "blue" });
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await updateFolder("f1", { name: "Renamed" });
		expect(capturedBody).toEqual({ name: "Renamed" });
		expect(result).toEqual({ id: "f1", name: "Renamed", color: "blue" });
	});
});

describe("deleteFolder", () => {
	it("sends DELETE /api/v1/company/folders/:id/ and returns void", async () => {
		let capturedMethod: string | undefined;

		server.use(
			http.delete("/api/v1/company/folders/:id/", ({ request }) => {
				capturedMethod = request.method;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await deleteFolder("f1");
		expect(capturedMethod).toBe("DELETE");
		expect(result).toBeUndefined();
	});
});

describe("fetchItems", () => {
	it("sends GET /api/v1/company/items/ with query params and auth headers", async () => {
		let capturedHeaders: Headers | undefined;
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/", ({ request }) => {
				capturedHeaders = request.headers;
				capturedUrl = request.url;
				return HttpResponse.json({
					items: [
						{
							id: "i1",
							name: "Widget",
							status: "searching",
							annualQuantity: 100,
							currentPrice: "50.00",
							bestPrice: "40.00",
							averagePrice: "45.00",
							folderId: null,
							unit: "шт",
						},
					],
					nextCursor: "abc123",
				});
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await fetchItems({ q: "Widget", status: "searching", sort: "currentPrice", dir: "asc", limit: 25 });

		expect(capturedHeaders?.get("X-Tenant")).toBe("acme");
		expect(capturedHeaders?.get("Authorization")).toBe("Bearer eyJ.test.jwt");
		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("q")).toBe("Widget");
		expect(url.searchParams.get("status")).toBe("searching");
		expect(url.searchParams.get("sort")).toBe("currentPrice");
		expect(url.searchParams.get("dir")).toBe("asc");
		expect(url.searchParams.get("limit")).toBe("25");
		expect(result.items[0].currentPrice).toBe(50);
		expect(result.items[0].bestPrice).toBe(40);
		expect(result.nextCursor).toBe("abc123");
	});

	it("omits undefined params from query string", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ items: [], nextCursor: null });
			}),
		);

		setToken("eyJ.test.jwt");
		await fetchItems({});

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.toString()).toBe("");
	});

	it("sends cursor param for pagination", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({ items: [], nextCursor: null });
			}),
		);

		setToken("eyJ.test.jwt");
		await fetchItems({ cursor: "eyJvcyI6MjV9" });

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("cursor")).toBe("eyJvcyI6MjV9");
	});
});

describe("updateItem", () => {
	it("sends PATCH /api/v1/company/items/:id/ with partial data and parses decimals", async () => {
		let capturedBody: unknown;

		server.use(
			http.patch("/api/v1/company/items/:id/", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({
					id: "i1",
					name: "Renamed",
					status: "searching",
					annualQuantity: 100,
					currentPrice: "50.00",
					bestPrice: "40.00",
					averagePrice: "45.00",
					folderId: null,
				});
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await updateItem("i1", { name: "Renamed" });
		expect(capturedBody).toEqual({ name: "Renamed" });
		expect(result.name).toBe("Renamed");
		expect(result.currentPrice).toBe(50);
		expect(result.bestPrice).toBe(40);
	});

	it("sends folderId for folder assignment", async () => {
		let capturedBody: unknown;

		server.use(
			http.patch("/api/v1/company/items/:id/", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json({
					id: "i1",
					name: "Item",
					status: "searching",
					annualQuantity: 100,
					currentPrice: "50.00",
					bestPrice: null,
					averagePrice: null,
					folderId: "f1",
				});
			}),
		);

		setToken("eyJ.test.jwt");
		await updateItem("i1", { folderId: "f1" });
		expect(capturedBody).toEqual({ folderId: "f1" });
	});
});

describe("deleteItem", () => {
	it("sends DELETE /api/v1/company/items/:id/ and returns void", async () => {
		let capturedMethod: string | undefined;

		server.use(
			http.delete("/api/v1/company/items/:id/", ({ request }) => {
				capturedMethod = request.method;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await deleteItem("i1");
		expect(capturedMethod).toBe("DELETE");
		expect(result).toBeUndefined();
	});
});

describe("createItemsBatch", () => {
	it("sends POST /api/v1/company/items/batch with items array and parses decimals", async () => {
		let capturedBody: unknown;

		server.use(
			http.post("/api/v1/company/items/batch", async ({ request }) => {
				capturedBody = await request.json();
				return HttpResponse.json(
					{
						items: [
							{
								id: "new-1",
								name: "Widget A",
								status: "searching",
								annualQuantity: 100,
								currentPrice: "50.00",
								bestPrice: null,
								averagePrice: null,
								folderId: null,
								unit: "шт",
							},
						],
						isAsync: false,
					},
					{ status: 201 },
				);
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await createItemsBatch([{ name: "Widget A", annualQuantity: 100, currentPrice: 50, unit: "шт" }]);

		expect(capturedBody).toEqual({ items: [{ name: "Widget A", annualQuantity: 100, currentPrice: 50, unit: "шт" }] });
		expect(result.isAsync).toBe(false);
		expect(result.items?.[0].currentPrice).toBe(50);
		expect(result.items?.[0].name).toBe("Widget A");
	});

	it("returns async response for large batches", async () => {
		server.use(
			http.post("/api/v1/company/items/batch", () => {
				return HttpResponse.json({ isAsync: true, taskId: "task-uuid-123" }, { status: 202 });
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await createItemsBatch([{ name: "Item" }]);

		expect(result.isAsync).toBe(true);
		expect(result.taskId).toBe("task-uuid-123");
		expect(result.items).toBeUndefined();
	});

	it("throws on 400 validation error", async () => {
		server.use(
			http.post("/api/v1/company/items/batch", () => {
				return HttpResponse.json({ items: [{ name: ["This field is required."] }] }, { status: 400 });
			}),
		);

		setToken("eyJ.test.jwt");
		await expect(createItemsBatch([{ name: "" }])).rejects.toThrow();
	});
});

describe("fetchTotals", () => {
	it("sends GET /api/v1/company/items/totals with filter params and parses decimals", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/items/totals", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					itemCount: 42,
					totalOverpayment: "15000.00",
					totalSavings: "8000.00",
					totalDeviation: "120.50",
				});
			}),
		);

		setToken("eyJ.test.jwt");
		const result = await fetchTotals({ q: "test", deviation: "overpaying", folder: "f1" });

		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("q")).toBe("test");
		expect(url.searchParams.get("deviation")).toBe("overpaying");
		expect(url.searchParams.get("folder")).toBe("f1");
		expect(result.totalOverpayment).toBe(15000);
		expect(result.totalSavings).toBe(8000);
		expect(result.totalDeviation).toBe(120.5);
		expect(result.itemCount).toBe(42);
	});
});
