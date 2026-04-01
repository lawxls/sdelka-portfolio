import type { EmployeePermissions, EmployeeRole } from "./types";

export interface WorkspaceEmployee {
	id: number;
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: EmployeeRole;
	phone: string;
	email: string;
	companies: Array<{ id: string; name: string }>;
	registeredAt: string | null;
	permissions: EmployeePermissions;
}

export interface InvitePayload {
	email: string;
	position: string;
	role: EmployeeRole;
	companies: string[];
}
