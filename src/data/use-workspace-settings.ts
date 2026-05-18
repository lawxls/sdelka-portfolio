import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceSettingsClient } from "./clients-context";

const WORKSPACE_SETTINGS_KEY = ["workspace-settings"] as const;

/**
 * Read the workspace's shared settings (e.g. agent instructions). Backed by
 * `WorkspaceSettingsClient.get` — single-row, workspace-scoped, long staleTime
 * since the values rarely change.
 */
export function useWorkspaceSettings() {
	const client = useWorkspaceSettingsClient();
	return useQuery({
		queryKey: WORKSPACE_SETTINGS_KEY,
		queryFn: () => client.get(),
		staleTime: 5 * 60_000,
	});
}

export function useUpdateWorkspaceSettings() {
	const client = useWorkspaceSettingsClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: client.update,
		onSuccess: (updated) => {
			queryClient.setQueryData(WORKSPACE_SETTINGS_KEY, updated);
		},
	});
}
