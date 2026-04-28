import { _getCompanySummariesByIds } from "../companies-mock-data";
import type {
	InviteEmployeeData,
	UpdatePermissionsData,
	UpdateWorkspaceEmployeeData,
	WorkspaceEmployee,
	WorkspaceEmployeeDetail,
} from "../domains/workspace-employees";
import { NotFoundError } from "../errors";
import { delay, nextId } from "../mock-utils";
import { SEED_WORKSPACE_EMPLOYEES } from "../seeds/workspace-employees";
import type { EmployeePermissions } from "../types";
import type { WorkspaceEmployeesClient } from "./workspace-employees-client";

function cloneEmployee(e: WorkspaceEmployeeDetail): WorkspaceEmployeeDetail {
	return {
		...e,
		companies: e.companies.map((c) => ({ ...c, addresses: c.addresses.map((a) => ({ ...a })) })),
		permissions: { ...e.permissions },
	};
}

export interface InMemoryWorkspaceEmployeesOptions {
	/** Replace the seeded roster. Tests pass this to land on a known starting
	 * roster (e.g. just one admin) without mutating shared state. */
	seed?: WorkspaceEmployeeDetail[];
}

/**
 * Build a closure-isolated in-memory workspace-employees adapter. State
 * (the roster + the id counter for invitees) lives in the closure — every
 * call to the factory produces an independent store.
 *
 * Cross-domain note: invite() looks up `CompanySummary[]` by company id via
 * `_getCompanySummariesByIds` from the companies mock store, so an invitee's
 * `companies` array stays coherent with the companies adapter. This is the
 * only cross-store reach-in left in this domain; lifting it out would require
 * passing a `CompaniesClient` (or a slim `getSummaries` port) into the
 * factory.
 */
export function createInMemoryWorkspaceEmployeesClient(
	options?: InMemoryWorkspaceEmployeesOptions,
): WorkspaceEmployeesClient {
	let store: WorkspaceEmployeeDetail[] = (options?.seed ?? SEED_WORKSPACE_EMPLOYEES).map(cloneEmployee);
	let idCounter = 1000;
	function nextEmployeeId(): number {
		idCounter += 1;
		return idCounter;
	}

	function requireIndex(id: number): number {
		const idx = store.findIndex((e) => e.id === id);
		if (idx === -1) throw new NotFoundError({ detail: `Workspace employee ${id} not found` });
		return idx;
	}

	return {
		async list(): Promise<WorkspaceEmployee[]> {
			await delay();
			return store.map(({ permissions: _permissions, ...rest }) => ({
				...rest,
				companies: rest.companies.map((c) => ({ ...c, addresses: c.addresses.map((a) => ({ ...a })) })),
			}));
		},

		async get(id: number): Promise<WorkspaceEmployeeDetail> {
			await delay();
			return cloneEmployee(store[requireIndex(id)]);
		},

		async invite(invites: InviteEmployeeData[]): Promise<void> {
			await delay();
			for (const invite of invites) {
				const id = nextEmployeeId();
				store.push({
					id,
					firstName: invite.firstName,
					lastName: invite.lastName,
					patronymic: invite.patronymic,
					position: invite.position,
					role: invite.role,
					phone: "",
					email: invite.email,
					registeredAt: null,
					companies: _getCompanySummariesByIds(invite.companies),
					permissions: {
						id: nextId("perm-w"),
						employeeId: id,
						procurement: "none",
						tasks: "none",
						companies: "none",
						employees: "none",
						emails: "none",
					},
				});
			}
		},

		async update(id: number, data: UpdateWorkspaceEmployeeData): Promise<WorkspaceEmployeeDetail> {
			await delay();
			const idx = requireIndex(id);
			store[idx] = { ...store[idx], ...data };
			return cloneEmployee(store[idx]);
		},

		async delete(ids: number[]): Promise<void> {
			await delay();
			const toRemove = new Set(ids);
			store = store.filter((e) => {
				if (!toRemove.has(e.id)) return true;
				return e.role !== "user";
			});
		},

		async updatePermissions(id: number, data: UpdatePermissionsData): Promise<EmployeePermissions> {
			await delay();
			const idx = requireIndex(id);
			const updated = { ...store[idx].permissions, ...data };
			store[idx] = { ...store[idx], permissions: updated };
			return { ...updated };
		},
	};
}
