/**
 * Workspace-settings domain — workspace-scoped configuration shared by every
 * member of the active workspace. Today the surface is just
 * `agentInstructions` (free-form natural-language guidance the AI agent
 * follows when negotiating with suppliers). Backed by GET/PATCH
 * `/workspaces/me/settings/` on the HTTP adapter.
 */
export interface WorkspaceSettings {
	agentInstructions: string;
}

export type WorkspaceSettingsPatch = Partial<WorkspaceSettings>;
