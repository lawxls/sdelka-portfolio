import { type DisplayStatus, getDisplayStatus, type ProcurementInquiryStatus, type ProcurementItem } from "../types";

/** Pure rollup of item statuses to the inquiry's display status.
 *
 * Rules (precedence high → low):
 * 1. Empty items → `searching` (a freshly-created inquiry with no items has no progress yet).
 * 2. Any item still actively `searching` → inquiry is `searching`.
 * 3. Any item `negotiating` (and no item still `searching`) → inquiry is `negotiating`.
 * 4. All items `completed` → inquiry is `completed`.
 * 5. All items `ready_for_analytics` → inquiry is `ready_for_analytics`.
 * 6. Otherwise (mix of final states — `searching_completed`, `completed`,
 *    `ready_for_analytics`) → inquiry is `searching_completed`. */
export function getProcurementInquiryStatus(
	items: readonly Pick<ProcurementItem, "status" | "searchCompleted">[],
): ProcurementInquiryStatus {
	if (items.length === 0) return "searching";
	const display = items.map(getDisplayStatus);
	if (display.some((s: DisplayStatus) => s === "searching")) return "searching";
	if (display.some((s: DisplayStatus) => s === "negotiating")) return "negotiating";
	if (display.every((s: DisplayStatus) => s === "completed")) return "completed";
	if (display.every((s: DisplayStatus) => s === "ready_for_analytics")) return "ready_for_analytics";
	return "searching_completed";
}
