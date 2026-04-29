import { describe, expect, it } from "vitest";
import type { WorkspaceEmployee } from "@/data/domains/workspace-employees";
import type { WorkspaceEmail } from "@/data/emails-mock-data";
import type { Supplier } from "@/data/supplier-types";
import type { Task } from "@/data/task-types";
import type { CompanySummary, ProcurementItem } from "@/data/types";
import { makeCompany, makeItem, makeSupplier, makeTask } from "@/test-utils";
import { matchGlobal } from "./global-search-matcher";

function makeEmployee(id: number, overrides: Partial<WorkspaceEmployee> = {}): WorkspaceEmployee {
	return {
		id,
		firstName: "Иван",
		lastName: "Иванов",
		patronymic: "Иванович",
		position: "Менеджер",
		role: "user",
		phone: "+79991234567",
		email: `employee${id}@example.com`,
		registeredAt: "2024-01-15T10:00:00Z",
		companies: [],
		...overrides,
	};
}

function makeInbox(id: string, email: string): WorkspaceEmail {
	return { id, email, status: "active", type: "corporate", sentCount: 0 };
}

const EMPTY = {
	items: [] as ProcurementItem[],
	suppliers: [] as Supplier[],
	tasks: [] as Task[],
	employees: [] as WorkspaceEmployee[],
	companies: [] as CompanySummary[],
	inboxes: [] as WorkspaceEmail[],
	isPrivileged: true,
	limit: 5,
};

describe("matchGlobal", () => {
	it("returns no groups when query is empty after trim", () => {
		const groups = matchGlobal({ ...EMPTY, query: "   " });
		expect(groups).toEqual([]);
	});

	it("returns no groups when query length < 3 chars after trim", () => {
		const groups = matchGlobal({
			...EMPTY,
			query: "га",
			items: [makeItem("1", { name: "Газобетон" })],
		});
		expect(groups).toEqual([]);
	});

	it("matches procurement items by name, case-insensitive", () => {
		const groups = matchGlobal({
			...EMPTY,
			query: "ГАЗ",
			items: [makeItem("1", { name: "Газобетон D400" }), makeItem("2", { name: "Полотно ПВД" })],
		});
		const items = groups.find((g) => g.group === "items");
		expect(items?.results.map((r) => r.id)).toEqual(["1"]);
		expect(items?.results[0].name).toBe("Газобетон D400");
		expect(items?.results[0].href).toBe("/procurement?item=1");
	});

	it("matches suppliers by name, email, website", () => {
		const suppliers = [
			makeSupplier("s1", { companyName: "GazPromSbyt", inn: "1111111111" }),
			makeSupplier("s2", { companyName: "Ромашка", email: "info@gazprom.ru", inn: "2222222222" }),
			makeSupplier("s3", { companyName: "Ромашка", website: "https://gaz-invest.ru", inn: "3333333333" }),
			makeSupplier("s4", { companyName: "Неподходящий", email: "x@x.ru", website: "https://x.ru", inn: "4444444444" }),
		];
		const groups = matchGlobal({ ...EMPTY, query: "gaz", suppliers });
		const sup = groups.find((g) => g.group === "suppliers");
		expect(sup?.results.map((r) => r.id).sort()).toEqual(["s1", "s2", "s3"]);
	});

	it("does not match suppliers by INN and does not expose INN in results", () => {
		const suppliers = [makeSupplier("s1", { companyName: "Ромашка", inn: "7712345678" })];
		const groups = matchGlobal({ ...EMPTY, query: "7712", suppliers });
		expect(groups.find((g) => g.group === "suppliers")).toBeUndefined();

		const nameHit = matchGlobal({ ...EMPTY, query: "ромашка", suppliers });
		const row = nameHit.find((g) => g.group === "suppliers")?.results[0];
		expect(row?.meta).toBeUndefined();
	});

	it("attaches supplier status to each supplier result", () => {
		const suppliers = [
			makeSupplier("s1", { companyName: "test A", status: "new", inn: "1111111111" }),
			makeSupplier("s2", { companyName: "test B", status: "переговоры", inn: "2222222222" }),
			makeSupplier("s3", { companyName: "test C", status: "получено_кп", inn: "3333333333" }),
		];
		const groups = matchGlobal({ ...EMPTY, query: "test", suppliers });
		const sup = groups.find((g) => g.group === "suppliers");
		expect(sup?.results.find((r) => r.id === "s1")).toMatchObject({ status: "new" });
		expect(sup?.results.find((r) => r.id === "s2")).toMatchObject({ status: "переговоры" });
		expect(sup?.results.find((r) => r.id === "s3")).toMatchObject({ status: "получено_кп" });
	});

	it("collapses the same supplier across items into one result by INN", () => {
		const suppliers = [
			makeSupplier("s1", { companyName: "ТД Дубликат", itemId: "item-2", status: "кп_запрошено", inn: "7755443322" }),
			makeSupplier("s2", { companyName: "ТД Дубликат", itemId: "item-3", status: "получено_кп", inn: "7755443322" }),
			makeSupplier("s3", { companyName: "ТД Дубликат", itemId: "item-4", status: "отказ", inn: "7755443322" }),
			makeSupplier("s4", { companyName: "Другой поставщик", itemId: "item-2", status: "new", inn: "9999999999" }),
		];
		const groups = matchGlobal({ ...EMPTY, query: "дубликат", suppliers });
		const sup = groups.find((g) => g.group === "suppliers");
		expect(sup?.results).toHaveLength(1);
		// Prefers the получено_кп instance (s2), whose drawer shows all offers.
		expect(sup?.results[0]).toMatchObject({ id: "s2", status: "получено_кп" });
		// Opens the supplier drawer directly — no item= param, so the item drawer
		// stays closed behind the supplier drawer.
		expect(sup?.results[0].href).toBe("/procurement?supplier=s2&supplier_tab=offers");
	});

	it("supplier href opens the detail drawer without the item drawer for non-new statuses", () => {
		const suppliers = [
			makeSupplier("s1", { companyName: "Alphacorp", itemId: "item-2", status: "получено_кп", inn: "1111111111" }),
			makeSupplier("s2", { companyName: "Alphabeta", itemId: "item-3", status: "переговоры", inn: "2222222222" }),
			makeSupplier("s3", { companyName: "Alphagamma", itemId: "item-4", status: "new", inn: "3333333333" }),
		];
		const groups = matchGlobal({ ...EMPTY, query: "alpha", suppliers });
		const byId = Object.fromEntries(
			(groups.find((g) => g.group === "suppliers")?.results ?? []).map((r) => [r.id, r.href]),
		);
		expect(byId.s1).toBe("/procurement?supplier=s1&supplier_tab=offers");
		expect(byId.s2).toBe("/procurement?supplier=s2&supplier_tab=info");
		// "new" candidates lack a detail drawer — fall back to the item's suppliers tab.
		expect(byId.s3).toBe("/procurement?item=item-4&tab=suppliers");
	});

	it("matches tasks by title", () => {
		const tasks = [makeTask("t1", { name: "Уточнить цену на газобетон" }), makeTask("t2", { name: "Прочее" })];
		const groups = matchGlobal({ ...EMPTY, query: "газ", tasks });
		const g = groups.find((gr) => gr.group === "tasks");
		expect(g?.results.map((r) => r.id)).toEqual(["t1"]);
		expect(g?.results[0].href).toBe("/tasks?task=t1");
	});

	it("matches employees by full name and email", () => {
		const employees = [
			makeEmployee(1, { firstName: "Иван", lastName: "Петров", patronymic: "", email: "petrov@corp.ru" }),
			makeEmployee(2, { firstName: "Пётр", lastName: "Иванов", patronymic: "", email: "ivanov@corp.ru" }),
			makeEmployee(3, { firstName: "Мария", lastName: "Сидорова", patronymic: "", email: "ivan.s@corp.ru" }),
			makeEmployee(4, { firstName: "Алексей", lastName: "Смирнов", patronymic: "", email: "a@s.ru" }),
		];
		const groups = matchGlobal({ ...EMPTY, query: "иван", employees });
		const g = groups.find((gr) => gr.group === "employees");
		expect(g?.results.map((r) => r.id).sort()).toEqual(["1", "2"]);
		const groupsLatin = matchGlobal({ ...EMPTY, query: "ivan", employees });
		expect(
			groupsLatin
				.find((gr) => gr.group === "employees")
				?.results.map((r) => r.id)
				.sort(),
		).toEqual(["2", "3"]);
	});

	it("matches companies by name", () => {
		const groups = matchGlobal({
			...EMPTY,
			query: "ормат",
			companies: [makeCompany("company-1", { name: "ОРМАТЕК" }), makeCompany("company-2", { name: "Прочее" })],
		});
		const g = groups.find((gr) => gr.group === "companies");
		expect(g?.results.map((r) => r.id)).toEqual(["company-1"]);
		expect(g?.results[0].href).toBe("/settings/companies?company=company-1");
	});

	it("matches inboxes by email", () => {
		const groups = matchGlobal({
			...EMPTY,
			query: "ormatek",
			inboxes: [makeInbox("e1", "procurement@ormatek.com"), makeInbox("e2", "foo@other.ru")],
		});
		const g = groups.find((gr) => gr.group === "inboxes");
		expect(g?.results.map((r) => r.id)).toEqual(["e1"]);
		expect(g?.results[0].href).toBe("/settings/emails");
	});

	it("hides employees/companies/inboxes for non-privileged users", () => {
		const groups = matchGlobal({
			...EMPTY,
			query: "ivan",
			isPrivileged: false,
			employees: [makeEmployee(1, { firstName: "Ivan" })],
			companies: [makeCompany("company-ivan", { name: "IvanCo" })],
			inboxes: [makeInbox("e1", "ivan@corp.ru")],
		});
		expect(groups.find((g) => g.group === "employees")).toBeUndefined();
		expect(groups.find((g) => g.group === "companies")).toBeUndefined();
		expect(groups.find((g) => g.group === "inboxes")).toBeUndefined();
	});

	it("returns groups in fixed order: items, suppliers, tasks, employees, companies, inboxes", () => {
		const groups = matchGlobal({
			...EMPTY,
			query: "test",
			items: [makeItem("1", { name: "test item" })],
			suppliers: [makeSupplier("s1", { companyName: "test sup" })],
			tasks: [makeTask("t1", { name: "test task" })],
			employees: [makeEmployee(1, { firstName: "test" })],
			companies: [makeCompany("c1", { name: "test co" })],
			inboxes: [makeInbox("e1", "test@x.ru")],
		});
		expect(groups.map((g) => g.group)).toEqual(["items", "suppliers", "tasks", "employees", "companies", "inboxes"]);
	});

	it("omits groups with zero results", () => {
		const groups = matchGlobal({
			...EMPTY,
			query: "газ",
			items: [makeItem("1", { name: "Газобетон" })],
			tasks: [makeTask("t1", { name: "Прочее" })],
		});
		expect(groups.map((g) => g.group)).toEqual(["items"]);
	});

	it("does not truncate results (consumer applies per-group cap)", () => {
		const items = Array.from({ length: 12 }, (_, i) => makeItem(`${i + 1}`, { name: `газ ${i + 1}` }));
		const groups = matchGlobal({ ...EMPTY, query: "газ", items });
		expect(groups.find((g) => g.group === "items")?.results).toHaveLength(12);
	});
});
