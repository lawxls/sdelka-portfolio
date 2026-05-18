import type { TaskStatus } from "../task-types";

/** Backend bucket-status filter values. The API's `status` query param accepts
 * only these three buckets (comma-separated). `active` = `assigned + in_progress`. */
export type TaskStatusBucket = "active" | "completed" | "archived";

export const TASK_STATUS_BUCKETS: readonly TaskStatusBucket[] = ["active", "completed", "archived"] as const;

/** Canonical bucket → raw status mapping. Single source of truth for both the
 * forward (statusToBucket) and reverse (in-memory mock + contract test stubs)
 * directions. */
export const BUCKET_TO_STATUSES: Record<TaskStatusBucket, readonly TaskStatus[]> = {
	active: ["assigned", "in_progress"],
	completed: ["completed"],
	archived: ["archived"],
};

const STATUS_TO_BUCKET = ((): Record<TaskStatus, TaskStatusBucket> => {
	const out = {} as Record<TaskStatus, TaskStatusBucket>;
	for (const bucket of TASK_STATUS_BUCKETS) {
		for (const status of BUCKET_TO_STATUSES[bucket]) out[status] = bucket;
	}
	return out;
})();

export function statusToBucket(status: TaskStatus): TaskStatusBucket {
	return STATUS_TO_BUCKET[status];
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
