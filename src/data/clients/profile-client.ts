import type { CurrentEmployee, SettingsPatch } from "../domains/profile";

/**
 * Public seam for the profile (current-user identity) domain. Backs `useMe`
 * and `useUpdateSettings`. Password changes live on
 * `SessionClient.requestPasswordChange` (email-link flow).
 *
 * `me` returns the active session's full identity (id, email, names, phone,
 * avatar, mailing preference, join date, workspace role). `update` patches
 * the same record. Both hit `/users/me/` on the HTTP adapter — there is no
 * list shape and no separate settings endpoint.
 */
export interface ProfileClient {
	me(): Promise<CurrentEmployee>;
	update(patch: SettingsPatch): Promise<CurrentEmployee>;
}
