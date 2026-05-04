import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
