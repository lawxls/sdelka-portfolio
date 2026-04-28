import type { ChangePasswordResponse, CurrentEmployee, SettingsPatch, UserSettings } from "../domains/profile";

/**
 * Public seam for the profile (current-user identity + preferences) domain.
 * Backs `useMe`, `useSettings`, `useUpdateSettings`, and `useChangePassword`.
 *
 * `me` returns the active session's employee record; `settings` / `update` /
 * `changePassword` operate on the same user's profile and password. None of
 * these are list-shaped — the domain has at most one "row" (the caller).
 */
export interface ProfileClient {
	me(): Promise<CurrentEmployee>;
	settings(): Promise<UserSettings>;
	update(patch: SettingsPatch): Promise<UserSettings>;
	changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse>;
}
