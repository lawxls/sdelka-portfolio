import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { mockHostname } from "@/test-utils";
import {
	changeTaskStatus,
	createAddress,
	createEmployee,
	createFolder,
	createItemsBatch,
	deleteAddress,
	deleteEmployee,
	deleteFolder,
	deleteItem,
	deleteTaskAttachment,
	exportItems,
	fetchCompanyInfo,
	fetchFolderStats,
	fetchFolders,
	fetchItems,
	fetchTask,
	fetchTaskBoard,
	fetchTasks,
	fetchTotals,
	parseDecimals,
	updateAddress,
	updateEmployee,
	updateEmployeePermissions,
	updateFolder,
	updateItem,
	uploadTaskAttachments,
} from "./api-client";
import { clearTokens, setTokens } from "./auth";

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

describe("fetchCompanyInfo", () => {
	it("sends GET /api/v1/company/info/ with auth headers", async () => {
		let capturedHeaders: Headers | undefined;

		server.use(
			http.get("/api/v1/company/info/", ({ request }) => {
				capturedHeaders = request.headers;
				return HttpResponse.json({ name: "Acme Corp" });
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await fetchCompanyInfo();
		expect(capturedHeaders?.get("X-Tenant")).toBe("acme");
		expect(capturedHeaders?.get("Authorization")).toBe("Bearer eyJ.test.jwt");
		expect(result).toEqual({ name: "Acme Corp" });
	});

	it("clears token on 401 when refresh also fails", async () => {
		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ detail: "Invalid credentials." }, { status: 401 });
			}),
			http.post("/api/v1/auth/token/refresh", () => {
				return HttpResponse.json({ detail: "Token expired" }, { status: 401 });
			}),
		);

		setTokens("expired-token", "expired-refresh");
		await expect(fetchCompanyInfo()).rejects.toThrow();
		expect(localStorage.getItem("auth-access-token")).toBeNull();
		expect(localStorage.getItem("auth-refresh-token")).toBeNull();
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
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

describe("401 refresh interceptor", () => {
	it("refreshes token and retries request on 401", async () => {
		let requestCount = 0;
		server.use(
			http.get("/api/v1/company/info/", ({ request }) => {
				requestCount++;
				if (request.headers.get("Authorization") === "Bearer expired-token") {
					return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
				}
				return HttpResponse.json({ name: "Acme Corp" });
			}),
			http.post("/api/v1/auth/token/refresh", () => {
				return HttpResponse.json({ access: "new-access-token" });
			}),
		);

		setTokens("expired-token", "valid-refresh");
		const result = await fetchCompanyInfo();
		expect(result).toEqual({ name: "Acme Corp" });
		expect(requestCount).toBe(2);
		expect(localStorage.getItem("auth-access-token")).toBe("new-access-token");
	});

	it("clears tokens and throws when refresh fails", async () => {
		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({}, { status: 401 });
			}),
			http.post("/api/v1/auth/token/refresh", () => {
				return HttpResponse.json({ detail: "expired" }, { status: 401 });
			}),
		);

		setTokens("expired-token", "expired-refresh");
		await expect(fetchCompanyInfo()).rejects.toThrow();
		expect(localStorage.getItem("auth-access-token")).toBeNull();
		expect(localStorage.getItem("auth-refresh-token")).toBeNull();
	});

	it("does not attempt refresh when no refresh token exists", async () => {
		let refreshCalled = false;
		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({}, { status: 401 });
			}),
			http.post("/api/v1/auth/token/refresh", () => {
				refreshCalled = true;
				return HttpResponse.json({ access: "new" });
			}),
		);

		localStorage.setItem("auth-access-token", "expired-token");
		await expect(fetchCompanyInfo()).rejects.toThrow();
		expect(refreshCalled).toBe(false);
		expect(localStorage.getItem("auth-access-token")).toBeNull();
	});

	it("deduplicates concurrent refresh requests", async () => {
		let refreshCount = 0;
		server.use(
			http.get("/api/v1/company/info/", ({ request }) => {
				if (request.headers.get("Authorization") === "Bearer expired-token") {
					return HttpResponse.json({}, { status: 401 });
				}
				return HttpResponse.json({ name: "Acme Corp" });
			}),
			http.get("/api/v1/company/folders/", ({ request }) => {
				if (request.headers.get("Authorization") === "Bearer expired-token") {
					return HttpResponse.json({}, { status: 401 });
				}
				return HttpResponse.json({ folders: [] });
			}),
			http.post("/api/v1/auth/token/refresh", () => {
				refreshCount++;
				return HttpResponse.json({ access: "new-token" });
			}),
		);

		setTokens("expired-token", "valid-refresh");
		const [info, folders] = await Promise.all([fetchCompanyInfo(), fetchFolders()]);

		expect(info).toEqual({ name: "Acme Corp" });
		expect(folders).toEqual({ folders: [] });
		expect(refreshCount).toBe(1);
	});

	it("does not write tokens back if user logged out during refresh", async () => {
		let resolveRefresh: ((value: Response | PromiseLike<Response>) => void) | undefined;
		server.use(
			http.get("/api/v1/company/info/", ({ request }) => {
				const auth = request.headers.get("Authorization");
				if (!auth || auth === "Bearer expired-token") {
					return HttpResponse.json({}, { status: 401 });
				}
				return HttpResponse.json({ name: "Acme Corp" });
			}),
			http.post("/api/v1/auth/token/refresh", () => {
				return new Promise((resolve) => {
					resolveRefresh = resolve;
				});
			}),
		);

		setTokens("expired-token", "valid-refresh");
		const promise = fetchCompanyInfo();

		// Simulate logout while refresh is in flight
		await vi.waitFor(() => expect(resolveRefresh).toBeDefined());
		clearTokens();

		// Now let refresh succeed
		resolveRefresh?.(HttpResponse.json({ access: "new-access-token" }));

		// Retry uses empty auth (logged out) → 401 → clears tokens → throws
		await expect(promise).rejects.toThrow();
		// Tokens must NOT have been written back
		expect(localStorage.getItem("auth-access-token")).toBeNull();
		expect(localStorage.getItem("auth-refresh-token")).toBeNull();
	});

	it("refreshes token and retries for export requests", async () => {
		let requestCount = 0;
		server.use(
			http.get("/api/v1/company/items/export", ({ request }) => {
				requestCount++;
				if (request.headers.get("Authorization") === "Bearer expired-token") {
					return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
				}
				return new HttpResponse("file-content", {
					headers: {
						"Content-Type": "application/octet-stream",
						"Content-Disposition": 'attachment; filename="items.xlsx"',
					},
				});
			}),
			http.post("/api/v1/auth/token/refresh", () => {
				return HttpResponse.json({ access: "new-access-token" });
			}),
		);

		setTokens("expired-token", "valid-refresh");
		const result = await exportItems({});
		expect(result.filename).toBe("items.xlsx");
		expect(requestCount).toBe(2);
		expect(localStorage.getItem("auth-access-token")).toBe("new-access-token");
	});
});

describe("createAddress", () => {
	it("sends POST to /api/v1/companies/{id}/addresses/ with trailing slash", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.post("/api/v1/companies/:companyId/addresses/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					id: "addr-1",
					name: "Main",
					type: "office",
					postalCode: "123456",
					address: "123 Main St",
					contactPerson: "John",
					phone: "+71234567890",
				});
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await createAddress("comp-1", {
			name: "Main",
			type: "office",
			postalCode: "123456",
			address: "123 Main St",
			contactPerson: "John",
			phone: "+71234567890",
		});
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/companies/comp-1/addresses/");
		expect(result.id).toBe("addr-1");
	});
});

describe("updateAddress", () => {
	it("sends PATCH to /api/v1/companies/{id}/addresses/{addressId}/ with trailing slash", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.patch("/api/v1/companies/:companyId/addresses/:addressId/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					id: "addr-1",
					name: "Updated",
					type: "office",
					postalCode: "123456",
					address: "123 Main St",
					contactPerson: "John",
					phone: "+71234567890",
				});
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await updateAddress("comp-1", "addr-1", { name: "Updated" });
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/companies/comp-1/addresses/addr-1/");
		expect(result.name).toBe("Updated");
	});
});

describe("deleteAddress", () => {
	it("sends DELETE to /api/v1/companies/{id}/addresses/{addressId}/ with trailing slash", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.delete("/api/v1/companies/:companyId/addresses/:addressId/", ({ request }) => {
				capturedUrl = request.url;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		await deleteAddress("comp-1", "addr-1");
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/companies/comp-1/addresses/addr-1/");
	});
});

describe("createEmployee", () => {
	it("sends POST to /api/v1/companies/{id}/employees/ with trailing slash", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.post("/api/v1/companies/:companyId/employees/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					id: 1,
					firstName: "Ivan",
					lastName: "Petrov",
					patronymic: "",
					position: "Manager",
					role: "user",
					phone: "+71234567890",
					email: "ivan@test.com",
					isResponsible: false,
					permissions: {
						id: "perm-1",
						employeeId: 1,
						analytics: "none",
						procurement: "none",
						companies: "none",
						tasks: "none",
					},
				});
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await createEmployee("comp-1", {
			firstName: "Ivan",
			lastName: "Petrov",
			patronymic: "",
			position: "Manager",
			role: "user",
			phone: "+71234567890",
			email: "ivan@test.com",
			isResponsible: false,
		});
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/companies/comp-1/employees/");
		expect(result.id).toBe(1);
	});
});

describe("updateEmployee", () => {
	it("sends PATCH to /api/v1/companies/{id}/employees/{employeeId}/ with trailing slash", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.patch("/api/v1/companies/:companyId/employees/:employeeId/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					id: 1,
					firstName: "Updated",
					lastName: "Petrov",
					patronymic: "",
					position: "Manager",
					role: "user",
					phone: "+71234567890",
					email: "ivan@test.com",
					isResponsible: false,
					permissions: {
						id: "perm-1",
						employeeId: 1,
						analytics: "none",
						procurement: "none",
						companies: "none",
						tasks: "none",
					},
				});
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await updateEmployee("comp-1", 1, { firstName: "Updated" });
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/companies/comp-1/employees/1/");
		expect(result.firstName).toBe("Updated");
	});
});

describe("deleteEmployee", () => {
	it("sends DELETE to /api/v1/companies/{id}/employees/{employeeId}/ with trailing slash", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.delete("/api/v1/companies/:companyId/employees/:employeeId/", ({ request }) => {
				capturedUrl = request.url;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		await deleteEmployee("comp-1", 1);
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/companies/comp-1/employees/1/");
	});
});

describe("updateEmployeePermissions", () => {
	it("sends PATCH to /api/v1/companies/{id}/employees/{employeeId}/permissions/ with trailing slash", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.patch("/api/v1/companies/:companyId/employees/:employeeId/permissions/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					id: "perm-1",
					employeeId: 1,
					analytics: "edit",
					procurement: "none",
					companies: "none",
					tasks: "none",
				});
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await updateEmployeePermissions("comp-1", 1, { analytics: "edit" });
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/companies/comp-1/employees/1/permissions/");
		expect(result.analytics).toBe("edit");
	});
});

// --- Tasks ---

const MOCK_TASK = {
	id: "task-uuid-1",
	name: "Согласование цены",
	status: "assigned",
	item: { id: "item-1", name: "Арматура А500С", companyId: "comp-1" },
	assignee: { id: "user-1", firstName: "Алексей", lastName: "Иванов", email: "a@test.com", avatarIcon: "blue" },
	createdAt: "2026-03-15T10:00:00.000Z",
	deadlineAt: "2026-04-01T18:00:00.000Z",
	description: "Test",
	questionCount: 2,
	completedResponse: null,
	attachments: [],
	statusBeforeArchive: null,
	supplierQuestions: [],
	updatedAt: "2026-03-15T10:00:00.000Z",
};

describe("fetchTaskBoard", () => {
	it("sends GET /api/v1/company/tasks/board/ with auth headers and query params", async () => {
		let capturedHeaders: Headers | undefined;
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/tasks/board/", ({ request }) => {
				capturedHeaders = request.headers;
				capturedUrl = request.url;
				return HttpResponse.json({
					assigned: { results: [MOCK_TASK], next: "cursor-1", count: 25 },
					in_progress: { results: [], next: null, count: 0 },
					completed: { results: [], next: null, count: 0 },
					archived: { results: [], next: null, count: 0 },
				});
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await fetchTaskBoard({ q: "test", sort: "created_at", dir: "asc" });
		expect(capturedHeaders?.get("Authorization")).toBe("Bearer eyJ.test.jwt");
		expect(capturedHeaders?.get("X-Tenant")).toBe("acme");
		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("q")).toBe("test");
		expect(url.searchParams.get("sort")).toBe("created_at");
		expect(result.assigned?.results).toHaveLength(1);
		expect(result.assigned?.results[0].name).toBe("Согласование цены");
		expect(result.assigned?.next).toBe("cursor-1");
		expect(result.assigned?.count).toBe(25);
	});

	it("sends column and cursor params for per-column pagination", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/tasks/board/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					results: [MOCK_TASK],
					next: null,
				});
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		await fetchTaskBoard({ column: "assigned", cursor: "abc123" });
		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("column")).toBe("assigned");
		expect(url.searchParams.get("cursor")).toBe("abc123");
	});
});

describe("fetchTasks", () => {
	it("sends GET /api/v1/company/tasks/ with page-number pagination and query params", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/tasks/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json({
					count: 100,
					results: [MOCK_TASK],
					next: "http://api/tasks/?page=2",
					previous: null,
				});
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await fetchTasks({ page: 1, page_size: 20, q: "test", sort: "deadline_at", dir: "desc" });
		const url = new URL(capturedUrl as string);
		expect(url.searchParams.get("page")).toBe("1");
		expect(url.searchParams.get("page_size")).toBe("20");
		expect(url.searchParams.get("q")).toBe("test");
		expect(url.searchParams.get("sort")).toBe("deadline_at");
		expect(url.searchParams.get("dir")).toBe("desc");
		expect(result.results).toHaveLength(1);
		expect(result.count).toBe(100);
		expect(result.next).toBeTruthy();
	});
});

describe("fetchTask", () => {
	it("sends GET /api/v1/company/tasks/{id}/ with auth headers", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.get("/api/v1/company/tasks/:id/", ({ request }) => {
				capturedUrl = request.url;
				return HttpResponse.json(MOCK_TASK);
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await fetchTask("task-uuid-1");
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/company/tasks/task-uuid-1/");
		expect(result.id).toBe("task-uuid-1");
		expect(result.name).toBe("Согласование цены");
		expect(result.item.name).toBe("Арматура А500С");
	});
});

describe("changeTaskStatus", () => {
	it("sends PATCH /api/v1/company/tasks/{id}/status/ with status and optional completedResponse", async () => {
		let capturedUrl: string | undefined;
		let capturedBody: unknown;

		server.use(
			http.patch("/api/v1/company/tasks/:id/status/", async ({ request }) => {
				capturedUrl = request.url;
				capturedBody = await request.json();
				return HttpResponse.json({ ...MOCK_TASK, status: "completed", completedResponse: "Done" });
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await changeTaskStatus("task-uuid-1", { status: "completed", completedResponse: "Done" });
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/company/tasks/task-uuid-1/status/");
		expect(capturedBody).toEqual({ status: "completed", completedResponse: "Done" });
		expect(result.status).toBe("completed");
	});
});

describe("uploadTaskAttachments", () => {
	it("sends POST /api/v1/company/tasks/{id}/attachments/ with multipart form data", async () => {
		let capturedUrl: string | undefined;
		let capturedContentType: string | null | undefined;

		server.use(
			http.post("/api/v1/company/tasks/:id/attachments/", ({ request }) => {
				capturedUrl = request.url;
				capturedContentType = request.headers.get("content-type");
				return HttpResponse.json([
					{
						id: "att-1",
						fileName: "doc.pdf",
						fileSize: 1024,
						fileType: "pdf",
						contentType: "application/pdf",
						fileUrl: "/files/doc.pdf",
						uploadedAt: "2026-03-15T10:00:00.000Z",
					},
				]);
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const files = [new File(["content"], "doc.pdf", { type: "application/pdf" })];
		const result = await uploadTaskAttachments("task-uuid-1", files);
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/company/tasks/task-uuid-1/attachments/");
		expect(capturedContentType).toContain("multipart/form-data");
		expect(result).toHaveLength(1);
		expect(result[0].fileName).toBe("doc.pdf");
	});
});

describe("deleteTaskAttachment", () => {
	it("sends DELETE /api/v1/company/tasks/{id}/attachments/{attachmentId}/ and returns void", async () => {
		let capturedUrl: string | undefined;

		server.use(
			http.delete("/api/v1/company/tasks/:id/attachments/:attachmentId/", ({ request }) => {
				capturedUrl = request.url;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		setTokens("eyJ.test.jwt", "eyJ.test.refresh");
		const result = await deleteTaskAttachment("task-uuid-1", "att-1");
		expect(new URL(capturedUrl as string).pathname).toBe("/api/v1/company/tasks/task-uuid-1/attachments/att-1/");
		expect(result).toBeUndefined();
	});
});
