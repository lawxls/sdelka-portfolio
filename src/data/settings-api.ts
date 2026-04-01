import { request } from "./api-client";

const BASE = "/api/v1/auth";

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

export async function fetchSettings(): Promise<UserSettings> {
	return request("/settings", { base: BASE });
}

export interface ChangePasswordResponse {
	detail: string;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
	return request("/change-password", {
		base: BASE,
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
	});
}

export async function patchSettings(data: SettingsPatch): Promise<UserSettings> {
	return request("/settings", {
		base: BASE,
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
}
