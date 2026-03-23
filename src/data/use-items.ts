import type { QueryKey } from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BatchCreateResult } from "./api-client";
import {
	deleteItem as apiDeleteItem,
	updateItem as apiUpdateItem,
	createItemsBatch,
	fetchItems,
	fetchTotals,
} from "./api-client";
import type { FilterState, NewItemInput, ProcurementItem, SortState } from "./types";

interface ItemQueryParams {
	search: string;
	filters: FilterState;
	sort: SortState | null;
	folder?: string;
}

function buildFilterParams({ search, filters, folder, sort }: ItemQueryParams) {
	return {
		q: search || undefined,
		status: filters.status !== "all" ? filters.status : undefined,
		deviation: filters.deviation !== "all" ? filters.deviation : undefined,
		folder,
		sort: sort?.field,
		dir: sort?.direction,
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
	const { sort: _sort, ...filterParams } = buildFilterParams({ ...params, sort: null });

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

type Snapshots = Array<[QueryKey, ItemsCache]>;

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

/** Snapshot all items query caches, apply an updater, and return snapshots for rollback. */
async function optimisticItemUpdate(
	queryClient: ReturnType<typeof useQueryClient>,
	updater: (key: QueryKey, data: ItemsCache) => ItemsCache,
): Promise<{ snapshots: Snapshots }> {
	await queryClient.cancelQueries({ queryKey: ["items"] });
	const snapshots: Snapshots = [];

	for (const [key, data] of queryClient.getQueriesData<ItemsCache>({ queryKey: ["items"] })) {
		if (data) {
			snapshots.push([key, data]);
			queryClient.setQueryData<ItemsCache>(key, updater(key, data));
		}
	}

	return { snapshots };
}

function rollbackSnapshots(
	queryClient: ReturnType<typeof useQueryClient>,
	context: { snapshots: Snapshots } | undefined,
) {
	if (!context?.snapshots) return;
	for (const [key, data] of context.snapshots) {
		queryClient.setQueryData(key, data);
	}
}

// --- Mutation hooks ---

export function useCreateItems() {
	const queryClient = useQueryClient();

	return useMutation<BatchCreateResult, Error, NewItemInput[]>({
		mutationFn: (items) => createItemsBatch(items),
		onSuccess: () => invalidateItemQueries(queryClient),
		onError: () => {
			toast.error("Не удалось создать закупки");
		},
	});
}

export function useUpdateItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string; name?: string }) => apiUpdateItem(id, data),
		onMutate: async ({ id, ...updates }) =>
			optimisticItemUpdate(queryClient, (_key, data) =>
				updateItemInPages(data, id, (item) => ({ ...item, ...updates })),
			),
		onError: (_err, _vars, context) => {
			rollbackSnapshots(queryClient, context);
			toast.error("Не удалось обновить закупку");
		},
		onSettled: () => invalidateItemQueries(queryClient),
	});
}

export function useDeleteItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => apiDeleteItem(id),
		onMutate: async (id) => optimisticItemUpdate(queryClient, (_key, data) => removeItemFromPages(data, id)),
		onError: (_err, _vars, context) => {
			rollbackSnapshots(queryClient, context);
			toast.error("Не удалось удалить закупку");
		},
		onSettled: () => invalidateItemQueries(queryClient),
	});
}

export function useAssignFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) => apiUpdateItem(id, { folderId }),
		onMutate: async ({ id, folderId }) =>
			optimisticItemUpdate(queryClient, (key, data) => {
				const cacheFolder = (key[1] as Record<string, unknown>).folder as string | undefined;
				if (cacheFolder !== undefined) {
					const matches = cacheFolder === "none" ? folderId === null : cacheFolder === folderId;
					if (!matches) return removeItemFromPages(data, id);
				}
				return updateItemInPages(data, id, (item) => ({ ...item, folderId }));
			}),
		onError: (_err, _vars, context) => {
			rollbackSnapshots(queryClient, context);
			toast.error("Не удалось переместить закупку");
		},
		onSettled: () => invalidateItemQueries(queryClient),
	});
}
