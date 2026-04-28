import type { EmployeePermissions } from "../domains/companies";
import type { WorkspaceEmployee, WorkspaceEmployeeDetail } from "../domains/workspace-employees";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { WorkspaceEmployeesClient } from "./workspace-employees-client";

export function createHttpWorkspaceEmployeesClient(http: HttpClient = defaultHttpClient): WorkspaceEmployeesClient {
	return {
		list: () => http.get<WorkspaceEmployee[]>(`/api/workspace/employees`),

		get: (id) => http.get<WorkspaceEmployeeDetail>(`/api/workspace/employees/${id}`),

		invite: (invites) => http.post<void>(`/api/workspace/employees/invite`, { body: { invites } }),

		update: (id, data) => http.patch<WorkspaceEmployeeDetail>(`/api/workspace/employees/${id}`, { body: data }),

		delete: (ids) => http.post<void>(`/api/workspace/employees/delete`, { body: { ids } }),

		updatePermissions: (id, data) =>
			http.patch<EmployeePermissions>(`/api/workspace/employees/${id}/permissions`, { body: data }),
	};
}
