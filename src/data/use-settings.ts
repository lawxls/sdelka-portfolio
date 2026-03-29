import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "./settings-api";

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
