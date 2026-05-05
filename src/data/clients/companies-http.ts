import type {
	Address,
	Company,
	CompanySummary,
	CursorPage,
	EmployeePermissions,
	EmployeeWithPermissions,
	ListCompaniesParams,
} from "../domains/companies";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { CompaniesClient } from "./companies-client";

function buildListQuery(params: ListCompaniesParams): string {
	const sp = new URLSearchParams();
	if (params.q) sp.set("q", params.q);
	if (params.sort) sp.set("sort", params.sort);
	if (params.dir) sp.set("dir", params.dir);
	if (params.cursor) sp.set("cursor", params.cursor);
	if (params.limit !== undefined) sp.set("limit", String(params.limit));
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}

const enc = encodeURIComponent;

export function createHttpCompaniesClient(http: HttpClient = defaultHttpClient): CompaniesClient {
	return {
		list: (params) => http.get<CursorPage<CompanySummary>>(`/companies${buildListQuery(params)}`),
		listAll: () => http.get<CompanySummary[]>(`/companies/all`),
		get: (id) => http.get<Company>(`/companies/${enc(id)}`),
		create: (data) => http.post<Company>(`/companies`, { body: data }),
		update: (id, data) => http.patch<Company>(`/companies/${enc(id)}`, { body: data }),
		delete: (id) => http.delete<void>(`/companies/${enc(id)}`),

		createAddress: (companyId, data) => http.post<Address>(`/companies/${enc(companyId)}/addresses`, { body: data }),
		updateAddress: (companyId, addressId, data) =>
			http.patch<Address>(`/companies/${enc(companyId)}/addresses/${enc(addressId)}`, { body: data }),
		deleteAddress: (companyId, addressId) =>
			http.delete<void>(`/companies/${enc(companyId)}/addresses/${enc(addressId)}`),

		createEmployee: (companyId, data) =>
			http.post<EmployeeWithPermissions>(`/companies/${enc(companyId)}/employees`, { body: data }),
		updateEmployee: (companyId, employeeId, data) =>
			http.patch<EmployeeWithPermissions>(`/companies/${enc(companyId)}/employees/${employeeId}`, {
				body: data,
			}),
		deleteEmployee: (companyId, employeeId) =>
			http.delete<void>(`/companies/${enc(companyId)}/employees/${employeeId}`),
		updateEmployeePermissions: (companyId, employeeId, data) =>
			http.patch<EmployeePermissions>(`/companies/${enc(companyId)}/employees/${employeeId}/permissions`, {
				body: data,
			}),
	};
}
