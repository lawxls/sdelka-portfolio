import { useQuery } from "@tanstack/react-query";
import { fetchCompanyInfo } from "./api-client";

export function useCompanyInfo() {
	return useQuery({
		queryKey: ["companyInfo"],
		queryFn: fetchCompanyInfo,
		staleTime: Number.POSITIVE_INFINITY,
	});
}
