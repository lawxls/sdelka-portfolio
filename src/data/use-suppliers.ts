import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteSuppliers, getAllSuppliers, getSupplier, getSuppliers } from "./supplier-mock-data";
import type { SupplierFilterParams } from "./supplier-types";

export function useSuppliers(itemId: string | null) {
	return useQuery({
		queryKey: ["suppliers-all", itemId],
		queryFn: () => getAllSuppliers(itemId as string),
		enabled: itemId !== null,
	});
}

export function useInfiniteSuppliers(itemId: string | null, params?: Omit<SupplierFilterParams, "cursor">) {
	return useInfiniteQuery({
		queryKey: ["suppliers", itemId, params ?? {}],
		queryFn: ({ pageParam }) => getSuppliers(itemId as string, { ...params, cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
			queryClient.invalidateQueries({ queryKey: ["suppliers-all"] });
		},
	});
}
