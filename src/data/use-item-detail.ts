import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getItemDetail, updateItemDetail } from "./item-detail-mock-data";
import type { ProcurementItem } from "./types";

export function useItemDetail(itemId: string | null) {
	return useQuery({
		queryKey: ["itemDetail", itemId],
		queryFn: () => getItemDetail(itemId as string),
		enabled: itemId !== null,
	});
}

export function useUpdateItemDetail() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			...data
		}: { id: string } & Partial<Omit<ProcurementItem, "id" | "status" | "bestPrice" | "averagePrice" | "companyId">>) =>
			updateItemDetail(id, data),
		onSuccess: (updated) => {
			queryClient.setQueryData(["itemDetail", updated.id], updated);
			queryClient.invalidateQueries({ queryKey: ["items"] });
			queryClient.invalidateQueries({ queryKey: ["totals"] });
		},
		onError: () => {
			toast.error("Не удалось сохранить изменения");
		},
	});
}
