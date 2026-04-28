import type { EmployeeRole } from "../types";

/**
 * Profile domain types — current-user identity + preferences. Backs `useMe`,
 * `useSettings`, `useUpdateSettings`, and `useChangePassword`. Profile is a
 * single-row domain — every operation works on the active session's user
 * record, there is no list shape.
 */

export interface UserSettings {
	first_name: string;
	last_name: string;
	patronymic?: string | null;
	email: string;
	phone: string;
	avatar_icon: string;
	date_joined: string;
	mailing_allowed: boolean;
}

export type SettingsPatch = Partial<
	Pick<UserSettings, "first_name" | "last_name" | "patronymic" | "phone" | "mailing_allowed">
>;

export interface ChangePasswordResponse {
	detail: string;
}

export interface CurrentEmployee {
	id: number;
	role: EmployeeRole;
}
