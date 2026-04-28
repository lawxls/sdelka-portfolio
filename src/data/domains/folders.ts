/**
 * Folders domain types — the import surface used by the folders client and
 * contract tests. Behavior, fixtures, and helpers live elsewhere; this module
 * is types-only. Components still import the static `FOLDER_COLORS` palette
 * and `FOLDER_NAME_MAX_LENGTH` from `types.ts` per the existing pattern.
 */
export type { Folder } from "../types";

/** One row of folder counts. `folderId === null` means uncategorized items. */
export interface FolderStat {
	folderId: string | null;
	itemCount: number;
}

/**
 * Stats response — its own typed shape, distinct from `CursorPage<T>`. Folders
 * stats is a flat snapshot, not a paginated list.
 */
export interface FolderStatsResponse {
	stats: FolderStat[];
	archiveCount: number;
}

export interface FolderStatsParams {
	company?: string;
}

export interface CreateFolderData {
	name: string;
	color: string;
}

export interface UpdateFolderData {
	name?: string;
	color?: string;
}
