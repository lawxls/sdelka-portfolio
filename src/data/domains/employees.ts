/**
 * Employees domain — shared scalar types used by both the workspace-employees
 * seam (`WorkspaceEmployeesClient`) and the permissions matrix UI. The full
 * roster + per-module permissions flow lives on `./workspace-employees.ts`;
 * everything per-company is filtered via `WorkspaceEmployeesClient.list({
 * company })`.
 */
export type { EmployeePermissions, EmployeeRole, PermissionLevel, PermissionModuleKey } from "../types";
