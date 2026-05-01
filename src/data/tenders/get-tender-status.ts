import { type DisplayStatus, getDisplayStatus, type ProcurementItem, type TenderStatus } from "../types";

/** Pure rollup of item statuses to the tender's display status.
 *
 * Rules (precedence high → low):
 * 1. Empty items → `searching` (a freshly-created tender with no items has no progress yet).
 * 2. Any item still actively `searching` → tender is `searching`.
 * 3. Any item `negotiating` (and no item still `searching`) → tender is `negotiating`.
 * 4. All items `completed` → tender is `completed`.
 * 5. Otherwise (items are a mix of `searching_completed` and possibly `completed`,
 *    no active searches and no negotiations) → tender is `searching_completed`. */
export function getTenderStatus(items: readonly Pick<ProcurementItem, "status" | "searchCompleted">[]): TenderStatus {
	if (items.length === 0) return "searching";
	const display = items.map(getDisplayStatus);
	if (display.some((s: DisplayStatus) => s === "searching")) return "searching";
	if (display.some((s: DisplayStatus) => s === "negotiating")) return "negotiating";
	if (display.every((s: DisplayStatus) => s === "completed")) return "completed";
	return "searching_completed";
}
