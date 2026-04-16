import { useQuery } from "@tanstack/react-query";
import { fetchCompanyInfoMock } from "./workspace-mock-data";

export function useCompanyInfo() {
	return useQuery({
		queryKey: ["companyInfo"],
		queryFn: fetchCompanyInfoMock,
		staleTime: Number.POSITIVE_INFINITY,
	});
}
