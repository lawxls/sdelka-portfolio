import type { CompanySummary } from "../domains/companies";
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

/**
 * Slim port for resolving company summaries by id. Production wires this to the
 * active companies client so an invitee's `companies` array stays coherent
 * with whatever adapter is selected; tests can inject a stub or default to []. */
export type GetCompanySummariesByIds = (ids: string[]) => Promise<CompanySummary[]>;

export interface InMemoryWorkspaceEmployeesOptions {
	/** Replace the seeded roster. Tests pass this to land on a known starting
	 * roster (e.g. just one admin) without mutating shared state. */
	seed?: WorkspaceEmployeeDetail[];
	/** Resolves the invitee's `CompanySummary[]` from the active companies source.
	 * Defaults to a no-op `() => []` so tests don't need to wire it. Production
	 * wires this to the active CompaniesClient via `clients-config.ts`. */
	getCompanySummaries?: GetCompanySummariesByIds;
}

/**
 * Build a closure-isolated in-memory workspace-employees adapter. State
 * (the roster + the id counter for invitees) lives in the closure — every
 * call to the factory produces an independent store.
 *
 * Cross-domain note: invite() resolves `CompanySummary[]` for the invitee via
 * the injected `getCompanySummaries` port. The composition root binds it to
 * the active companies adapter so company creates/updates done through the
 * app are reflected in invitee assignments.
 */
export function createInMemoryWorkspaceEmployeesClient(
	options?: InMemoryWorkspaceEmployeesOptions,
): WorkspaceEmployeesClient {
	let store: WorkspaceEmployeeDetail[] = (options?.seed ?? SEED_WORKSPACE_EMPLOYEES).map(cloneEmployee);
	let idCounter = 1000;
	const getCompanySummaries: GetCompanySummariesByIds = options?.getCompanySummaries ?? (async () => []);
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
				const companies = invite.companies.length > 0 ? await getCompanySummaries(invite.companies) : [];
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
					companies,
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
