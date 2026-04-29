import type {
	Address,
	Company,
	CompanySummary,
	CreateAddressData,
	CreateCompanyPayload,
	CreateEmployeeData,
	CursorPage,
	EmployeePermissions,
	EmployeeWithPermissions,
	ListCompaniesParams,
	UpdateAddressData,
	UpdateCompanyData,
	UpdateEmployeeData,
	UpdatePermissionsData,
} from "../domains/companies";

/**
 * Public seam for the companies domain. Implementations are in-memory (mock store)
 * or HTTP. Hooks pull this through context, so swapping adapters is a one-line
 * change in the composition root.
 */
export interface CompaniesClient {
	list(params: ListCompaniesParams): Promise<CursorPage<CompanySummary>>;
	listAll(): Promise<CompanySummary[]>;
	get(id: string): Promise<Company>;
	create(data: CreateCompanyPayload): Promise<Company>;
	update(id: string, data: UpdateCompanyData): Promise<Company>;
	delete(id: string): Promise<void>;

	createAddress(companyId: string, data: CreateAddressData): Promise<Address>;
	updateAddress(companyId: string, addressId: string, data: UpdateAddressData): Promise<Address>;
	deleteAddress(companyId: string, addressId: string): Promise<void>;

	createEmployee(companyId: string, data: CreateEmployeeData): Promise<EmployeeWithPermissions>;
	updateEmployee(companyId: string, employeeId: number, data: UpdateEmployeeData): Promise<EmployeeWithPermissions>;
	deleteEmployee(companyId: string, employeeId: number): Promise<void>;
	updateEmployeePermissions(
		companyId: string,
		employeeId: number,
		data: UpdatePermissionsData,
	): Promise<EmployeePermissions>;
}
