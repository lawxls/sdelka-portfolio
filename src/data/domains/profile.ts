import type { EmployeePermissions, EmployeeRole } from "../types";

/**
 * Profile domain types — current-user identity. Backs `useMe` and
 * `useUpdateSettings`. Password changes live on
 * `SessionClient.requestPasswordChange` (email-link flow). Profile is a
 * single-row domain — every operation works on the active session's user
 * record, there is no list shape. Both reads and patches go through
 * `/users/me/`. Wire format is camelCase (Django side rewrites snake_case
 * via djangorestframework-camel-case).
 *
 * `role`, `permissions`, and `isWorkspaceOwner` come from the same
 * `/users/me/` payload and feed the client-side permission resolution
 * (`effectiveLevel` / `canView` / `canEdit`). An archived-only user shows up
 * with `role: null` and `permissions: null` — every module resolves to
 * `"none"` for them.
 */
export interface CurrentEmployee {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	patronymic?: string | null;
	phone: string;
	avatarIcon: string;
	mailingAllowed: boolean;
	emailSignature: string;
	dateJoined: string;
	role: EmployeeRole | null;
	permissions: EmployeePermissions | null;
	isWorkspaceOwner: boolean;
}

export type SettingsPatch = Partial<
	Pick<CurrentEmployee, "firstName" | "lastName" | "patronymic" | "phone" | "mailingAllowed" | "emailSignature">
>;
