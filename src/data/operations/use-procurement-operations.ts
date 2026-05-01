import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useItemsClient, useSuppliersClient, useTendersClient } from "../clients-context";
import { invalidateAfterItemListChange } from "../invalidation-policies";
import { invalidateSupplierLists } from "../use-suppliers";
import {
	archiveTenderCascade,
	type CreateTenderWithItemsInput,
	createTenderWithItems,
	selectSupplierForItem,
	setCurrentSupplierFromQuote,
} from "./procurement-operations";

export function useSelectSupplierForItem() {
	const items = useItemsClient();
	const suppliers = useSuppliersClient();
	const tenders = useTendersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, supplierId }: { itemId: string; supplierId: string }) =>
			selectSupplierForItem(itemId, supplierId, { items, suppliers, tenders }),
		onSuccess: (_data, { itemId }) => {
			queryClient.invalidateQueries({ queryKey: ["itemDetail", itemId] });
			queryClient.invalidateQueries({ queryKey: ["tenders"] });
			invalidateSupplierLists(queryClient, itemId);
		},
	});
}

export function useCreateTenderWithItems() {
	const items = useItemsClient();
	const tenders = useTendersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateTenderWithItemsInput) => createTenderWithItems(input, { items, tenders }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tenders"] });
			invalidateAfterItemListChange(queryClient);
		},
		onError: () => {
			toast.error("Не удалось создать тендер");
		},
	});
}

export function useArchiveTenderCascade() {
	const tenders = useTendersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
			archiveTenderCascade(id, isArchived, { tenders }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tenders"] });
			invalidateAfterItemListChange(queryClient);
		},
		onError: () => {
			toast.error("Не удалось переместить тендер");
		},
	});
}

export function useSetCurrentSupplierFromQuote() {
	const items = useItemsClient();
	const suppliers = useSuppliersClient();
	const tenders = useTendersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, inn }: { itemId: string; inn: string }) =>
			setCurrentSupplierFromQuote(itemId, inn, { items, suppliers, tenders }),
		onSuccess: (_data, { itemId }) => {
			queryClient.invalidateQueries({ queryKey: ["itemDetail", itemId] });
			queryClient.invalidateQueries({ queryKey: ["items"] });
			queryClient.invalidateQueries({ queryKey: ["totals"] });
			queryClient.invalidateQueries({ queryKey: ["tenders"] });
			invalidateSupplierLists(queryClient, itemId);
		},
	});
}
