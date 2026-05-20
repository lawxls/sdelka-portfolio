import { toast } from "sonner";
import { AuthError } from "./errors";
import { moduleEditDeniedMessage } from "./permissions";

/**
 * Hook-level error handler: when the backend 403 carries the
 * `permission_denied_module` envelope, fire a module-named toast. The other
 * two envelopes (`cannot_modify_workspace_owner`, `admin_role_required`) stay
 * silent — callers read `mutation.error` and render inline form errors.
 */
export function toastModulePermissionDenied(err: unknown): boolean {
	if (!(err instanceof AuthError)) return false;
	if (err.code !== "permission_denied_module" || !err.module) return false;
	toast.error(moduleEditDeniedMessage(err.module));
	return true;
}
