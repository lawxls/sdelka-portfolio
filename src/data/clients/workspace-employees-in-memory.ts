import type { EmployeePermissions } from "../domains/companies";
import type {
	InviteEmployeeData,
	UpdatePermissionsData,
	UpdateWorkspaceEmployeeData,
	WorkspaceEmployee,
	WorkspaceEmployeeDetail,
} from "../domains/workspace-employees";
import { NotFoundError } from "../errors";
import {
	_setWorkspaceEmployees,
	deleteWorkspaceEmployeesMock,
	fetchWorkspaceEmployeeMock,
	fetchWorkspaceEmployeesMock,
	inviteEmployeesMock,
	updateWorkspaceEmployeeMock,
	updateWorkspaceEmployeePermissionsMock,
} from "../workspace-mock-data";
import type { WorkspaceEmployeesClient } from "./workspace-employees-client";

// The legacy mocks throw a generic Error("Workspace employee X not found") for
// unknown ids. Translate to NotFoundError so the in-memory and HTTP adapters
// surface the same typed error.
async function translateNotFound<T>(promise: Promise<T>, id: number): Promise<T> {
	try {
		return await promise;
	} catch (err) {
		if (err instanceof Error && err.message.includes(`${id} not found`)) {
			throw new NotFoundError({ detail: err.message });
		}
		throw err;
	}
}

export interface InMemoryWorkspaceEmployeesOptions {
	/** Replace the module-level mock store at construction time. Tests pass this
	 * to land on a known roster without reaching into `_setWorkspaceEmployees`
	 * directly. */
	seed?: WorkspaceEmployeeDetail[];
}

/**
 * Build an in-memory workspace-employees adapter wrapping the module-level
 * workspace mock store. Singleton-wrapping (rather than closure isolation) is
 * the right shape here because `workspace-mock-data` is shared with the
 * profile / invitations / company-info domains until #250 dissolves it. Once
 * those splits land, this can become closure-isolated.
 */
export function createInMemoryWorkspaceEmployeesClient(
	options?: InMemoryWorkspaceEmployeesOptions,
): WorkspaceEmployeesClient {
	if (options?.seed !== undefined) _setWorkspaceEmployees(options.seed);

	return {
		async list(): Promise<WorkspaceEmployee[]> {
			return fetchWorkspaceEmployeesMock();
		},

		async get(id: number): Promise<WorkspaceEmployeeDetail> {
			return translateNotFound(fetchWorkspaceEmployeeMock(id), id);
		},

		async invite(invites: InviteEmployeeData[]): Promise<void> {
			return inviteEmployeesMock(invites);
		},

		async update(id: number, data: UpdateWorkspaceEmployeeData): Promise<WorkspaceEmployeeDetail> {
			return translateNotFound(updateWorkspaceEmployeeMock(id, data), id);
		},

		async delete(ids: number[]): Promise<void> {
			return deleteWorkspaceEmployeesMock(ids);
		},

		async updatePermissions(id: number, data: UpdatePermissionsData): Promise<EmployeePermissions> {
			return translateNotFound(updateWorkspaceEmployeePermissionsMock(id, data), id);
		},
	};
}
