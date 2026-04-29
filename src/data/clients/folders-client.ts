import type {
	CreateFolderData,
	Folder,
	FolderStatsParams,
	FolderStatsResponse,
	UpdateFolderData,
} from "../domains/folders";

/**
 * Public seam for the folders domain. Implementations are in-memory (mock
 * store) or HTTP. Hooks pull this through context, so swapping adapters is a
 * one-line change in the composition root.
 *
 * The list response is a flat `Folder[]` and stats is its own typed shape
 * (`FolderStatsResponse`) — neither fits `CursorPage<T>`, which is fine: the
 * seam doesn't force list shapes onto domains where the underlying paging
 * model differs.
 */
export interface FoldersClient {
	list(): Promise<Folder[]>;
	stats(params?: FolderStatsParams): Promise<FolderStatsResponse>;
	create(data: CreateFolderData): Promise<Folder>;
	update(id: string, data: UpdateFolderData): Promise<Folder>;
	delete(id: string): Promise<void>;
}
