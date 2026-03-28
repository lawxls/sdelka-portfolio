import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCompany, type UpdateCompanyData, updateCompany } from "./api-client";
import type { Company } from "./types";

export function useCompanyDetail(id: string | null) {
	return useQuery({
		queryKey: ["company", id],
		queryFn: () => fetchCompany(id as string),
		enabled: id != null,
	});
}

export function useUpdateCompany(id: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: UpdateCompanyData) => updateCompany(id, data),
		onMutate: async (newData) => {
			await queryClient.cancelQueries({ queryKey: ["company", id] });
			const previous = queryClient.getQueryData<Company>(["company", id]);
			if (previous) {
				queryClient.setQueryData<Company>(["company", id], { ...previous, ...newData });
			}
			return { previous };
		},
		onError: (_err, _newData, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["company", id], context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["company", id] });
			queryClient.invalidateQueries({ queryKey: ["companies"] });
		},
	});
}
