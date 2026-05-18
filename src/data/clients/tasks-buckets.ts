import type { TaskStatus } from "../task-types";

/** Backend bucket-status filter values. The API's `status` query param accepts
 * only these three buckets (comma-separated). `active` = `assigned + in_progress`. */
export type TaskStatusBucket = "active" | "completed" | "archived";

export const TASK_STATUS_BUCKETS: readonly TaskStatusBucket[] = ["active", "completed", "archived"] as const;

/** SPA raw status → bucket. `assigned` and `in_progress` both collapse to
 * `active`; `completed` and `archived` map to their own bucket. */
export function statusToBucket(status: TaskStatus): TaskStatusBucket {
	if (status === "completed") return "completed";
	if (status === "archived") return "archived";
	return "active";
}

/** Translate the SPA's `statuses?: TaskStatus[]` filter to the API's
 * comma-separated bucket-string. `[assigned]` → `"active"`,
 * `[assigned, in_progress]` → `"active"`, `[completed, archived]` →
 * `"completed,archived"`, `undefined` → `undefined`. */
export function statusesToBucketString(statuses: readonly TaskStatus[] | undefined): string | undefined {
	if (!statuses || statuses.length === 0) return undefined;
	const buckets = new Set<TaskStatusBucket>();
	for (const s of statuses) buckets.add(statusToBucket(s));
	const ordered = TASK_STATUS_BUCKETS.filter((b) => buckets.has(b));
	return ordered.join(",");
}
