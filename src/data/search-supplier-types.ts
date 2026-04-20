export type SearchSupplierCompanyType = "производитель" | "дистрибьютор";

export const SEARCH_SUPPLIER_COMPANY_TYPES: SearchSupplierCompanyType[] = ["производитель", "дистрибьютор"];

export const SEARCH_SUPPLIER_COMPANY_TYPE_LABELS: Record<SearchSupplierCompanyType, string> = {
	производитель: "Производитель",
	дистрибьютор: "Дистрибьютор",
};

export type SearchSupplierRequestStatus = "new" | "requested";

export type SearchSupplierSortField = "companyName" | "foundedYear" | "revenue";

export type SearchSupplierSortState = { field: SearchSupplierSortField; direction: "asc" | "desc" } | null;

export interface SearchSupplierFilterParams {
	search?: string;
	companyTypes?: SearchSupplierCompanyType[];
	requestStatuses?: SearchSupplierRequestStatus[];
	showArchived?: boolean;
	sort?: SearchSupplierSortField;
	dir?: "asc" | "desc";
}

export interface SearchSupplier {
	id: string;
	itemId: string;
	companyName: string;
	inn: string;
	website: string;
	companyType: SearchSupplierCompanyType;
	region: string;
	foundedYear: number;
	/** Annual revenue in rubles. */
	revenue: number;
	requestStatus: SearchSupplierRequestStatus;
	archived: boolean;
}
