import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSuppliers, getSupplier, getSuppliers } from "./supplier-mock-data";
import type { SupplierFilterParams } from "./supplier-types";

export function useSuppliers(itemId: string | null, params?: SupplierFilterParams) {
	return useQuery({
		queryKey: params ? ["suppliers", itemId, params] : ["suppliers", itemId],
		queryFn: () => getSuppliers(itemId as string, params),
		enabled: itemId !== null,
	});
}

export function useSupplier(itemId: string, supplierId: string | null) {
	return useQuery({
		queryKey: ["supplier", itemId, supplierId],
		queryFn: () => getSupplier(itemId, supplierId as string),
		enabled: supplierId !== null,
	});
}

export function useDeleteSuppliers() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, supplierIds }: { itemId: string; supplierIds: string[] }) =>
			deleteSuppliers(itemId, supplierIds),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
		},
	});
}
