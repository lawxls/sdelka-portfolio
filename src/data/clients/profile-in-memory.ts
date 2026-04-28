import type { ChangePasswordResponse, CurrentEmployee, SettingsPatch, UserSettings } from "../domains/profile";
import { delay } from "../mock-utils";
import type { ProfileClient } from "./profile-client";

const DEFAULT_ME: CurrentEmployee = { id: 1, role: "admin" };

const DEFAULT_SETTINGS: UserSettings = {
	first_name: "Иван",
	last_name: "Журавлёв",
	patronymic: "Сергеевич",
	email: "ivan.zhuravlyov.58@mostholding.ru",
	phone: "+79161000001",
	avatar_icon: "blue",
	date_joined: "2024-01-15T10:00:00Z",
	mailing_allowed: true,
};

export interface InMemoryProfileOptions {
	/** Replace the seeded current-user identity. Tests pass this to land on a
	 * known starting record (e.g. a non-admin user for permission-aware tests). */
	me?: CurrentEmployee;
	/** Replace the seeded user settings. */
	settings?: UserSettings;
}

/**
 * Build a closure-isolated in-memory profile adapter. State (current-user
 * identity + settings) lives in the closure — every call to the factory
 * produces an independent store, so tests don't need to reset shared module
 * state.
 */
export function createInMemoryProfileClient(options?: InMemoryProfileOptions): ProfileClient {
	const me: CurrentEmployee = { ...(options?.me ?? DEFAULT_ME) };
	let settings: UserSettings = { ...(options?.settings ?? DEFAULT_SETTINGS) };

	return {
		async me(): Promise<CurrentEmployee> {
			await delay();
			return { ...me };
		},

		async settings(): Promise<UserSettings> {
			await delay();
			return { ...settings };
		},

		async update(patch: SettingsPatch): Promise<UserSettings> {
			await delay();
			settings = { ...settings, ...patch };
			return { ...settings };
		},

		async changePassword(_currentPassword: string, _newPassword: string): Promise<ChangePasswordResponse> {
			await delay();
			return { detail: "Пароль успешно изменён" };
		},
	};
}
