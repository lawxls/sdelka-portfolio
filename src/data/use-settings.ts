import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { clearTokens } from "./auth";
import type { SettingsPatch } from "./settings-api";
import { changePassword, fetchSettings, patchSettings } from "./settings-api";

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

export function useChangePassword() {
	const navigate = useNavigate();

	return useMutation({
		mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
			changePassword(currentPassword, newPassword),
		onSuccess: () => {
			clearTokens();
			navigate("/login", { replace: true });
		},
	});
}
