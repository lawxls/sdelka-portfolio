import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useItemsClient, useSuppliersClient } from "../clients-context";
import { invalidateSupplierLists } from "../use-suppliers";
import { selectSupplierForItem, setCurrentSupplierFromQuote } from "./procurement-operations";

export function useSelectSupplierForItem() {
	const items = useItemsClient();
	const suppliers = useSuppliersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, supplierId }: { itemId: string; supplierId: string }) =>
			selectSupplierForItem(itemId, supplierId, { items, suppliers }),
		onSuccess: (_data, { itemId }) => {
			queryClient.invalidateQueries({ queryKey: ["itemDetail", itemId] });
			invalidateSupplierLists(queryClient, itemId);
		},
	});
}

export function useSetCurrentSupplierFromQuote() {
	const items = useItemsClient();
	const suppliers = useSuppliersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, inn }: { itemId: string; inn: string }) =>
			setCurrentSupplierFromQuote(itemId, inn, { items, suppliers }),
		onSuccess: (_data, { itemId }) => {
			queryClient.invalidateQueries({ queryKey: ["itemDetail", itemId] });
			queryClient.invalidateQueries({ queryKey: ["items"] });
			queryClient.invalidateQueries({ queryKey: ["totals"] });
			invalidateSupplierLists(queryClient, itemId);
		},
	});
}
