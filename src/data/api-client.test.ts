import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import * as companiesMock from "./companies-mock-data";
import * as foldersMock from "./folders-mock-data";
import * as itemsMock from "./items-mock-data";
import * as tasksMock from "./tasks-mock-data";
import * as workspaceMock from "./workspace-mock-data";

beforeEach(() => {
	mockHostname("acme.localhost");
	itemsMock._resetItemsStore();
	foldersMock._resetFoldersStore();
	companiesMock._resetCompaniesStore();
	tasksMock._resetTasksStore();
	workspaceMock._resetWorkspaceStore();
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
	it("returns the seeded company name from the mock store", async () => {
		workspaceMock._setCompanyInfo({ name: "Acme Corp" });
		const result = await fetchCompanyInfo();
		expect(result).toEqual({ name: "Acme Corp" });
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
	it("appends a new address to the company in the mock store", async () => {
		const company = companiesMock._getCompanies()[0];
		const before = company.addresses.length;
		const result = await createAddress(company.id, {
			name: "Main",
			type: "office",
			postalCode: "123456",
			address: "123 Main St",
			contactPerson: "John",
			phone: "+71234567890",
		});
		expect(result.id).toBeTruthy();
		expect(result.name).toBe("Main");
		expect(companiesMock._getCompanies().find((c) => c.id === company.id)?.addresses).toHaveLength(before + 1);
	});
});

describe("updateAddress", () => {
	it("patches address fields in the mock store", async () => {
		const company = companiesMock._getCompanies()[0];
		const addressId = company.addresses[0].id;
		const result = await updateAddress(company.id, addressId, { name: "Updated" });
		expect(result.name).toBe("Updated");
	});
});

describe("deleteAddress", () => {
	it("removes the address from the mock store", async () => {
		const company = companiesMock._getCompanies()[0];
		const addressId = company.addresses[0].id;
		const before = company.addresses.length;
		await deleteAddress(company.id, addressId);
		const after = companiesMock._getCompanies().find((c) => c.id === company.id)?.addresses ?? [];
		expect(after).toHaveLength(before - 1);
		expect(after.find((a) => a.id === addressId)).toBeUndefined();
	});
});

describe("createEmployee", () => {
	it("appends a new employee with default permissions", async () => {
		const company = companiesMock._getCompanies()[0];
		const before = company.employees.length;
		const result = await createEmployee(company.id, {
			firstName: "Ivan",
			lastName: "Petrov",
			patronymic: "",
			position: "Manager",
			role: "user",
			phone: "+71234567890",
			email: "ivan@test.com",
			isResponsible: false,
		});
		expect(result.id).toBeGreaterThan(0);
		expect(result.firstName).toBe("Ivan");
		expect(result.permissions.analytics).toBe("none");
		expect(companiesMock._getCompanies().find((c) => c.id === company.id)?.employees).toHaveLength(before + 1);
	});
});

describe("updateEmployee", () => {
	it("patches employee fields in the mock store", async () => {
		const company = companiesMock._getCompanies()[0];
		const empId = company.employees[0].id;
		const result = await updateEmployee(company.id, empId, { firstName: "Updated" });
		expect(result.firstName).toBe("Updated");
	});
});

describe("deleteEmployee", () => {
	it("removes the employee from the mock store", async () => {
		const company = companiesMock._getCompanies()[0];
		const empId = company.employees[0].id;
		await deleteEmployee(company.id, empId);
		const after = companiesMock._getCompanies().find((c) => c.id === company.id)?.employees ?? [];
		expect(after.find((e) => e.id === empId)).toBeUndefined();
	});
});

describe("updateEmployeePermissions", () => {
	it("patches permissions and returns the new permissions object", async () => {
		const company = companiesMock._getCompanies()[0];
		const empId = company.employees[0].id;
		const result = await updateEmployeePermissions(company.id, empId, { analytics: "edit" });
		expect(result.analytics).toBe("edit");
	});
});

// --- Tasks ---

function makeStoredTask(id: string, status: "assigned" | "in_progress" | "completed" | "archived" = "assigned") {
	return {
		id,
		name: `Task ${id}`,
		status,
		item: { id: "item-1", name: "Арматура А500С", companyId: "company-1" },
		assignee: { id: "user-1", firstName: "Алексей", lastName: "Иванов", email: "a@test.com", avatarIcon: "blue" },
		createdAt: "2026-03-15T10:00:00.000Z",
		deadlineAt: "2026-04-01T18:00:00.000Z",
		description: "Test",
		questionCount: 2,
		completedResponse: null,
		attachments: [] as import("./task-types").Attachment[],
		statusBeforeArchive: null,
		supplierQuestions: [] as import("./task-types").SupplierQuestion[],
		updatedAt: "2026-03-15T10:00:00.000Z",
	};
}

describe("fetchTaskBoard", () => {
	it("returns four columns from the mock store", async () => {
		tasksMock._setTasks([
			makeStoredTask("t1", "assigned"),
			makeStoredTask("t2", "in_progress"),
			makeStoredTask("t3", "completed"),
			makeStoredTask("t4", "archived"),
		]);
		const result = await fetchTaskBoard({ q: "Task", sort: "created_at", dir: "asc" });
		expect(result.assigned?.results).toHaveLength(1);
		expect(result.assigned?.results[0].id).toBe("t1");
		expect(result.in_progress?.count).toBe(1);
		expect(result.completed?.count).toBe(1);
		expect(result.archived?.count).toBe(1);
	});

	it("returns paginated column when column + cursor are passed", async () => {
		const many = Array.from({ length: 25 }, (_, i) => makeStoredTask(`t${i + 1}`, "assigned"));
		tasksMock._setTasks(many);
		const result = await fetchTaskBoard({ column: "assigned" });
		expect(result.results).toHaveLength(20);
		expect(result.next).toBeTruthy();
	});
});

describe("fetchTasks", () => {
	it("returns paginated list from the mock store", async () => {
		const many = Array.from({ length: 25 }, (_, i) => makeStoredTask(`t${i + 1}`, "assigned"));
		tasksMock._setTasks(many);
		const result = await fetchTasks({ page: 1, page_size: 20, q: "Task", sort: "deadline_at", dir: "desc" });
		expect(result.results).toHaveLength(20);
		expect(result.count).toBe(25);
		expect(result.next).toBeTruthy();
	});
});

describe("fetchTask", () => {
	it("returns a single task by id from the mock store", async () => {
		tasksMock._setTasks([makeStoredTask("only-1", "assigned")]);
		const result = await fetchTask("only-1");
		expect(result.id).toBe("only-1");
		expect(result.item.name).toBe("Арматура А500С");
	});
});

describe("changeTaskStatus", () => {
	it("updates status in the mock store and returns the updated task", async () => {
		tasksMock._setTasks([makeStoredTask("t1", "assigned")]);
		const result = await changeTaskStatus("t1", { status: "completed", completedResponse: "Done" });
		expect(result.status).toBe("completed");
		expect(result.completedResponse).toBe("Done");
		expect(tasksMock._getAllTasks().find((t) => t.id === "t1")?.status).toBe("completed");
	});
});

describe("uploadTaskAttachments", () => {
	it("creates attachments on the task in the mock store", async () => {
		tasksMock._setTasks([makeStoredTask("t1", "assigned")]);
		const files = [new File(["content"], "doc.pdf", { type: "application/pdf" })];
		const result = await uploadTaskAttachments("t1", files);
		expect(result).toHaveLength(1);
		expect(result[0].fileName).toBe("doc.pdf");
		expect(result[0].contentType).toBe("application/pdf");
		expect(tasksMock._getAllTasks().find((t) => t.id === "t1")?.attachments).toHaveLength(1);
	});
});

describe("deleteTaskAttachment", () => {
	it("removes the attachment from the task in the mock store", async () => {
		tasksMock._setTasks([
			{
				...makeStoredTask("t1", "assigned"),
				attachments: [
					{
						id: "att-1",
						fileName: "doc.pdf",
						fileSize: 1024,
						fileType: "pdf",
						contentType: "application/pdf",
						fileUrl: "blob:mock",
						uploadedAt: "2026-03-15T10:00:00.000Z",
					},
				],
			},
		]);
		const result = await deleteTaskAttachment("t1", "att-1");
		expect(result).toBeUndefined();
		expect(tasksMock._getAllTasks().find((t) => t.id === "t1")?.attachments).toHaveLength(0);
	});
});
