import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useItemsClient } from "./clients-context";
import type { UpdateItemData } from "./domains/items";
import { invalidateAfterItemDetailChange } from "./invalidation-policies";
import { keys } from "./query-keys";

export function useItemDetail(itemId: string | null) {
	const client = useItemsClient();
	return useQuery({
		queryKey: keys.items.detail(itemId),
		queryFn: () => client.get(itemId as string),
		enabled: itemId !== null,
	});
}

export function useUpdateItemDetail() {
	const client = useItemsClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & UpdateItemData) => client.update(id, data),
		onSuccess: (updated) => {
			queryClient.setQueryData(keys.items.detail(updated.id), updated);
			invalidateAfterItemDetailChange(queryClient);
		},
		onError: () => {
			toast.error("Не удалось сохранить изменения");
		},
	});
}
