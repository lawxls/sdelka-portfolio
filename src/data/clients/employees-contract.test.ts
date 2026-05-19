import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EmployeeWithPermissions } from "../domains/employees";
import { NotFoundError } from "../errors";
import { _resetIdCounter, _setMockDelay } from "../mock-utils";
import type { EmployeesClient } from "./employees-client";
import { createInMemoryEmployeesClient, type InMemoryEmployeesSeed } from "./employees-in-memory";

/**
 * Layer B contract test. In-memory only — the backend's
 * `/companies/employees/` endpoint requires an existing `user: UUID` FK on
 * create and has no permissions endpoint, so this seam has no HTTP adapter
 * today. The contract here is the surface the company drawer + invite flow
 * consume; if a future HTTP adapter lands, the same scenarios run against it.
 */

function makeEmployee(id: string, overrides: Partial<EmployeeWithPermissions> = {}): EmployeeWithPermissions {
	return {
		id,
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Менеджер",
		role: "user",
		phone: "+71234567890",
		email: `e${id}@example.com`,
		permissions: {
			id: `perm-${id}`,
			employeeId: id,
			procurementInquiries: "edit",
			positions: "edit",
			tasks: "edit",
			workspaceSettings: "view",
			companies: "view",
			employees: "view",
			emails: "view",
		},
		...overrides,
	};
}

const SEED: InMemoryEmployeesSeed[] = [
	{ companyId: "c1", employee: makeEmployee("1", { firstName: "Анна" }) },
	{ companyId: "c1", employee: makeEmployee("2", { firstName: "Борис" }) },
	{ companyId: "c2", employee: makeEmployee("3", { firstName: "Вера" }) },
];

describe("EmployeesClient contract — in-memory adapter", () => {
	let client: EmployeesClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		_resetIdCounter();
		client = createInMemoryEmployeesClient({ seed: SEED });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("listByCompany returns employees scoped to one company", async () => {
		const list = await client.listByCompany("c1");
		expect(list.map((e) => e.firstName)).toEqual(["Анна", "Борис"]);
	});

	it("listByCompany returns an empty list for an unknown company", async () => {
		const list = await client.listByCompany("missing");
		expect(list).toEqual([]);
	});

	it("create appends an employee with default permissions", async () => {
		const created = await client.create("c1", {
			firstName: "Григорий",
			lastName: "Сидоров",
			patronymic: "Петрович",
			position: "Закупщик",
			role: "user",
			phone: "+79991112233",
			email: "g@s.example",
		});
		expect(created.id).toMatch(/^\d+$/);
		expect(created.permissions.procurementInquiries).toBe("none");
		const list = await client.listByCompany("c1");
		expect(list.map((e) => e.firstName)).toContain("Григорий");
	});

	it("update patches the requested fields", async () => {
		const updated = await client.update("c1", "1", { position: "Директор" });
		expect(updated.position).toBe("Директор");
		const list = await client.listByCompany("c1");
		expect(list.find((e) => e.id === "1")?.position).toBe("Директор");
	});

	it("update throws NotFoundError when the employee is missing", async () => {
		await expect(client.update("c1", "missing", { position: "x" })).rejects.toBeInstanceOf(NotFoundError);
	});

	it("delete removes the employee", async () => {
		await client.delete("c1", "1");
		const list = await client.listByCompany("c1");
		expect(list.map((e) => e.id)).toEqual(["2"]);
	});

	it("updatePermissions patches the requested levels", async () => {
		const perms = await client.updatePermissions("c1", "1", { employees: "edit" });
		expect(perms.employees).toBe("edit");
		expect(perms.procurementInquiries).toBe("edit");
		const list = await client.listByCompany("c1");
		expect(list.find((e) => e.id === "1")?.permissions.employees).toBe("edit");
	});

	it("updatePermissions throws NotFoundError when the employee is missing", async () => {
		await expect(client.updatePermissions("c1", "missing", { employees: "edit" })).rejects.toBeInstanceOf(
			NotFoundError,
		);
	});

	it("create on an unseeded company starts a fresh roster", async () => {
		const created = await client.create("c-new", {
			firstName: "Иван",
			lastName: "Иванов",
			patronymic: "",
			position: "",
			role: "user",
			phone: "",
			email: "i@i.example",
		});
		expect(created.id).toBeTruthy();
		const list = await client.listByCompany("c-new");
		expect(list).toHaveLength(1);
	});
});
