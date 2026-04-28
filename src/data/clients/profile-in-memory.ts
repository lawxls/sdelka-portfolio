import type { ChangePasswordResponse, CurrentEmployee, SettingsPatch, UserSettings } from "../domains/profile";
import {
	_setMe,
	_setUserSettings,
	changePasswordMock,
	fetchMeMock,
	fetchSettingsMock,
	patchSettingsMock,
} from "../workspace-mock-data";
import type { ProfileClient } from "./profile-client";

export interface InMemoryProfileOptions {
	/** Replace the module-level mock store at construction time. Pass to seed
	 * the active session's identity record deterministically (e.g. a non-admin
	 * user for permission-aware tests). */
	me?: CurrentEmployee;
	/** Replace the user's settings record at construction time. Tests pass this
	 * to land on a known starting profile without reaching into
	 * `_setUserSettings` directly. */
	settings?: UserSettings;
}

/**
 * Build an in-memory profile adapter wrapping the module-level workspace mock
 * store. Singleton-wrapping (rather than closure isolation) is the right shape
 * here because `workspace-mock-data` is shared with the workspace-employees /
 * invitations / company-info domains until #250 dissolves it. Once those
 * splits land, this can become closure-isolated.
 */
export function createInMemoryProfileClient(options?: InMemoryProfileOptions): ProfileClient {
	if (options?.me !== undefined) _setMe(options.me);
	if (options?.settings !== undefined) _setUserSettings(options.settings);

	return {
		async me(): Promise<CurrentEmployee> {
			return fetchMeMock();
		},

		async settings(): Promise<UserSettings> {
			return fetchSettingsMock();
		},

		async update(patch: SettingsPatch): Promise<UserSettings> {
			return patchSettingsMock(patch);
		},

		async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
			return changePasswordMock(currentPassword, newPassword);
		},
	};
}
