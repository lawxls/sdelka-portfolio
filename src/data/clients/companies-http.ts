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
		list: (params) => http.get<CursorPage<CompanySummary>>(`/api/companies${buildListQuery(params)}`),
		listAll: () => http.get<CompanySummary[]>(`/api/companies/all`),
		get: (id) => http.get<Company>(`/api/companies/${enc(id)}`),
		create: (data) => http.post<Company>(`/api/companies`, { body: data }),
		update: (id, data) => http.patch<Company>(`/api/companies/${enc(id)}`, { body: data }),
		delete: (id) => http.delete<void>(`/api/companies/${enc(id)}`),

		createAddress: (companyId, data) =>
			http.post<Address>(`/api/companies/${enc(companyId)}/addresses`, { body: data }),
		updateAddress: (companyId, addressId, data) =>
			http.patch<Address>(`/api/companies/${enc(companyId)}/addresses/${enc(addressId)}`, { body: data }),
		deleteAddress: (companyId, addressId) =>
			http.delete<void>(`/api/companies/${enc(companyId)}/addresses/${enc(addressId)}`),

		createEmployee: (companyId, data) =>
			http.post<EmployeeWithPermissions>(`/api/companies/${enc(companyId)}/employees`, { body: data }),
		updateEmployee: (companyId, employeeId, data) =>
			http.patch<EmployeeWithPermissions>(`/api/companies/${enc(companyId)}/employees/${employeeId}`, {
				body: data,
			}),
		deleteEmployee: (companyId, employeeId) =>
			http.delete<void>(`/api/companies/${enc(companyId)}/employees/${employeeId}`),
		updateEmployeePermissions: (companyId, employeeId, data) =>
			http.patch<EmployeePermissions>(`/api/companies/${enc(companyId)}/employees/${employeeId}/permissions`, {
				body: data,
			}),
	};
}
