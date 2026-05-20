import { Navigate, Outlet } from "react-router";
import { canView, firstAccessiblePath } from "@/data/permissions";
import type { PermissionModuleKey } from "@/data/types";
import { useMe } from "@/data/use-me";

/**
 * Route gate keyed to a permission module. While `me` is in flight we render
 * nothing — the protected-route bootstrap splash covers the cold load, so a
 * second splash here would only cause a flicker. Once resolved, missing view
 * permission silently redirects to the user's first accessible module
 * (fallback: `/settings/profile`).
 */
export function RequireModule({ module }: { module: PermissionModuleKey }) {
	const { data: me, isPending } = useMe();

	if (isPending) return null;
	if (canView(me, module)) return <Outlet />;
	return <Navigate to={firstAccessiblePath(me)} replace />;
}
