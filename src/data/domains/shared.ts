/** Cursor-paginated list shape shared across list endpoints (PRD slice 1, "CRUD shape"). */
export interface CursorPage<T> {
	items: T[];
	nextCursor: string | null;
}
