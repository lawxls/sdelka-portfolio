import type { CurrentEmployee, SettingsPatch, UserSettings } from "../domains/profile";

/**
 * Public seam for the profile (current-user identity + preferences) domain.
 * Backs `useMe`, `useSettings`, and `useUpdateSettings`. Password changes
 * live on `SessionClient.requestPasswordChange` (email-link flow).
 *
 * `me` returns the active session's employee record; `settings` / `update`
 * operate on the same user's profile. None of these are list-shaped — the
 * domain has at most one "row" (the caller).
 */
export interface ProfileClient {
	me(): Promise<CurrentEmployee>;
	settings(): Promise<UserSettings>;
	update(patch: SettingsPatch): Promise<UserSettings>;
}
