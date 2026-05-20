import { Navigate, Outlet, useOutletContext } from "react-router";
import { canView, firstAccessiblePath } from "@/data/permissions";
import type { PermissionModuleKey } from "@/data/types";
import { useMe } from "@/data/use-me";

/**
 * Route gate keyed to a permission module. While `me` is in flight we render
 * nothing — the protected-route bootstrap splash covers the cold load, so a
 * second splash here would only cause a flicker. Once resolved, missing view
 * permission silently redirects to the user's first accessible module
 * (fallback: `/settings/profile`).
 *
 * Forwards the parent outlet context — `SettingsLayout` passes its create/invite
 * drawer setters through `<Outlet context={…} />`, and dropping it here would
 * leave settings pages with the no-op fallback setters.
 */
export function RequireModule({ module }: { module: PermissionModuleKey }) {
	const { data: me, isPending } = useMe();
	const parentContext = useOutletContext();

	if (isPending) return null;
	if (canView(me, module)) return <Outlet context={parentContext} />;
	return <Navigate to={firstAccessiblePath(me)} replace />;
}
