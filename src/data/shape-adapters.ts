import type { QueryKey } from "@tanstack/react-query";
import type { Updater } from "./optimistic";

/**
 * Shape adapters for the orchestrator.
 *
 * Each adapter knows how to walk one of the cache shapes this codebase uses
 * and exposes intent-level verbs (`patchById`, `removeById`, `patchOrRemoveById`)
 * so call sites stop writing page traversal / column lookup / array index math.
 *
 * The four shapes:
 *  - `detail<T>` — single record
 *  - `flatList<T>` / `flatListIn<TWrap, TItem>` — `T[]` directly or wrapped
 *    in `{ items: T[] }` style objects
 *  - `infinitePages<TPage, TItem>` — `useInfiniteQuery` shape
 *    (`{ pages: TPage[]; pageParams: ... }`); pass page accessors to teach
 *    the adapter where the items live on each page
 *  - `boardColumns<TBoard, TItem>` — status-keyed object whose values each
 *    own an items array (e.g. tasks board)
 *
 * Bespoke cache shapes can pass a hand-rolled `Updater<T>` straight to the
 * orchestrator — these adapters are convenience, not a wall.
 */

// --- detail<T> ------------------------------------------------------------

/** Patch a single-record cache. */
export function detail<T>(fn: (record: T) => T): Updater<T> {
	return (data) => fn(data);
}

// --- flatList<T> ----------------------------------------------------------

interface FlatListVerbs<T extends { id: string }> {
	patchById(id: string, patch: (item: T) => T): Updater<T[]>;
	removeById(id: string): Updater<T[]>;
	prepend(item: T): Updater<T[]>;
	append(item: T): Updater<T[]>;
	apply(fn: (items: T[]) => T[]): Updater<T[]>;
}

export function flatList<T extends { id: string }>(): FlatListVerbs<T> {
	return {
		patchById: (id, patch) => (items) => items.map((i) => (i.id === id ? patch(i) : i)),
		removeById: (id) => (items) => items.filter((i) => i.id !== id),
		prepend: (item) => (items) => [item, ...items],
		append: (item) => (items) => [...items, item],
		apply: (fn) => (items) => fn(items),
	};
}

interface FlatListInVerbs<TWrap, TItem extends { id: string }> {
	patchById(id: string, patch: (item: TItem) => TItem): Updater<TWrap>;
	removeById(id: string): Updater<TWrap>;
	prepend(item: TItem): Updater<TWrap>;
	append(item: TItem): Updater<TWrap>;
	apply(fn: (items: TItem[]) => TItem[]): Updater<TWrap>;
}

/** flatList for caches that wrap the array — e.g. `{ folders: Folder[] }`. */
export function flatListIn<TWrap, TItem extends { id: string }>(accessors: {
	get: (data: TWrap) => TItem[];
	set: (data: TWrap, items: TItem[]) => TWrap;
}): FlatListInVerbs<TWrap, TItem> {
	const wrap =
		(fn: (items: TItem[]) => TItem[]): Updater<TWrap> =>
		(data) =>
			accessors.set(data, fn(accessors.get(data)));

	return {
		patchById: (id, patch) => wrap((items) => items.map((i) => (i.id === id ? patch(i) : i))),
		removeById: (id) => wrap((items) => items.filter((i) => i.id !== id)),
		prepend: (item) => wrap((items) => [item, ...items]),
		append: (item) => wrap((items) => [...items, item]),
		apply: (fn) => wrap(fn),
	};
}

// --- infinitePages<TPage, TItem> -----------------------------------------

export interface InfinitePagesCache<TPage> {
	pages: TPage[];
	pageParams: unknown[];
}

interface InfinitePagesVerbs<TPage, TItem extends { id: string }> {
	patchById(id: string, patch: (item: TItem) => TItem): Updater<InfinitePagesCache<TPage>>;
	removeById(id: string): Updater<InfinitePagesCache<TPage>>;
	/**
	 * Per-cache decision keyed off the cache's own query key — return the
	 * patched item to keep it, or `null` to remove it from this particular
	 * cache. Used when an update changes whether the item still belongs in a
	 * filter/sort variant (e.g. moving an item to another folder).
	 */
	patchOrRemoveById(
		id: string,
		decide: (item: TItem, key: QueryKey) => TItem | null,
	): Updater<InfinitePagesCache<TPage>>;
	/** Escape hatch — apply a bespoke per-page transform. */
	perPage(fn: (items: TItem[], key: QueryKey) => TItem[]): Updater<InfinitePagesCache<TPage>>;
}

export function infinitePages<TPage, TItem extends { id: string }>(accessors: {
	get: (page: TPage) => TItem[];
	set: (page: TPage, items: TItem[]) => TPage;
}): InfinitePagesVerbs<TPage, TItem> {
	const perPage =
		(fn: (items: TItem[], key: QueryKey) => TItem[]): Updater<InfinitePagesCache<TPage>> =>
		(data, key) => ({
			...data,
			pages: data.pages.map((page) => accessors.set(page, fn(accessors.get(page), key))),
		});

	return {
		patchById: (id, patch) => perPage((items) => items.map((i) => (i.id === id ? patch(i) : i))),
		removeById: (id) => perPage((items) => items.filter((i) => i.id !== id)),
		patchOrRemoveById: (id, decide) =>
			perPage((items, key) =>
				items.flatMap((i) => {
					if (i.id !== id) return [i];
					const next = decide(i, key);
					return next === null ? [] : [next];
				}),
			),
		perPage,
	};
}

// --- boardColumns<TBoard, TItem> -----------------------------------------

interface BoardColumnsVerbs<TBoard, TItem extends { id: string }> {
	patchById(id: string, patch: (item: TItem, column: string) => TItem): Updater<TBoard>;
	removeById(id: string): Updater<TBoard>;
	/**
	 * Move an item between columns. The matched item is removed from its source
	 * column and prepended to `targetColumn`. The optional `transform` lets
	 * callers patch the item as it moves (e.g. update `status`).
	 */
	moveBetween(id: string, targetColumn: string, transform?: (item: TItem) => TItem): Updater<TBoard>;
	/** Escape hatch — apply a bespoke per-column transform. */
	perColumn(fn: (items: TItem[], column: string) => TItem[]): Updater<TBoard>;
}

export function boardColumns<TBoard, TItem extends { id: string }>(accessors: {
	listColumns: (data: TBoard) => string[];
	getItems: (data: TBoard, column: string) => TItem[];
	setItems: (data: TBoard, column: string, items: TItem[]) => TBoard;
}): BoardColumnsVerbs<TBoard, TItem> {
	const perColumn =
		(fn: (items: TItem[], column: string) => TItem[]): Updater<TBoard> =>
		(data) =>
			accessors
				.listColumns(data)
				.reduce((acc, column) => accessors.setItems(acc, column, fn(accessors.getItems(acc, column), column)), data);

	return {
		patchById: (id, patch) => perColumn((items, column) => items.map((i) => (i.id === id ? patch(i, column) : i))),
		removeById: (id) => perColumn((items) => items.filter((i) => i.id !== id)),
		moveBetween: (id, targetColumn, transform) => (data) => {
			let moved: TItem | null = null;
			const stripped = accessors.listColumns(data).reduce((acc, column) => {
				const items = accessors.getItems(acc, column);
				const found = items.find((i) => i.id === id);
				if (found) {
					moved = transform ? transform(found) : found;
					return accessors.setItems(
						acc,
						column,
						items.filter((i) => i.id !== id),
					);
				}
				return acc;
			}, data);
			if (moved === null) return stripped;
			return accessors.setItems(stripped, targetColumn, [moved, ...accessors.getItems(stripped, targetColumn)]);
		},
		perColumn,
	};
}
