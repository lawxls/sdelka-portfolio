import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveSearchSuppliers, listSearchSuppliers, unarchiveSearchSuppliers } from "./search-supplier-mock-data";
import type { SearchSupplierFilterParams } from "./search-supplier-types";

export function useSearchSuppliers(itemId: string | null, params?: SearchSupplierFilterParams) {
	return useQuery({
		queryKey: ["searchSuppliers", itemId, params ?? {}],
		queryFn: () => listSearchSuppliers(itemId as string, params),
		enabled: itemId !== null,
	});
}

export function useArchiveSearchSuppliers() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, ids }: { itemId: string; ids: string[] }) => archiveSearchSuppliers(itemId, ids),
		onSuccess: (_data, { itemId }) => {
			queryClient.invalidateQueries({ queryKey: ["searchSuppliers", itemId] });
		},
	});
}

export function useUnarchiveSearchSuppliers() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, ids }: { itemId: string; ids: string[] }) => unarchiveSearchSuppliers(itemId, ids),
		onSuccess: (_data, { itemId }) => {
			queryClient.invalidateQueries({ queryKey: ["searchSuppliers", itemId] });
		},
	});
}
