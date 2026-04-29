import { useQuery } from "@tanstack/react-query";
import { useCompanyInfoClient } from "./clients-context";

export function useCompanyInfo() {
	const client = useCompanyInfoClient();
	return useQuery({
		queryKey: ["companyInfo"],
		queryFn: () => client.get(),
		staleTime: Number.POSITIVE_INFINITY,
	});
}
