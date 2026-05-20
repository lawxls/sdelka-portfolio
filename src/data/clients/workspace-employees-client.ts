import type { EmployeePermissions } from "../domains/employees";
import type {
	InviteEmployeeData,
	UpdatePermissionsData,
	UpdateWorkspaceEmployeeData,
	WorkspaceEmployee,
	WorkspaceEmployeeDetail,
} from "../domains/workspace-employees";

/** Per-row failure reasons surfaced by the bulk archive (`POST .../delete/`).
 * `not_found` is treated as a silent drop; the other codes drive an inline
 * toast so the admin can act. */
export type DeleteFailureCode = "not_found" | "cannot_archive_owner" | "cannot_archive_admin";

export interface DeleteWorkspaceEmployeesResult {
	archived: string[];
	failed: Array<{ id: string; code: DeleteFailureCode }>;
}

/**
 * Public seam for the workspace-employees domain. The full employee roster
 * across the active workspace, including pending invitations.
 *
 * Distinct from the per-company `EmployeesClient`, which scopes to one
 * company aggregate. A workspace employee may belong to several companies
 * (modelled via the `companies: CompanySummary[]` field).
 *
 * Wire-level: `list()` unwraps the cursor-paginated `.results`; `invite()`
 * returns the freshly-created `WorkspaceEmployee[]` for optimistic insertion;
 * `delete()` returns a per-row archive/failure breakdown.
 */
export interface WorkspaceEmployeesClient {
	list(): Promise<WorkspaceEmployee[]>;
	get(id: string): Promise<WorkspaceEmployeeDetail>;
	invite(invites: InviteEmployeeData[]): Promise<WorkspaceEmployee[]>;
	update(id: string, data: UpdateWorkspaceEmployeeData): Promise<WorkspaceEmployeeDetail>;
	delete(ids: string[]): Promise<DeleteWorkspaceEmployeesResult>;
	updatePermissions(id: string, data: UpdatePermissionsData): Promise<EmployeePermissions>;
}
