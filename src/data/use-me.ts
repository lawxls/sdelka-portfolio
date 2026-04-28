import { useQuery } from "@tanstack/react-query";
import { useProfileClient } from "./clients-context";

export function useMe() {
	const client = useProfileClient();
	return useQuery({
		queryKey: ["me"],
		queryFn: () => client.me(),
		staleTime: 5 * 60_000,
	});
}
