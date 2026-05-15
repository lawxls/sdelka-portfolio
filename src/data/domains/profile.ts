import type { EmployeeRole } from "../types";

/**
 * Profile domain types — current-user identity. Backs `useMe` and
 * `useUpdateSettings`. Password changes live on
 * `SessionClient.requestPasswordChange` (email-link flow). Profile is a
 * single-row domain — every operation works on the active session's user
 * record, there is no list shape. Both reads and patches go through
 * `/users/me/`. Wire format is camelCase (Django side rewrites snake_case
 * via djangorestframework-camel-case).
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
	dateJoined: string;
	// TODO(api): role isn't on /users/me/ yet — drop `?` once the backend exposes it.
	role?: EmployeeRole;
}

export type SettingsPatch = Partial<
	Pick<CurrentEmployee, "firstName" | "lastName" | "patronymic" | "phone" | "mailingAllowed">
>;
