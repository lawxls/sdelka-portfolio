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
import { setTokens } from "./auth";
import * as foldersMock from "./folders-mock-data";
import * as itemsMock from "./items-mock-data";

beforeEach(() => {
	mockHostname("acme.localhost");
	itemsMock._resetItemsStore();
	foldersMock._resetFoldersStore();
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

	it("clears tokens and throws on 401", async () => {
		server.use(
			http.get("/api/v1/company/info/", () => {
				return HttpResponse.json({ detail: "Invalid credentials." }, { status: 401 });
			}),
		);

		setTokens("expired-token", "expired-refresh");
		await expect(fetchCompanyInfo()).rejects.toThrow();
		expect(localStorage.getItem("auth-access-token")).toBeNull();
		expect(localStorage.getItem("auth-refresh-token")).toBeNull();
	});
});

describe("fetchFolders", () => {
	it("returns folders from the mock store", async () => {
		foldersMock._setFolders([{ id: "f1", name: "Test", color: "blue" }]);
		const result = await fetchFolders();
		expect(result.folders).toEqual([{ id: "f1", name: "Test", color: "blue" }]);
	});
});

describe("fetchFolderStats", () => {
	it("returns stats + archive count from the mock store", async () => {
		foldersMock._setFolders([{ id: "f1", name: "F1", color: "blue" }]);
		itemsMock._setItems([
			{
				id: "a",
				name: "A",
				status: "searching",
				annualQuantity: 1,
				currentPrice: 1,
				bestPrice: 1,
				averagePrice: 1,
				folderId: "f1",
				companyId: "c1",
			},
		]);
		const result = await fetchFolderStats();
		expect(result.stats.find((s) => s.folderId === "f1")?.itemCount).toBe(1);
		expect(result.archiveCount).toBe(0);
	});
});

describe("createFolder", () => {
	it("creates a folder in the mock store", async () => {
		foldersMock._setFolders([]);
		const result = await createFolder({ name: "Test", color: "blue" });
		expect(result.name).toBe("Test");
		expect(result.color).toBe("blue");
		expect(result.id).toBeTruthy();
	});
});

describe("updateFolder", () => {
	it("updates a folder in the mock store", async () => {
		foldersMock._setFolders([{ id: "f1", name: "Old", color: "blue" }]);
		const result = await updateFolder("f1", { name: "Renamed" });
		expect(result.name).toBe("Renamed");
	});
});

describe("deleteFolder", () => {
	it("deletes a folder from the mock store", async () => {
		foldersMock._setFolders([{ id: "f1", name: "F1", color: "blue" }]);
		const result = await deleteFolder("f1");
		expect(result).toBeUndefined();
		expect(foldersMock._getFolders()).toHaveLength(0);
	});
});

describe("fetchItems", () => {
	it("returns items with decimal numbers from the mock store", async () => {
		itemsMock._setItems([
			{
				id: "i1",
				name: "Widget",
				status: "searching",
				annualQuantity: 100,
				currentPrice: 50,
				bestPrice: 40,
				averagePrice: 45,
				folderId: null,
				companyId: "c1",
				unit: "шт",
			},
		]);
		const result = await fetchItems({});
		expect(result.items[0].currentPrice).toBe(50);
		expect(result.items[0].bestPrice).toBe(40);
	});

	it("paginates using cursor", async () => {
		itemsMock._setItems([
			{
				id: "i1",
				name: "A",
				status: "searching",
				annualQuantity: 1,
				currentPrice: 1,
				bestPrice: 1,
				averagePrice: 1,
				folderId: null,
				companyId: "c1",
			},
			{
				id: "i2",
				name: "B",
				status: "searching",
				annualQuantity: 1,
				currentPrice: 1,
				bestPrice: 1,
				averagePrice: 1,
				folderId: null,
				companyId: "c1",
			},
		]);
		const first = await fetchItems({ limit: 1 });
		expect(first.items).toHaveLength(1);
		expect(first.nextCursor).toBe("i2");
	});
});

describe("updateItem", () => {
	it("updates item in the mock store and returns result", async () => {
		itemsMock._setItems([
			{
				id: "i1",
				name: "Old",
				status: "searching",
				annualQuantity: 100,
				currentPrice: 50,
				bestPrice: 40,
				averagePrice: 45,
				folderId: null,
				companyId: "c1",
			},
		]);
		const result = await updateItem("i1", { name: "Renamed" });
		expect(result.name).toBe("Renamed");
		expect(itemsMock._getAllItems().find((i) => i.id === "i1")?.name).toBe("Renamed");
	});

	it("moves item to a folder", async () => {
		itemsMock._setItems([
			{
				id: "i1",
				name: "A",
				status: "searching",
				annualQuantity: 1,
				currentPrice: 1,
				bestPrice: null,
				averagePrice: null,
				folderId: null,
				companyId: "c1",
			},
		]);
		const result = await updateItem("i1", { folderId: "f1" });
		expect(result.folderId).toBe("f1");
	});
});

describe("deleteItem", () => {
	it("removes the item from the mock store", async () => {
		itemsMock._setItems([
			{
				id: "i1",
				name: "A",
				status: "searching",
				annualQuantity: 1,
				currentPrice: 1,
				bestPrice: null,
				averagePrice: null,
				folderId: null,
				companyId: "c1",
			},
		]);
		const result = await deleteItem("i1");
		expect(result).toBeUndefined();
		expect(itemsMock._getAllItems()).toHaveLength(0);
	});
});

describe("createItemsBatch", () => {
	it("creates items in the mock store and returns them", async () => {
		itemsMock._setItems([]);
		const result = await createItemsBatch([{ name: "Widget A", annualQuantity: 100, currentPrice: 50, unit: "шт" }]);
		expect(result.isAsync).toBe(false);
		expect(result.items?.[0].name).toBe("Widget A");
		expect(result.items?.[0].currentPrice).toBe(50);
	});
});

describe("fetchTotals", () => {
	it("returns totals computed from the mock store", async () => {
		itemsMock._setItems([
			{
				id: "i1",
				name: "A",
				status: "searching",
				annualQuantity: 10,
				currentPrice: 100,
				bestPrice: 80,
				averagePrice: 90,
				folderId: null,
				companyId: "c1",
			},
		]);
		const result = await fetchTotals({});
		expect(result.itemCount).toBe(1);
		expect(result.totalOverpayment).toBe(200);
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
