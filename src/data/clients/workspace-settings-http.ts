import type { WorkspaceSettings, WorkspaceSettingsPatch } from "../domains/workspace-settings";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { WorkspaceSettingsClient } from "./workspace-settings-client";

export function createHttpWorkspaceSettingsClient(http: HttpClient = defaultHttpClient): WorkspaceSettingsClient {
	return {
		get: () => http.get<WorkspaceSettings>(`/workspaces/me/settings/`),
		update: (patch: WorkspaceSettingsPatch) =>
			http.patch<WorkspaceSettings>(`/workspaces/me/settings/`, { body: patch }),
	};
}
