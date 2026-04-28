import type { CompanySummary, Employee, EmployeePermissions, EmployeeRole, PermissionLevel } from "../types";

/**
 * Workspace-employees domain types — the workspace's full employee roster.
 * Backs `useWorkspaceEmployees`, `useWorkspaceEmployeeDetail`,
 * `useInviteEmployees`, `useDeleteWorkspaceEmployees`,
 * `useUpdateWorkspaceEmployee`, and `useUpdateWorkspaceEmployeePermissions`.
 *
 * Distinct from the company-employee sub-resource on `CompaniesClient`: that
 * surface enumerates the employees of a single company aggregate, while this
 * one enumerates everyone in the workspace (regardless of company membership)
 * and owns invitation lifecycle. The two domains share the underlying
 * `Employee` shape but model different things — a workspace employee carries a
 * `companies: CompanySummary[]` array because they may belong to several.
 */

export interface WorkspaceEmployee extends Employee {
	companies: CompanySummary[];
}

export type WorkspaceEmployeeDetail = WorkspaceEmployee & { permissions: EmployeePermissions };

export interface InviteEmployeeData {
	email: string;
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: EmployeeRole;
	companies: string[];
}

export interface UpdateWorkspaceEmployeeData {
	firstName?: string;
	lastName?: string;
	patronymic?: string;
	position?: string;
	role?: EmployeeRole;
	phone?: string;
}

export interface UpdatePermissionsData {
	procurement?: PermissionLevel;
	tasks?: PermissionLevel;
	companies?: PermissionLevel;
	employees?: PermissionLevel;
	emails?: PermissionLevel;
}
