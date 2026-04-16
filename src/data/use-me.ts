import { useQuery } from "@tanstack/react-query";
import { fetchMeMock } from "./workspace-mock-data";

export function useMe() {
	return useQuery({
		queryKey: ["me"],
		queryFn: fetchMeMock,
		staleTime: 5 * 60_000,
	});
}
