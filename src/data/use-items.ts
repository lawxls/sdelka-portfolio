import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteItem as apiDeleteItem, updateItem as apiUpdateItem, fetchItems, fetchTotals } from "./api-client";
import type { FilterState, ProcurementItem, SortState } from "./types";

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

// --- Optimistic helpers ---

type ItemsCache = {
	pages: Array<{ items: ProcurementItem[]; nextCursor: string | null }>;
	pageParams: Array<string | undefined>;
};

function updateItemInPages(
	cache: ItemsCache,
	id: string,
	updater: (item: ProcurementItem) => ProcurementItem,
): ItemsCache {
	return {
		...cache,
		pages: cache.pages.map((page) => ({
			...page,
			items: page.items.map((item) => (item.id === id ? updater(item) : item)),
		})),
	};
}

function removeItemFromPages(cache: ItemsCache, id: string): ItemsCache {
	return {
		...cache,
		pages: cache.pages.map((page) => ({
			...page,
			items: page.items.filter((item) => item.id !== id),
		})),
	};
}

function invalidateItemQueries(queryClient: ReturnType<typeof useQueryClient>) {
	queryClient.invalidateQueries({ queryKey: ["items"] });
	queryClient.invalidateQueries({ queryKey: ["totals"] });
	queryClient.invalidateQueries({ queryKey: ["folderStats"] });
}

// --- Mutation hooks ---

export function useUpdateItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string; name?: string }) => apiUpdateItem(id, data),
		onMutate: async ({ id, ...updates }) => {
			await queryClient.cancelQueries({ queryKey: ["items"] });
			const snapshots = new Map<string, ItemsCache>();

			for (const [key, data] of queryClient.getQueriesData<ItemsCache>({ queryKey: ["items"] })) {
				if (data) {
					snapshots.set(JSON.stringify(key), data);
					queryClient.setQueryData<ItemsCache>(
						key,
						updateItemInPages(data, id, (item) => ({ ...item, ...updates })),
					);
				}
			}

			return { snapshots };
		},
		onError: (_err, _vars, context) => {
			if (context?.snapshots) {
				for (const [key, data] of context.snapshots) {
					queryClient.setQueryData(JSON.parse(key), data);
				}
			}
			toast.error("Не удалось обновить закупку");
		},
		onSettled: () => invalidateItemQueries(queryClient),
	});
}

export function useDeleteItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => apiDeleteItem(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["items"] });
			const snapshots = new Map<string, ItemsCache>();

			for (const [key, data] of queryClient.getQueriesData<ItemsCache>({ queryKey: ["items"] })) {
				if (data) {
					snapshots.set(JSON.stringify(key), data);
					queryClient.setQueryData<ItemsCache>(key, removeItemFromPages(data, id));
				}
			}

			return { snapshots };
		},
		onError: (_err, _vars, context) => {
			if (context?.snapshots) {
				for (const [key, data] of context.snapshots) {
					queryClient.setQueryData(JSON.parse(key), data);
				}
			}
			toast.error("Не удалось удалить закупку");
		},
		onSettled: () => invalidateItemQueries(queryClient),
	});
}

export function useAssignFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) => apiUpdateItem(id, { folderId }),
		onMutate: async ({ id, folderId }) => {
			await queryClient.cancelQueries({ queryKey: ["items"] });
			const snapshots = new Map<string, ItemsCache>();

			for (const [key, data] of queryClient.getQueriesData<ItemsCache>({ queryKey: ["items"] })) {
				if (data) {
					snapshots.set(JSON.stringify(key), data);
					queryClient.setQueryData<ItemsCache>(
						key,
						updateItemInPages(data, id, (item) => ({ ...item, folderId })),
					);
				}
			}

			return { snapshots };
		},
		onError: (_err, _vars, context) => {
			if (context?.snapshots) {
				for (const [key, data] of context.snapshots) {
					queryClient.setQueryData(JSON.parse(key), data);
				}
			}
			toast.error("Не удалось переместить закупку");
		},
		onSettled: () => invalidateItemQueries(queryClient),
	});
}
