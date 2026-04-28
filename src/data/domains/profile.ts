/**
 * Profile domain types — current-user identity + preferences. Backs `useMe`,
 * `useSettings`, `useUpdateSettings`, and `useChangePassword`. The types are
 * re-exported from the legacy `workspace-mock-data` until that file is
 * dissolved in #250; consumers should import them from this module so the
 * eventual deletion is a single import-rename pass.
 */
export type {
	ChangePasswordResponse,
	CurrentEmployee,
	SettingsPatch,
	UserSettings,
} from "../workspace-mock-data";
