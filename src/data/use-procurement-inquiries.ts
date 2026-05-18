import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useProcurementInquiriesClient } from "./clients-context";
import type { ListProcurementInquiriesParams, UpdateProcurementInquiryInput } from "./domains/procurement-inquiries";
import { keys } from "./query-keys";

export function useProcurementInquiries(
	params: ListProcurementInquiriesParams = {},
	options: { enabled?: boolean } = {},
) {
	const client = useProcurementInquiriesClient();
	const query = useInfiniteQuery({
		queryKey: keys.procurementInquiries.list(params),
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

export function useProcurementInquiry(slug: string | null) {
	const client = useProcurementInquiriesClient();
	return useQuery({
		queryKey: keys.procurementInquiries.detail(slug),
		queryFn: () => client.get(slug as string),
		enabled: slug !== null,
	});
}

interface UpdateProcurementInquiryVars {
	id: string;
	patch: UpdateProcurementInquiryInput;
}

export function useUpdateProcurementInquiry() {
	const client = useProcurementInquiriesClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, patch }: UpdateProcurementInquiryVars) => client.update(id, patch),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.procurementInquiries.all() });
		},
		onError: () => toast.error("Не удалось обновить запрос"),
	});
}

export function useDeleteProcurementInquiry() {
	const client = useProcurementInquiriesClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => client.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.procurementInquiries.all() });
			queryClient.invalidateQueries({ queryKey: ["items"] });
		},
		onError: () => toast.error("Не удалось удалить запрос"),
	});
}
