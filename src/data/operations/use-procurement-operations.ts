import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { useItemsClient, useSuppliersClient } from "../clients-context";
import { selectSupplierForItem, setCurrentSupplierFromQuote } from "./procurement-operations";

function invalidateSupplierLists(queryClient: QueryClient, itemId: string) {
	queryClient.invalidateQueries({ queryKey: ["suppliers", itemId] });
	queryClient.invalidateQueries({ queryKey: ["suppliers-all", itemId] });
	queryClient.invalidateQueries({ queryKey: ["suppliers-global"] });
	queryClient.invalidateQueries({ queryKey: ["supplier-quotes"] });
}

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
