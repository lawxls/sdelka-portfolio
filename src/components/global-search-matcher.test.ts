import { describe, expect, it } from "vitest";
import type { WorkspaceEmail } from "@/data/emails-mock-data";
import type { SearchSupplier } from "@/data/search-supplier-types";
import type { Supplier } from "@/data/supplier-types";
import type { Task } from "@/data/task-types";
import type { CompanySummary, ProcurementItem } from "@/data/types";
import type { WorkspaceEmployee } from "@/data/workspace-mock-data";
import { makeCompany, makeItem, makeSupplier, makeTask } from "@/test-utils";
import { matchGlobal } from "./global-search-matcher";

function makeSearchSupplier(id: string, overrides: Partial<SearchSupplier> = {}): SearchSupplier {
	return {
		id,
		itemId: "item-1",
		companyName: `Кандидат ${id}`,
		inn: "7701000001",
		website: "https://example.ru",
		companyType: "производитель",
		region: "Москва",
		foundedYear: 2010,
		revenue: 100_000_000,
		requestStatus: "new",
		archived: false,
		...overrides,
	};
}

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
		isResponsible: false,
		registeredAt: "2024-01-15T10:00:00Z",
		companies: [],
		...overrides,
	};
}

function makeInbox(id: string, email: string): WorkspaceEmail {
	return { id, email, status: "active", sentCount: 0 };
}

const EMPTY = {
	items: [] as ProcurementItem[],
	pipelineSuppliers: [] as Supplier[],
	searchSuppliers: [] as SearchSupplier[],
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

	it("matches pipeline suppliers by name, email, website", () => {
		const suppliers = [
			makeSupplier("s1", { companyName: "GazPromSbyt" }),
			makeSupplier("s2", { companyName: "Ромашка", email: "info@gazprom.ru" }),
			makeSupplier("s3", { companyName: "Ромашка", website: "https://gaz-invest.ru" }),
			makeSupplier("s4", { companyName: "Неподходящий", email: "x@x.ru", website: "https://x.ru" }),
		];
		const groups = matchGlobal({ ...EMPTY, query: "gaz", pipelineSuppliers: suppliers });
		const sup = groups.find((g) => g.group === "suppliers");
		expect(sup?.results.map((r) => r.id).sort()).toEqual(["s1", "s2", "s3"]);
	});

	it("matches search-supplier candidates by name, website, inn; href routes to candidates tab", () => {
		const candidates = [
			makeSearchSupplier("c1", { companyName: "ГазПром", itemId: "item-5" }),
			makeSearchSupplier("c2", { inn: "7712345678", itemId: "item-6" }),
			makeSearchSupplier("c3", { website: "https://gaz.ru", itemId: "item-7" }),
		];
		const groups = matchGlobal({ ...EMPTY, query: "7712", searchSuppliers: candidates });
		const sup = groups.find((g) => g.group === "suppliers");
		expect(sup?.results.map((r) => r.id)).toEqual(["c2"]);
		expect(sup?.results[0].href).toBe("/procurement?item=item-6&tab=search");
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
			pipelineSuppliers: [makeSupplier("s1", { companyName: "test sup" })],
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

	it("tags pipeline suppliers as «source: pipeline» and candidates as «source: candidate»", () => {
		const groups = matchGlobal({
			...EMPTY,
			query: "test",
			pipelineSuppliers: [makeSupplier("s1", { companyName: "test pipe" })],
			searchSuppliers: [makeSearchSupplier("c1", { companyName: "test cand" })],
		});
		const sup = groups.find((g) => g.group === "suppliers");
		expect(sup?.results).toHaveLength(2);
		const s1 = sup?.results.find((r) => r.id === "s1");
		const c1 = sup?.results.find((r) => r.id === "c1");
		expect(s1).toMatchObject({ source: "pipeline" });
		expect(c1).toMatchObject({ source: "candidate" });
	});
});
