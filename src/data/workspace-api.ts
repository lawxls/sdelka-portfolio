import { request } from "./api-client";
import type { EmployeePermissions } from "./types";
import type { InvitePayload, WorkspaceEmployee } from "./workspace-types";

const WORKSPACE_BASE = "/api/v1/workspace";

export async function fetchWorkspaceEmployees(): Promise<{ employees: WorkspaceEmployee[] }> {
	return request("/employees/", { base: WORKSPACE_BASE });
}

export async function inviteEmployees(invites: InvitePayload[]): Promise<void> {
	return request("/employees/invite/", {
		base: WORKSPACE_BASE,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ invites }),
	});
}

export async function updateWorkspaceEmployeePermissions(
	employeeId: number,
	data: Partial<Pick<EmployeePermissions, "analytics" | "procurement" | "companies" | "tasks">>,
): Promise<EmployeePermissions> {
	return request(`/employees/${employeeId}/permissions/`, {
		base: WORKSPACE_BASE,
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}
