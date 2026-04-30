import { useInfiniteQuery } from "@tanstack/react-query";
import { useTendersClient } from "./clients-context";
import type { ListTendersParams } from "./domains/tenders";

export function useTenders(params: ListTendersParams = {}) {
	const client = useTendersClient();
	const query = useInfiniteQuery({
		queryKey: ["tenders", params] as const,
		queryFn: ({ pageParam }) => client.list({ ...params, cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
