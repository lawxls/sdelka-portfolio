import type { EmployeeRole } from "../types";

/**
 * Profile domain types — current-user identity. Backs `useMe` and
 * `useUpdateSettings`. Password changes live on
 * `SessionClient.requestPasswordChange` (email-link flow). Profile is a
 * single-row domain — every operation works on the active session's user
 * record, there is no list shape. Both reads and patches go through
 * `/users/me/`; the workspace `role` rides on the same payload so a single
 * fetch carries the full identity.
 */
export interface CurrentEmployee {
	id: number;
	email: string;
	first_name: string;
	last_name: string;
	patronymic?: string | null;
	phone: string;
	avatar_icon: string;
	mailing_allowed: boolean;
	date_joined: string;
	role: EmployeeRole;
}

export type SettingsPatch = Partial<
	Pick<CurrentEmployee, "first_name" | "last_name" | "patronymic" | "phone" | "mailing_allowed">
>;
