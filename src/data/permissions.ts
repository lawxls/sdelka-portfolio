import type { CurrentEmployee } from "./domains/profile";
import { PERMISSION_MODULE_LABELS, type PermissionLevel, type PermissionModuleKey } from "./types";

/**
 * Permissions resolver — single source of truth for "can this user see/edit
 * module X". Mirrors the backend's `resolve_effective_level` exactly:
 *
 *   1. `isWorkspaceOwner` → always `edit`.
 *   2. `role === "admin"` → always `edit`.
 *   3. otherwise → `permissions[module] ?? "none"`.
 *
 * Archived-only users land here with `role: null` and `permissions: null` —
 * every module resolves to `"none"` and they get redirected to
 * `/settings/profile`.
 */

const FALLBACK_PROFILE_PATH = "/settings/profile";

/** Fixed nav order — drives `useFirstAccessiblePath`. The mapping is intentionally
 * decoupled from `NAV_ITEMS` so re-orderings of the nav don't silently shift
 * redirect behavior. */
const PERMISSION_MODULE_ROUTES: ReadonlyArray<{ module: PermissionModuleKey; path: string }> = [
	{ module: "procurementInquiries", path: "/inquiries" },
	{ module: "positions", path: "/positions" },
	{ module: "tasks", path: "/tasks" },
	{ module: "workspaceSettings", path: "/settings/workspace" },
	{ module: "companies", path: "/settings/companies" },
	{ module: "employees", path: "/settings/employees" },
	{ module: "emails", path: "/settings/emails" },
];

export function effectiveLevel(me: CurrentEmployee | null | undefined, module: PermissionModuleKey): PermissionLevel {
	if (!me) return "none";
	if (me.isWorkspaceOwner) return "edit";
	if (me.role === "admin") return "edit";
	return me.permissions?.[module] ?? "none";
}

export function canView(me: CurrentEmployee | null | undefined, module: PermissionModuleKey): boolean {
	const level = effectiveLevel(me, module);
	return level === "view" || level === "edit";
}

export function canEdit(me: CurrentEmployee | null | undefined, module: PermissionModuleKey): boolean {
	return effectiveLevel(me, module) === "edit";
}

/**
 * Walks the fixed nav order and returns the first module path the user can view.
 * Falls back to `/settings/profile` when no module is viewable — the profile
 * page isn't gated, so it's always reachable.
 */
export function firstAccessiblePath(me: CurrentEmployee | null | undefined): string {
	for (const { module, path } of PERMISSION_MODULE_ROUTES) {
		if (canView(me, module)) return path;
	}
	return FALLBACK_PROFILE_PATH;
}

/** Nav items without a `module` field (e.g. the Настройки index) are always
 * visible; items with a module are gated by `canView`. Used by AppRail,
 * BottomTabBar, and SettingsSidebar to filter their rows. */
export function canViewNavItem(
	me: CurrentEmployee | null | undefined,
	item: { module?: PermissionModuleKey },
): boolean {
	if (!item.module) return true;
	return canView(me, item.module);
}

export function moduleEditDeniedMessage(module: PermissionModuleKey): string {
	return `Нет прав на редактирование в модуле «${PERMISSION_MODULE_LABELS[module]}»`;
}
