import type {
	Address,
	Company,
	CompanySummary,
	CreateAddressData,
	CreateCompanyPayload,
	CursorPage,
	ListCompaniesParams,
	UpdateAddressData,
	UpdateCompanyData,
} from "../domains/companies";

/**
 * Public seam for the companies + addresses domain. Implementations are
 * in-memory (a test fake) or HTTP (production). Hooks pull this through
 * context, so swapping adapters is a one-line change in the composition root.
 *
 * Employees + per-module permissions live on a separate `EmployeesClient` —
 * the backend's `/companies/employees/` endpoint requires an existing user FK
 * on create and has no permissions endpoint, so that domain stays in-memory
 * until the invite/user-resolution flow lands. See `employees-client.ts`.
 */
export interface CompaniesClient {
	list(params: ListCompaniesParams): Promise<CursorPage<CompanySummary>>;
	listAll(): Promise<CompanySummary[]>;
	get(id: string): Promise<Company>;
	create(data: CreateCompanyPayload): Promise<Company>;
	update(id: string, data: UpdateCompanyData): Promise<Company>;
	/** Archive a single company. Backend rejects the call when the workspace
	 * would be left with zero active companies. */
	archive(id: string): Promise<void>;
	delete(id: string): Promise<void>;

	createAddress(companyId: string, data: CreateAddressData): Promise<Address>;
	updateAddress(companyId: string, addressId: string, data: UpdateAddressData): Promise<Address>;
	deleteAddress(companyId: string, addressId: string): Promise<void>;

	/** Multipart upload (POST) to `/companies/{id}/card/`. Replaces any
	 * existing card file on the company. Returns the refreshed company. */
	uploadCard(companyId: string, file: File): Promise<Company>;
	/** Removes the card file. Idempotent: deleting an empty card is a no-op. */
	deleteCard(companyId: string): Promise<Company>;
}
