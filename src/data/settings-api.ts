import type { ChangePasswordResponse, SettingsPatch, UserSettings } from "./workspace-mock-data";
import { changePasswordMock, fetchSettingsMock, patchSettingsMock } from "./workspace-mock-data";

export type { ChangePasswordResponse, SettingsPatch, UserSettings };

export async function fetchSettings(): Promise<UserSettings> {
	return fetchSettingsMock();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
	return changePasswordMock(currentPassword, newPassword);
}

export async function patchSettings(data: SettingsPatch): Promise<UserSettings> {
	return patchSettingsMock(data);
}
