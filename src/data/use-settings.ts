import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { clearTokens } from "./auth";
import { changePassword, fetchSettings, patchSettings } from "./settings-api";

export function useSettings() {
	return useQuery({
		queryKey: ["settings"],
		queryFn: fetchSettings,
		staleTime: 5 * 60_000,
	});
}

export function useUpdateSettings() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: patchSettings,
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
