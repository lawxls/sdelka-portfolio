import type {
	CreateFolderData,
	Folder,
	FolderStatsParams,
	FolderStatsResponse,
	UpdateFolderData,
} from "../domains/folders";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { FoldersClient } from "./folders-client";

function buildQuery(params: object): string {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		sp.set(key, String(value));
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}

const enc = encodeURIComponent;

export function createHttpFoldersClient(http: HttpClient = defaultHttpClient): FoldersClient {
	return {
		list: () => http.get<Folder[]>(`/folders`),

		stats: (params?: FolderStatsParams) => http.get<FolderStatsResponse>(`/folders/stats${buildQuery(params ?? {})}`),

		create: (data: CreateFolderData) => http.post<Folder>(`/folders`, { body: data }),

		update: (id, data: UpdateFolderData) => http.patch<Folder>(`/folders/${enc(id)}`, { body: data }),

		delete: (id) => http.delete<void>(`/folders/${enc(id)}`),
	};
}
