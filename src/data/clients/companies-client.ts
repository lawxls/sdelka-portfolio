import type {
	Address,
	Company,
	CompanyLookup,
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
 * Employees + per-module permissions live on the workspace-employees seam
 * (`WorkspaceEmployeesClient`). The per-company view in the company drawer
 * filters that endpoint by `?company=<UUID>`.
 */
export interface CompaniesClient {
	list(params: ListCompaniesParams): Promise<CursorPage<CompanySummary>>;
	listAll(): Promise<CompanySummary[]>;
	get(id: string): Promise<Company>;
	create(data: CreateCompanyPayload): Promise<Company>;
	update(id: string, data: UpdateCompanyData): Promise<Company>;
	/** Archive a single company. Backend rejects the call when it would leave the
	 * workspace with zero active companies, or when the company is the main one. */
	archive(id: string): Promise<void>;
	/** Restore an archived company back to the active list. */
	unarchive(id: string): Promise<void>;
	delete(id: string): Promise<void>;

	createAddress(companyId: string, data: CreateAddressData): Promise<Address>;
	updateAddress(companyId: string, addressId: string, data: UpdateAddressData): Promise<Address>;
	deleteAddress(companyId: string, addressId: string): Promise<void>;

	/** GET `/companies/lookup-by-inn/?inn=<inn>`. Resolves to `null` when DaData
	 * returns no result (404). Throws on upstream errors (502, network). */
	lookupByInn(inn: string): Promise<CompanyLookup | null>;
}
