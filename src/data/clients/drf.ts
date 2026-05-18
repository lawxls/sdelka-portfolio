import type { CursorPage } from "../domains/shared";

/** DRF cursor-pagination response shape. Mirrors
 * `rest_framework.pagination.CursorPagination.get_paginated_response`. */
export interface DrfCursorPage<T> {
	next: string | null;
	previous: string | null;
	results: T[];
}

/** Translate a DRF cursor page into the FE-canonical `CursorPage<T>` shape.
 * The opaque `?cursor=<token>` is parsed out of the `next` URL; a missing or
 * malformed `next` becomes `nextCursor: null` so callers stop paginating. */
export function toCursorPage<T>(page: DrfCursorPage<T>): CursorPage<T> {
	return { items: page.results, nextCursor: parseCursor(page.next) };
}

function parseCursor(nextUrl: string | null): string | null {
	if (!nextUrl) return null;
	try {
		return new URL(nextUrl, "http://placeholder").searchParams.get("cursor");
	} catch {
		return null;
	}
}

/** Build a query string from a params object, skipping `undefined | null | ""`
 * values. Returns `""` when no params remain, otherwise `"?<encoded>"`. */
export function buildQueryString(params: Record<string, unknown>): string {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		sp.set(key, String(value));
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}
