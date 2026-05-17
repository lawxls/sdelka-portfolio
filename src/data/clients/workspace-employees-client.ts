import type { EmployeePermissions } from "../domains/employees";
import type {
	InviteEmployeeData,
	UpdatePermissionsData,
	UpdateWorkspaceEmployeeData,
	WorkspaceEmployee,
	WorkspaceEmployeeDetail,
} from "../domains/workspace-employees";

/**
 * Public seam for the workspace-employees domain. The full employee roster
 * across the active workspace, including pending invitations.
 *
 * Distinct from the per-company `EmployeesClient`, which scopes to one
 * company aggregate. A workspace employee may belong to several companies
 * (modelled via the `companies: CompanySummary[]` field).
 */
export interface WorkspaceEmployeesClient {
	list(): Promise<WorkspaceEmployee[]>;
	get(id: string): Promise<WorkspaceEmployeeDetail>;
	invite(invites: InviteEmployeeData[]): Promise<void>;
	update(id: string, data: UpdateWorkspaceEmployeeData): Promise<WorkspaceEmployeeDetail>;
	delete(ids: string[]): Promise<void>;
	updatePermissions(id: string, data: UpdatePermissionsData): Promise<EmployeePermissions>;
}
