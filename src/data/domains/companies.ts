/**
 * Companies domain types — the single import surface for components and clients.
 * Behavior, fixtures, and helpers live elsewhere; this module is types-only.
 */
export type {
	Address,
	AddressSummary,
	Company,
	CompanySortField,
	CompanySortState,
	CompanySummary,
	Employee,
	EmployeePermissions,
	EmployeeRole,
	PermissionLevel,
	PermissionModuleKey,
} from "../types";

import type { CompanySortState, Employee, EmployeePermissions, PermissionLevel } from "../types";

export type { CursorPage } from "./shared";

export interface ListCompaniesParams {
	q?: string;
	sort?: CompanySortState["field"];
	dir?: CompanySortState["direction"];
	cursor?: string;
	limit?: number;
}

export interface CreateAddressData {
	name: string;
	address: string;
	phone: string;
	isMain?: boolean;
}

export interface CreateCompanyPayload {
	name: string;
	website?: string;
	description?: string;
	additionalComments?: string;
	address: CreateAddressData;
}

export interface UpdateCompanyData {
	name?: string;
	website?: string;
	description?: string;
	additionalComments?: string;
}

export interface UpdateAddressData {
	name?: string;
	address?: string;
	phone?: string;
	isMain?: boolean;
}

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
	procurement?: PermissionLevel;
	tasks?: PermissionLevel;
	companies?: PermissionLevel;
	employees?: PermissionLevel;
	emails?: PermissionLevel;
}

export type EmployeeWithPermissions = Employee & { permissions: EmployeePermissions };
