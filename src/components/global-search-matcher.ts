import type { WorkspaceEmail } from "@/data/emails-mock-data";
import type { SearchSupplier } from "@/data/search-supplier-types";
import type { Supplier } from "@/data/supplier-types";
import type { Task } from "@/data/task-types";
import type { CompanySummary, ProcurementItem } from "@/data/types";
import type { WorkspaceEmployee } from "@/data/workspace-mock-data";

export const MIN_QUERY_LENGTH = 3;

export type GlobalSearchGroup = "items" | "suppliers" | "tasks" | "employees" | "companies" | "inboxes";

export const GROUP_LABELS: Record<GlobalSearchGroup, string> = {
	items: "Позиции",
	suppliers: "Поставщики",
	tasks: "Задачи",
	employees: "Сотрудники",
	companies: "Компании",
	inboxes: "Ящики",
};

interface ResultBase {
	id: string;
	name: string;
	meta?: string;
	href: string;
}

export type SupplierSource = "pipeline" | "candidate";

export interface ItemResult extends ResultBase {
	group: "items";
}
export interface SupplierResult extends ResultBase {
	group: "suppliers";
	source: SupplierSource;
}
export interface TaskResult extends ResultBase {
	group: "tasks";
}
export interface EmployeeResult extends ResultBase {
	group: "employees";
}
export interface CompanyResult extends ResultBase {
	group: "companies";
}
export interface InboxResult extends ResultBase {
	group: "inboxes";
}

export type SearchResult = ItemResult | SupplierResult | TaskResult | EmployeeResult | CompanyResult | InboxResult;

export interface GroupResult {
	group: GlobalSearchGroup;
	results: SearchResult[];
}

export interface MatchInput {
	query: string;
	items: ProcurementItem[];
	pipelineSuppliers: Supplier[];
	searchSuppliers: SearchSupplier[];
	tasks: Task[];
	employees: WorkspaceEmployee[];
	companies: CompanySummary[];
	inboxes: WorkspaceEmail[];
	isPrivileged: boolean;
}

function includesCI(haystack: string | undefined | null, needleLower: string): boolean {
	return haystack ? haystack.toLowerCase().includes(needleLower) : false;
}

function collect<T, R extends SearchResult>(source: T[], match: (row: T) => boolean, project: (row: T) => R): R[] {
	const out: R[] = [];
	for (const row of source) {
		if (match(row)) out.push(project(row));
	}
	return out;
}

export function matchGlobal(input: MatchInput): GroupResult[] {
	const trimmed = input.query.trim();
	if (trimmed.length < MIN_QUERY_LENGTH) return [];

	const q = trimmed.toLowerCase();
	const groups: GroupResult[] = [];

	const items = collect<ProcurementItem, ItemResult>(
		input.items,
		(i) => includesCI(i.name, q),
		(i) => ({
			group: "items",
			id: i.id,
			name: i.name,
			meta: undefined,
			href: `/procurement?item=${encodeURIComponent(i.id)}`,
		}),
	);
	if (items.length > 0) groups.push({ group: "items", results: items });

	const pipelineSups = collect<Supplier, SupplierResult>(
		input.pipelineSuppliers,
		(s) => includesCI(s.companyName, q) || includesCI(s.email, q) || includesCI(s.website, q),
		(s) => ({
			group: "suppliers",
			source: "pipeline",
			id: s.id,
			name: s.companyName,
			meta: s.website || s.email || undefined,
			href: `/procurement?item=${encodeURIComponent(s.itemId)}&supplier=${encodeURIComponent(s.id)}`,
		}),
	);
	const candidateSups = collect<SearchSupplier, SupplierResult>(
		input.searchSuppliers,
		(s) => includesCI(s.companyName, q) || includesCI(s.website, q) || s.inn.includes(trimmed),
		(s) => ({
			group: "suppliers",
			source: "candidate",
			id: s.id,
			name: s.companyName,
			meta: s.inn || s.website || undefined,
			href: `/procurement?item=${encodeURIComponent(s.itemId)}&tab=search`,
		}),
	);
	const suppliers = [...pipelineSups, ...candidateSups];
	if (suppliers.length > 0) groups.push({ group: "suppliers", results: suppliers });

	const tasks = collect<Task, TaskResult>(
		input.tasks,
		(t) => includesCI(t.name, q),
		(t) => ({
			group: "tasks",
			id: t.id,
			name: t.name,
			meta: t.item?.name,
			href: `/tasks?task=${encodeURIComponent(t.id)}`,
		}),
	);
	if (tasks.length > 0) groups.push({ group: "tasks", results: tasks });

	if (input.isPrivileged) {
		const employees = collect<WorkspaceEmployee, EmployeeResult>(
			input.employees,
			(e) => {
				const full = `${e.lastName} ${e.firstName} ${e.patronymic ?? ""}`.trim();
				return includesCI(full, q) || includesCI(e.email, q);
			},
			(e) => ({
				group: "employees",
				id: String(e.id),
				name: `${e.lastName} ${e.firstName}`.trim(),
				meta: e.email,
				href: `/settings/employees?employee=${encodeURIComponent(String(e.id))}`,
			}),
		);
		if (employees.length > 0) groups.push({ group: "employees", results: employees });

		const companies = collect<CompanySummary, CompanyResult>(
			input.companies,
			(c) => includesCI(c.name, q),
			(c) => ({
				group: "companies",
				id: c.id,
				name: c.name,
				meta: undefined,
				href: `/settings/companies?company=${encodeURIComponent(c.id)}`,
			}),
		);
		if (companies.length > 0) groups.push({ group: "companies", results: companies });

		const inboxes = collect<WorkspaceEmail, InboxResult>(
			input.inboxes,
			(e) => includesCI(e.email, q),
			(e) => ({
				group: "inboxes",
				id: e.id,
				name: e.email,
				meta: undefined,
				href: "/settings/emails",
			}),
		);
		if (inboxes.length > 0) groups.push({ group: "inboxes", results: inboxes });
	}

	return groups;
}
