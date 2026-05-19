/**
 * Employees domain types — single import surface for the per-company employees +
 * permissions seam carved out of `CompaniesClient`. The backend's employee
 * endpoint (`/api/v1/companies/employees/`) requires an existing `user: UUID`
 * FK on create and has no permissions endpoint at all, so this seam stays
 * in-memory until the invite + user-resolution flow lands.
 */
export type {
	Employee,
	EmployeePermissions,
	EmployeeRole,
	PermissionLevel,
	PermissionModuleKey,
} from "../types";

import type { Employee, EmployeePermissions, PermissionLevel } from "../types";

export type EmployeeWithPermissions = Employee & { permissions: EmployeePermissions };

export interface CreateEmployeeData {
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: Employee["role"];
	phone: string;
	email: string;
}

export interface UpdateEmployeeData {
	firstName?: string;
	lastName?: string;
	patronymic?: string;
	position?: string;
	role?: Employee["role"];
	phone?: string;
}

export interface UpdatePermissionsData {
	procurementInquiries?: PermissionLevel;
	positions?: PermissionLevel;
	tasks?: PermissionLevel;
	workspaceSettings?: PermissionLevel;
	companies?: PermissionLevel;
	employees?: PermissionLevel;
	emails?: PermissionLevel;
}
