import { beforeEach, describe, expect, it } from "vitest";
import {
	_getCompanies,
	_resetCompaniesStore,
	_setCompanies,
	createAddressMock,
	createCompanyMock,
	createEmployeeMock,
	deleteAddressMock,
	deleteCompanyMock,
	deleteEmployeeMock,
	fetchCompaniesMock,
	fetchCompanyMock,
	updateAddressMock,
	updateCompanyMock,
	updateEmployeeMock,
	updateEmployeePermissionsMock,
} from "./companies-mock-data";
import type { Company } from "./types";

function makeStored(id: string, overrides: Partial<Company> = {}): Company {
	return {
		id,
		name: `Company ${id}`,
		website: "",
		description: "",
		additionalComments: "",
		isMain: false,
		employeeCount: 0,
		procurementItemCount: 0,
		addresses: [
			{
				id: `addr-${id}-1`,
				name: "Офис",
				address: "г. Москва",
				phone: "+71234567890",
				isMain: true,
			},
		],
		employees: [
			{
				id: 1,
				firstName: "Иван",
				lastName: "Иванов",
				patronymic: "Иванович",
				position: "Директор",
				role: "admin",
				phone: "+71234567890",
				email: "ivan@example.com",
				permissions: {
					id: "perm-1",
					employeeId: 1,
					procurement: "edit",
					tasks: "edit",
					companies: "edit",
					employees: "edit",
					emails: "edit",
				},
			},
		],
		...overrides,
	};
}

beforeEach(() => {
	_resetCompaniesStore();
});

describe("fetchCompaniesMock", () => {
	it("returns seed company summaries", async () => {
		const result = await fetchCompaniesMock({});
		expect(result.companies.length).toBeGreaterThan(0);
		expect(result.companies[0]).toMatchObject({
			id: expect.any(String),
			name: expect.any(String),
			isMain: expect.any(Boolean),
			addresses: expect.any(Array),
			employeeCount: expect.any(Number),
			procurementItemCount: expect.any(Number),
		});
	});

	it("filters by q (case-insensitive substring)", async () => {
		_setCompanies([makeStored("c1", { name: "Альфа" }), makeStored("c2", { name: "Бета" })]);
		const result = await fetchCompaniesMock({ q: "альф" });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].name).toBe("Альфа");
	});

	it("sorts by name asc/desc", async () => {
		_setCompanies([
			makeStored("c1", { name: "Бета" }),
			makeStored("c2", { name: "Альфа" }),
			makeStored("c3", { name: "Гамма" }),
		]);
		const asc = await fetchCompaniesMock({ sort: "name", dir: "asc" });
		expect(asc.companies.map((c) => c.name)).toEqual(["Альфа", "Бета", "Гамма"]);
		const desc = await fetchCompaniesMock({ sort: "name", dir: "desc" });
		expect(desc.companies.map((c) => c.name)).toEqual(["Гамма", "Бета", "Альфа"]);
	});

	it("sorts by employeeCount", async () => {
		const empl = (id: number) =>
			Array.from({ length: id }, (_, i) => ({
				id: i + 1,
				firstName: "x",
				lastName: "y",
				patronymic: "",
				position: "",
				role: "user" as const,
				phone: "",
				email: "",
				permissions: {
					id: `p${i}`,
					employeeId: i + 1,
					procurement: "none" as const,
					tasks: "none" as const,
					companies: "none" as const,
					employees: "none" as const,
					emails: "none" as const,
				},
			}));
		_setCompanies([
			makeStored("c1", { name: "A", employees: empl(5) }),
			makeStored("c2", { name: "B", employees: empl(1) }),
			makeStored("c3", { name: "C", employees: empl(12) }),
		]);
		const result = await fetchCompaniesMock({ sort: "employeeCount", dir: "desc" });
		expect(result.companies.map((c) => c.id)).toEqual(["c3", "c1", "c2"]);
	});

	it("sorts by procurementItemCount", async () => {
		_setCompanies([
			makeStored("c1", { name: "A", procurementItemCount: 3 }),
			makeStored("c2", { name: "B", procurementItemCount: 30 }),
		]);
		const result = await fetchCompaniesMock({ sort: "procurementItemCount", dir: "asc" });
		expect(result.companies.map((c) => c.id)).toEqual(["c1", "c2"]);
	});

	it("paginates with cursor", async () => {
		_setCompanies(Array.from({ length: 50 }, (_, i) => makeStored(`c${i}`, { name: `C${i}` })));
		const page1 = await fetchCompaniesMock({ limit: 10 });
		expect(page1.companies).toHaveLength(10);
		expect(page1.nextCursor).toBeTruthy();
		const page2 = await fetchCompaniesMock({ limit: 10, cursor: page1.nextCursor as string });
		expect(page2.companies[0].id).toBe(page1.nextCursor);
	});

	it("returns CompanySummary shape (not full Company)", async () => {
		const result = await fetchCompaniesMock({});
		const first = result.companies[0];
		expect(first).not.toHaveProperty("employees");
		expect(first).not.toHaveProperty("description");
		expect(first.addresses[0]).not.toHaveProperty("phone");
	});
});

describe("fetchCompanyMock", () => {
	it("returns full company by id", async () => {
		_setCompanies([makeStored("c1", { name: "Альфа", description: "Описание Альфы" })]);
		const result = await fetchCompanyMock("c1");
		expect(result.name).toBe("Альфа");
		expect(result.description).toBe("Описание Альфы");
		expect(result.addresses).toHaveLength(1);
		expect(result.employees).toHaveLength(1);
	});

	it("throws when company not found", async () => {
		_setCompanies([]);
		await expect(fetchCompanyMock("missing")).rejects.toThrow();
	});
});

describe("createCompanyMock", () => {
	it("creates company with nested address and assigns ids", async () => {
		_setCompanies([]);
		const created = await createCompanyMock({
			name: "Новая",
			website: "https://example.com",
			address: {
				name: "Главный офис",
				address: "г. Москва, ул. Новая, 1",
				phone: "+79991112233",
			},
		});
		expect(created.id).toBeTruthy();
		expect(created.name).toBe("Новая");
		expect(created.website).toBe("https://example.com");
		expect(created.addresses).toHaveLength(1);
		expect(created.addresses[0].id).toBeTruthy();
		expect(created.addresses[0].isMain).toBe(true);
		expect(created.employees).toEqual([]);
		expect(_getCompanies()).toHaveLength(1);
	});
});

describe("updateCompanyMock", () => {
	it("patches fields", async () => {
		_setCompanies([makeStored("c1", { name: "Old" })]);
		const updated = await updateCompanyMock("c1", { name: "New", description: "Финансы" });
		expect(updated.name).toBe("New");
		expect(updated.description).toBe("Финансы");
		expect(_getCompanies()[0].name).toBe("New");
	});

	it("throws when company not found", async () => {
		await expect(updateCompanyMock("missing", { name: "x" })).rejects.toThrow();
	});
});

describe("deleteCompanyMock", () => {
	it("removes company from store", async () => {
		_setCompanies([makeStored("c1"), makeStored("c2")]);
		await deleteCompanyMock("c1");
		expect(_getCompanies().map((c) => c.id)).toEqual(["c2"]);
	});

	it("does not throw when company missing", async () => {
		_setCompanies([]);
		await expect(deleteCompanyMock("missing")).resolves.toBeUndefined();
	});
});

describe("createAddressMock", () => {
	it("appends new address with generated id", async () => {
		_setCompanies([makeStored("c1", { addresses: [] })]);
		const created = await createAddressMock("c1", {
			name: "Склад",
			address: "г. Подольск",
			phone: "+79993334455",
		});
		expect(created.id).toBeTruthy();
		expect(created.name).toBe("Склад");
		expect(_getCompanies()[0].addresses).toHaveLength(1);
	});
});

describe("updateAddressMock", () => {
	it("patches address fields in place", async () => {
		_setCompanies([makeStored("c1")]);
		const addressId = _getCompanies()[0].addresses[0].id;
		const updated = await updateAddressMock("c1", addressId, { name: "Обновлённый" });
		expect(updated.name).toBe("Обновлённый");
		expect(_getCompanies()[0].addresses[0].name).toBe("Обновлённый");
	});

	it("throws when address not found", async () => {
		_setCompanies([makeStored("c1")]);
		await expect(updateAddressMock("c1", "nope", { name: "x" })).rejects.toThrow();
	});
});

describe("deleteAddressMock", () => {
	it("removes address from company", async () => {
		_setCompanies([
			makeStored("c1", {
				addresses: [
					{ id: "a1", name: "A", address: "", phone: "", isMain: true },
					{ id: "a2", name: "B", address: "", phone: "", isMain: false },
				],
			}),
		]);
		await deleteAddressMock("c1", "a1");
		expect(_getCompanies()[0].addresses.map((a) => a.id)).toEqual(["a2"]);
	});
});

describe("createEmployeeMock", () => {
	it("appends new employee with generated id and default permissions", async () => {
		_setCompanies([makeStored("c1", { employees: [] })]);
		const created = await createEmployeeMock("c1", {
			firstName: "Анна",
			lastName: "Сидорова",
			patronymic: "Викторовна",
			position: "Менеджер",
			role: "user",
			phone: "+79991234567",
			email: "anna@example.com",
		});
		expect(created.id).toBeGreaterThan(0);
		expect(created.firstName).toBe("Анна");
		expect(created.permissions.employeeId).toBe(created.id);
		expect(created.permissions.procurement).toBe("none");
		expect(created.permissions.emails).toBe("none");
		expect(_getCompanies()[0].employees).toHaveLength(1);
	});
});

describe("updateEmployeeMock", () => {
	it("patches employee fields", async () => {
		_setCompanies([makeStored("c1")]);
		const empId = _getCompanies()[0].employees[0].id;
		const updated = await updateEmployeeMock("c1", empId, { position: "CEO" });
		expect(updated.position).toBe("CEO");
		expect(updated.permissions).toBeDefined();
		expect(_getCompanies()[0].employees[0].position).toBe("CEO");
	});

	it("throws when employee not found", async () => {
		_setCompanies([makeStored("c1")]);
		await expect(updateEmployeeMock("c1", 999, { position: "x" })).rejects.toThrow();
	});
});

describe("deleteEmployeeMock", () => {
	it("removes employee from company", async () => {
		_setCompanies([makeStored("c1")]);
		const empId = _getCompanies()[0].employees[0].id;
		await deleteEmployeeMock("c1", empId);
		expect(_getCompanies()[0].employees).toEqual([]);
	});
});

describe("updateEmployeePermissionsMock", () => {
	it("patches permissions and returns the new permissions object", async () => {
		_setCompanies([makeStored("c1")]);
		const empId = _getCompanies()[0].employees[0].id;
		const result = await updateEmployeePermissionsMock("c1", empId, { employees: "view" });
		expect(result.employees).toBe("view");
		expect(_getCompanies()[0].employees[0].permissions.employees).toBe("view");
	});

	it("preserves untouched permissions", async () => {
		_setCompanies([makeStored("c1")]);
		const empId = _getCompanies()[0].employees[0].id;
		const result = await updateEmployeePermissionsMock("c1", empId, { tasks: "none" });
		expect(result.tasks).toBe("none");
		expect(result.procurement).toBe("edit");
	});
});

describe("seed coherence", () => {
	it("seeds at least one main company referenced by items (company-1)", async () => {
		const result = await fetchCompaniesMock({});
		const main = result.companies.find((c) => c.id === "company-1");
		expect(main).toBeDefined();
		expect(main?.isMain).toBe(true);
	});
});
