import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { clearTokens } from "./auth";
import { useProfileClient } from "./clients-context";

export function useSettings() {
	const client = useProfileClient();
	return useQuery({
		queryKey: ["settings"],
		queryFn: () => client.settings(),
		staleTime: 5 * 60_000,
	});
}

export function useUpdateSettings() {
	const client = useProfileClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: client.update,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
	});
}

export function useChangePassword() {
	const client = useProfileClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
			client.changePassword(currentPassword, newPassword),
		onSuccess: () => {
			clearTokens();
			navigate("/login", { replace: true });
		},
	});
}
