import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTendersClient } from "./clients-context";
import type { ListTendersParams, ProcurementInquiry } from "./domains/tenders";

export function useTenders(params: ListTendersParams = {}, options: { enabled?: boolean } = {}) {
	const client = useTendersClient();
	const query = useInfiniteQuery({
		queryKey: ["tenders", params] as const,
		queryFn: ({ pageParam }) => client.list({ ...params, cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		enabled: options.enabled ?? true,
	});

	const items = query.data?.pages.flatMap((page) => page.items) ?? [];

	return {
		items,
		hasNextPage: query.hasNextPage,
		loadMore: query.fetchNextPage,
		isLoading: query.isLoading,
		isFetchingNextPage: query.isFetchingNextPage,
		error: query.error,
		refetch: query.refetch,
	};
}

export function useTender(slug: string | null) {
	const client = useTendersClient();
	return useQuery({
		queryKey: ["tenders", "detail", slug] as const,
		queryFn: () => client.get(slug as string),
		enabled: slug !== null,
	});
}

interface UpdateTenderVars {
	id: string;
	patch: Partial<ProcurementInquiry>;
}

export function useUpdateTender() {
	const client = useTendersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, patch }: UpdateTenderVars) => client.update(id, patch),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tenders"] });
		},
		onError: () => toast.error("Не удалось обновить запрос"),
	});
}

export function useDeleteTender() {
	const client = useTendersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => client.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tenders"] });
			queryClient.invalidateQueries({ queryKey: ["items"] });
		},
		onError: () => toast.error("Не удалось удалить запрос"),
	});
}
