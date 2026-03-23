import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchItems, fetchTotals } from "./api-client";
import type { FilterState, SortState } from "./types";

interface ItemQueryParams {
	search: string;
	filters: FilterState;
	sort: SortState | null;
	folder?: string;
}

function buildFilterParams(params: ItemQueryParams) {
	return {
		q: params.search || undefined,
		status: params.filters.status !== "all" ? params.filters.status : undefined,
		deviation: params.filters.deviation !== "all" ? params.filters.deviation : undefined,
		folder: params.folder,
		sort: params.sort?.field,
		dir: params.sort?.direction,
	};
}

export function useItems(params: ItemQueryParams) {
	const filterParams = buildFilterParams(params);

	const query = useInfiniteQuery({
		queryKey: ["items", filterParams],
		queryFn: ({ pageParam }) => fetchItems({ ...filterParams, cursor: pageParam }),
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

export function useTotals(params: Omit<ItemQueryParams, "sort">) {
	const { search, filters, folder } = params;

	const filterParams = {
		q: search || undefined,
		status: filters.status !== "all" ? filters.status : undefined,
		deviation: filters.deviation !== "all" ? filters.deviation : undefined,
		folder,
	};

	return useQuery({
		queryKey: ["totals", filterParams],
		queryFn: () => fetchTotals(filterParams),
	});
}
