import type {
	CreateFolderData,
	Folder,
	FolderStatsParams,
	FolderStatsResponse,
	UpdateFolderData,
} from "../domains/folders";
import { NotFoundError } from "../errors";
import {
	_setFolders,
	createFolderMock,
	deleteFolderMock,
	fetchFolderStatsMock,
	fetchFoldersMock,
	updateFolderMock,
} from "../folders-mock-data";
import type { FoldersClient } from "./folders-client";

export interface InMemoryFoldersOptions {
	/** Replace the module-level mock store with these folders at construction
	 * time. Used by tests to seed deterministically without reaching into
	 * `_setFolders` directly. */
	seed?: Folder[];
}

/**
 * Build an in-memory folders adapter wrapping the module-level mock store
 * (`folders-mock-data`). The store is a singleton so cross-entity callers
 * (the items mock's `_unassignItemsFromFolder` reach-in on folder delete; the
 * stats query reaching into items via `_statsByFolder` / `_archivedCount`)
 * keep seeing the same state the hook sees. Closure isolation lands once the
 * cross-entity rules migrate via #251.
 *
 * Stats are computed from items + folders state at call time so a seeded test
 * that doesn't seed items still produces a sensible response (empty stats).
 */
export function createInMemoryFoldersClient(options?: InMemoryFoldersOptions): FoldersClient {
	if (options?.seed !== undefined) {
		_setFolders(options.seed);
	}

	return {
		async list(): Promise<Folder[]> {
			const { folders } = await fetchFoldersMock();
			return folders;
		},

		async stats(params?: FolderStatsParams): Promise<FolderStatsResponse> {
			return fetchFolderStatsMock(params);
		},

		async create(data: CreateFolderData): Promise<Folder> {
			return createFolderMock(data);
		},

		async update(id: string, data: UpdateFolderData): Promise<Folder> {
			try {
				return await updateFolderMock(id, data);
			} catch (err) {
				if (err instanceof Error && err.message.includes("not found")) {
					throw new NotFoundError({ id });
				}
				throw err;
			}
		},

		async delete(id: string): Promise<void> {
			return deleteFolderMock(id);
		},
	};
}
