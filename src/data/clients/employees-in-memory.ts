import type {
	CreateEmployeeData,
	EmployeePermissions,
	EmployeeWithPermissions,
	UpdateEmployeeData,
	UpdatePermissionsData,
} from "../domains/employees";
import { NotFoundError } from "../errors";
import { delay, nextId } from "../mock-utils";
import type { EmployeesClient } from "./employees-client";

export interface InMemoryEmployeesSeed {
	companyId: string;
	employee: EmployeeWithPermissions;
}

export interface InMemoryEmployeesOptions {
	/** Optional seed roster keyed by `companyId`. Tests pass this to land on a
	 * known starting state without mutating shared state. */
	seed?: InMemoryEmployeesSeed[];
}

function clone(e: EmployeeWithPermissions): EmployeeWithPermissions {
	return { ...e, permissions: { ...e.permissions } };
}

/**
 * Build a closure-isolated in-memory employees adapter. State (the roster per
 * company + the id counter) lives in the closure — every call to the factory
 * produces an independent store, so test fixtures don't bleed across tests.
 */
export function createInMemoryEmployeesClient(options: InMemoryEmployeesOptions = {}): EmployeesClient {
	const byCompany = new Map<string, EmployeeWithPermissions[]>();
	for (const { companyId, employee } of options.seed ?? []) {
		const list = byCompany.get(companyId) ?? [];
		list.push(clone(employee));
		byCompany.set(companyId, list);
	}
	let idCounter = 1000;

	function nextEmployeeId(): string {
		idCounter += 1;
		return String(idCounter);
	}

	function ensureList(companyId: string): EmployeeWithPermissions[] {
		const existing = byCompany.get(companyId);
		if (existing) return existing;
		const fresh: EmployeeWithPermissions[] = [];
		byCompany.set(companyId, fresh);
		return fresh;
	}

	return {
		async listByCompany(companyId: string): Promise<EmployeeWithPermissions[]> {
			await delay();
			return (byCompany.get(companyId) ?? []).map(clone);
		},

		async create(companyId: string, data: CreateEmployeeData): Promise<EmployeeWithPermissions> {
			await delay();
			const list = ensureList(companyId);
			const id = nextEmployeeId();
			const employee: EmployeeWithPermissions = {
				id,
				firstName: data.firstName,
				lastName: data.lastName,
				patronymic: data.patronymic,
				position: data.position,
				role: data.role,
				phone: data.phone,
				email: data.email,
				permissions: {
					id: nextId("perm"),
					employeeId: id,
					procurementInquiries: "none",
					positions: "none",
					tasks: "none",
					workspaceSettings: "none",
					companies: "none",
					employees: "none",
					emails: "none",
				},
			};
			list.push(employee);
			return clone(employee);
		},

		async update(companyId: string, employeeId: string, data: UpdateEmployeeData): Promise<EmployeeWithPermissions> {
			await delay();
			const list = byCompany.get(companyId) ?? [];
			const idx = list.findIndex((e) => e.id === employeeId);
			if (idx === -1) throw new NotFoundError({ companyId, employeeId });
			list[idx] = { ...list[idx], ...data };
			return clone(list[idx]);
		},

		async delete(companyId: string, employeeId: string): Promise<void> {
			await delay();
			const list = byCompany.get(companyId);
			if (!list) return;
			byCompany.set(
				companyId,
				list.filter((e) => e.id !== employeeId),
			);
		},

		async updatePermissions(
			companyId: string,
			employeeId: string,
			data: UpdatePermissionsData,
		): Promise<EmployeePermissions> {
			await delay();
			const list = byCompany.get(companyId) ?? [];
			const idx = list.findIndex((e) => e.id === employeeId);
			if (idx === -1) throw new NotFoundError({ companyId, employeeId });
			const updated = { ...list[idx].permissions, ...data };
			list[idx] = { ...list[idx], permissions: updated };
			return { ...updated };
		},
	};
}
