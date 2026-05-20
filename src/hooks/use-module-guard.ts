import { useCallback } from "react";
import { toast } from "sonner";
import { canEdit as canEditModule, moduleEditDeniedMessage } from "@/data/permissions";
import type { PermissionModuleKey } from "@/data/types";
import { useMe } from "@/data/use-me";

/**
 * Wraps mutation triggers (Create / Add / Invite / Edit / Save / Delete /
 * Archive / Send / …) so a view-only user gets a module-named toast on click
 * instead of opening the drawer or firing the mutation. The button keeps its
 * normal styling — no `disabled`, no `aria-disabled`, no tooltip.
 *
 * Read-only controls (filter, sort, search, expand row, open view-only drawer)
 * are NOT wrapped — view-only must stay useful.
 */
export function useModuleGuard(module: PermissionModuleKey): {
	canEdit: boolean;
	guard: <Args extends unknown[]>(fn: (...args: Args) => unknown) => (...args: Args) => void;
} {
	const { data: me } = useMe();
	const canEdit = canEditModule(me, module);
	const guard = useCallback(
		<Args extends unknown[]>(fn: (...args: Args) => unknown) =>
			(...args: Args) => {
				if (canEdit) {
					fn(...args);
					return;
				}
				toast.error(moduleEditDeniedMessage(module));
			},
		[canEdit, module],
	);
	return { canEdit, guard };
}
