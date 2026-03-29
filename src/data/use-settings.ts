import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SettingsPatch } from "./settings-api";
import { fetchSettings, patchSettings } from "./settings-api";

export function useSettings() {
	const query = useQuery({
		queryKey: ["settings"],
		queryFn: fetchSettings,
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
	};
}

export function useUpdateSettings() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: SettingsPatch) => patchSettings(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}
