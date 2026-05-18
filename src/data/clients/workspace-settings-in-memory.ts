import type { WorkspaceSettings, WorkspaceSettingsPatch } from "../domains/workspace-settings";
import { delay } from "../mock-utils";
import type { WorkspaceSettingsClient } from "./workspace-settings-client";

const DEFAULT_SETTINGS: WorkspaceSettings = {
	agentInstructions: "",
};

export interface InMemoryWorkspaceSettingsOptions {
	settings?: WorkspaceSettings;
}

/**
 * Build a closure-isolated in-memory workspace-settings adapter. Tests pass an
 * initial `settings` override to land on a known starting state.
 */
export function createInMemoryWorkspaceSettingsClient(
	options?: InMemoryWorkspaceSettingsOptions,
): WorkspaceSettingsClient {
	let settings: WorkspaceSettings = { ...(options?.settings ?? DEFAULT_SETTINGS) };

	return {
		async get(): Promise<WorkspaceSettings> {
			await delay();
			return { ...settings };
		},

		async update(patch: WorkspaceSettingsPatch): Promise<WorkspaceSettings> {
			await delay();
			settings = { ...settings, ...patch };
			return { ...settings };
		},
	};
}
