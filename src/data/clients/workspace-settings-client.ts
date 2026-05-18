import type { WorkspaceSettings, WorkspaceSettingsPatch } from "../domains/workspace-settings";

/**
 * Public seam for the workspace-settings domain. Single-row, workspace-scoped
 * config. Backs `useWorkspaceSettings` and `useUpdateWorkspaceSettings` —
 * both hit `/workspace/settings/` on the HTTP adapter.
 */
export interface WorkspaceSettingsClient {
	get(): Promise<WorkspaceSettings>;
	update(patch: WorkspaceSettingsPatch): Promise<WorkspaceSettings>;
}
