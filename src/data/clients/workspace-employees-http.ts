import type { EmployeePermissions } from "../domains/employees";
import type { WorkspaceEmployee, WorkspaceEmployeeDetail } from "../domains/workspace-employees";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { DrfCursorPage } from "./drf";
import type { DeleteWorkspaceEmployeesResult, WorkspaceEmployeesClient } from "./workspace-employees-client";

export function createHttpWorkspaceEmployeesClient(http: HttpClient = defaultHttpClient): WorkspaceEmployeesClient {
	return {
		list: async () => {
			const page = await http.get<DrfCursorPage<WorkspaceEmployee>>(`/workspace/employees/`);
			return page.results;
		},

		get: (id) => http.get<WorkspaceEmployeeDetail>(`/workspace/employees/${id}/`),

		invite: (invites) => http.post<WorkspaceEmployee[]>(`/workspace/employees/invite/`, { body: { invites } }),

		update: (id, data) => http.patch<WorkspaceEmployeeDetail>(`/workspace/employees/${id}/`, { body: data }),

		delete: (ids) => http.post<DeleteWorkspaceEmployeesResult>(`/workspace/employees/delete/`, { body: { ids } }),

		updatePermissions: (id, data) =>
			http.patch<EmployeePermissions>(`/workspace/employees/${id}/permissions/`, { body: data }),
	};
}
