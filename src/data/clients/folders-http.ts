import type {
	CreateFolderData,
	Folder,
	FolderStatsParams,
	FolderStatsResponse,
	UpdateFolderData,
} from "../domains/folders";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import { buildQueryString, type DrfCursorPage } from "./drf";
import type { FoldersClient } from "./folders-client";

const enc = encodeURIComponent;

/** Single-page fetch of all folders. Backend caps page_size at 200 and the
 * workspace folder count is bounded well below that, so paginating would be
 * pure ceremony. Listing remains `Folder[]` on the seam. */
const FOLDERS_PAGE_SIZE = 200;

export function createHttpFoldersClient(http: HttpClient = defaultHttpClient): FoldersClient {
	return {
		list: async () => {
			const page = await http.get<DrfCursorPage<Folder>>(`/folders/?pageSize=${FOLDERS_PAGE_SIZE}`);
			return page.results;
		},

		stats: (params?: FolderStatsParams) =>
			http.get<FolderStatsResponse>(`/folders/stats/${buildQueryString((params ?? {}) as Record<string, unknown>)}`),

		create: (data: CreateFolderData) => http.post<Folder>(`/folders/`, { body: data }),

		update: (id, data: UpdateFolderData) => http.patch<Folder>(`/folders/${enc(id)}/`, { body: data }),

		delete: (id) => http.delete<void>(`/folders/${enc(id)}/`),
	};
}
