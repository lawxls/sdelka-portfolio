import type { QueryClient } from "@tanstack/react-query";
import { keys } from "./query-keys";

/**
 * Named invalidation policies. Each policy describes the *full* set of cache
 * keys affected by one named mutation event. Mutations call policies by name;
 * they never list keys directly. A cache-strategy change is therefore a
 * one-file edit reviewers can find without grep.
 *
 * Cross-domain effects (e.g. an item-list change invalidating folder stats)
 * live here, not at the call site, so the cross-entity mapping is reviewable
 * in one place.
 */

/**
 * After a change to a company record (update) or to one of its sub-resources
 * (address / employee CRUD). Also covers create + delete, which don't have a
 * specific companyId to detail-invalidate.
 *
 * Invalidates: company detail (when companyId given), companies list namespace,
 * companies-global, and the procurement-page company picker.
 */
export function invalidateAfterCompanyChange(qc: QueryClient, opts: { companyId?: string } = {}): void {
	if (opts.companyId !== undefined) {
		qc.invalidateQueries({ queryKey: keys.companies.detail(opts.companyId) });
	}
	qc.invalidateQueries({ queryKey: keys.companies.all() });
	qc.invalidateQueries({ queryKey: keys.companies.listAll() });
	qc.invalidateQueries({ queryKey: keys.companies.procurement() });
}

/**
 * After updating one employee's permissions on a company. Detail-only — the
 * list views don't surface permissions, so no list-level invalidation.
 */
export function invalidateAfterEmployeePermissionsChange(qc: QueryClient, opts: { companyId: string }): void {
	qc.invalidateQueries({ queryKey: keys.companies.detail(opts.companyId) });
}

/**
 * After a mutation that changes the items list shape: create, delete, archive,
 * or folder reassignment. Hits every items list namespace (the prefix matches
 * filtered/sorted/paginated variants), the global all-items query, totals
 * (item-count and aggregates change), and folder stats (per-folder item
 * counts change).
 */
export function invalidateAfterItemListChange(qc: QueryClient): void {
	qc.invalidateQueries({ queryKey: keys.items.all() });
	qc.invalidateQueries({ queryKey: keys.items.listAll() });
	qc.invalidateQueries({ queryKey: keys.items.totalsAll() });
	qc.invalidateQueries({ queryKey: keys.folders.stats() });
}

/**
 * After an in-place patch on a single item's detail (e.g. name, deferralDays,
 * comments) — no folder reassignment. Refreshes item lists and totals so list
 * rows reflect the patch and totals stay in sync; folder stats are unaffected.
 */
export function invalidateAfterItemDetailChange(qc: QueryClient): void {
	qc.invalidateQueries({ queryKey: keys.items.all() });
	qc.invalidateQueries({ queryKey: keys.items.totalsAll() });
}
