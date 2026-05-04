import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileClient } from "./clients-context";

/**
 * Single source of truth for the current user's identity and workspace role.
 * Backed by `ProfileClient.me`, which fetches `/users/me/` on the HTTP
 * adapter — the same endpoint that `useUpdateSettings` patches.
 */
export function useMe() {
	const client = useProfileClient();
	return useQuery({
		queryKey: ["me"],
		queryFn: () => client.me(),
		staleTime: 5 * 60_000,
	});
}

export function useUpdateSettings() {
	const client = useProfileClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: client.update,
		onSuccess: (updated) => {
			queryClient.setQueryData(["me"], updated);
		},
	});
}
