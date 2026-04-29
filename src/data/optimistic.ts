import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Multi-key optimistic-update orchestrator.
 *
 * The mutations across this app commonly touch a list, a detail, and a totals
 * query in one shot — and the items namespace alone has a dozen filtered list
 * variants in cache at once. Hand-rolling the cancel / snapshot / apply /
 * rollback dance per mutation duplicated 50+ lines per hook and routinely
 * leaked page-traversal code into call sites.
 *
 * `applyOptimistic` accepts a set of targets, snapshots all of them atomically,
 * applies shape-aware updaters, and returns a context that `rollbackOptimistic`
 * restores in one call. Each target can match a single key (`prefix` omitted /
 * false) or a key prefix (`prefix: true`) — the latter walks every cache whose
 * key starts with `queryKey` and applies the updater per-match. Use prefix
 * mode for any namespace where multiple filter/sort/cursor variants coexist.
 *
 * The four shape adapters in `./shape-adapters` produce the per-shape
 * `Updater` functions; pass-through `Updater`s are also fine for bespoke
 * cache shapes.
 */

export type Updater<T> = (data: T, key: QueryKey) => T;

/**
 * The orchestrator's per-target spec. `update` is intentionally typed loosely
 * so that any specifically-typed `Updater<T>` (from a shape adapter or
 * hand-rolled) is assignable here without a cast — `Updater<T>` is invariant
 * in T, so a strict `Updater<unknown>` would reject every concrete updater
 * the call sites produce. The orchestrator does not introspect cache
 * contents, so the loose typing has no runtime cost.
 */
export interface OptimisticTarget {
	queryKey: QueryKey;
	/** When true, walks every cache whose key starts with `queryKey`. */
	prefix?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: see interface comment — variance escape hatch.
	update: (data: any, key: QueryKey) => any;
}

export interface OptimisticContext {
	snapshots: Array<{ key: QueryKey; data: unknown }>;
}

function collectMatches(qc: QueryClient, target: OptimisticTarget): Array<[QueryKey, unknown]> {
	if (target.prefix) {
		return qc.getQueriesData({ queryKey: target.queryKey });
	}
	const data = qc.getQueryData(target.queryKey);
	return data === undefined ? [] : [[target.queryKey, data]];
}

/**
 * Cancel in-flight queries on every target's namespace, snapshot the current
 * cache for every matched key, then apply each target's updater. Returns the
 * snapshots so `rollbackOptimistic` can restore them on failure.
 */
export async function applyOptimistic(qc: QueryClient, targets: OptimisticTarget[]): Promise<OptimisticContext> {
	await Promise.all(targets.map((t) => qc.cancelQueries({ queryKey: t.queryKey })));

	const snapshots: OptimisticContext["snapshots"] = [];

	for (const target of targets) {
		for (const [key, data] of collectMatches(qc, target)) {
			if (data === undefined) continue;
			snapshots.push({ key, data });
			qc.setQueryData(key, target.update(data, key));
		}
	}

	return { snapshots };
}

/** Restore every snapshot captured by `applyOptimistic`, in reverse order. */
export function rollbackOptimistic(qc: QueryClient, ctx: OptimisticContext | undefined): void {
	if (!ctx?.snapshots) return;
	for (let i = ctx.snapshots.length - 1; i >= 0; i--) {
		const snap = ctx.snapshots[i];
		qc.setQueryData(snap.key, snap.data);
	}
}

/**
 * Synchronous cache write across one or more targets. No cancel, no snapshot.
 * For non-optimistic in-place updates (e.g. swapping a server-confirmed record
 * back over the optimistic stand-in inside `onSuccess`).
 */
export function applyToCache(qc: QueryClient, targets: OptimisticTarget[]): void {
	for (const target of targets) {
		for (const [key, data] of collectMatches(qc, target)) {
			if (data === undefined) continue;
			qc.setQueryData(key, target.update(data, key));
		}
	}
}
