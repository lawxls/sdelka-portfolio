import type {
	CreateEmployeeData,
	EmployeePermissions,
	EmployeeWithPermissions,
	UpdateEmployeeData,
	UpdatePermissionsData,
} from "../domains/employees";

/**
 * Public seam for the per-company employees + permissions domain. The HTTP
 * adapter is intentionally absent: the backend's `/companies/employees/`
 * endpoint requires an existing `user: UUID` FK on create, and there is no
 * permissions endpoint. The in-memory adapter keeps the seam shape stable so
 * the company drawer's Employees tab keeps working while the user-resolution
 * + invite flow stabilizes on the backend.
 */
export interface EmployeesClient {
	listByCompany(companyId: string): Promise<EmployeeWithPermissions[]>;
	create(companyId: string, data: CreateEmployeeData): Promise<EmployeeWithPermissions>;
	update(companyId: string, employeeId: string, data: UpdateEmployeeData): Promise<EmployeeWithPermissions>;
	delete(companyId: string, employeeId: string): Promise<void>;
	updatePermissions(companyId: string, employeeId: string, data: UpdatePermissionsData): Promise<EmployeePermissions>;
}
