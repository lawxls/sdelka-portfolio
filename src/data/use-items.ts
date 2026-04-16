import type { QueryKey } from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	deleteItemMock as apiDeleteItem,
	updateItemMock as apiUpdateItem,
	createItemsBatchMock as createItemsBatch,
	exportItemsMock as exportItems,
	type FilterParams as FetchItemsParams,
	fetchItemsMock as fetchItems,
	fetchTotalsMock as fetchTotals,
} from "./items-mock-data";
import type { FilterState, NewItemInput, ProcurementItem, SortState } from "./types";

type BatchCreateResult = {
	items?: ProcurementItem[];
	isAsync: boolean;
	taskId?: string;
};

interface ItemQueryParams {
	search: string;
	filters: FilterState;
	sort: SortState | null;
	folder?: string;
	company?: string;
}

export function buildFilterParams({ search, filters, folder, sort, company }: ItemQueryParams) {
	return {
		q: search || undefined,
		status: filters.status !== "all" ? filters.status : undefined,
		deviation: filters.deviation !== "all" ? filters.deviation : undefined,
		folder,
		company,
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

	const mutation = useMutation({
		mutationFn: ({ id, ...data }: { id: string; name?: string }) => apiUpdateItem(id, data),
		onMutate: async ({ id, ...updates }) =>
			optimisticItemUpdate(queryClient, (_key, data) =>
				updateItemInPages(data, id, (item) => ({ ...item, ...updates })),
			),
		onSuccess: (serverItem) => {
			for (const [key] of queryClient.getQueriesData<ItemsCache>({ queryKey: ["items"] })) {
				queryClient.setQueryData<ItemsCache>(key, (old) =>
					old ? updateItemInPages(old, serverItem.id, () => serverItem) : old,
				);
			}
		},
		onError: (_err, _vars, context) => {
			rollbackSnapshots(queryClient, context);
			toast.error("Не удалось обновить закупку");
		},
	});

	return {
		...mutation,
		/** mutate with synchronous cache update so the old name never flashes. */
		mutate(vars: { id: string; name?: string; folderId?: string | null }) {
			const { id, ...updates } = vars;
			for (const [key, data] of queryClient.getQueriesData<ItemsCache>({ queryKey: ["items"] })) {
				if (data) {
					queryClient.setQueryData<ItemsCache>(
						key,
						updateItemInPages(data, id, (item) => ({ ...item, ...updates })),
					);
				}
			}
			mutation.mutate(vars);
		},
	};
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

export function useArchiveItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) => apiUpdateItem(id, { isArchived }),
		onMutate: async ({ id }) => optimisticItemUpdate(queryClient, (_key, data) => removeItemFromPages(data, id)),
		onError: (_err, _vars, context) => {
			rollbackSnapshots(queryClient, context);
			toast.error("Не удалось переместить закупку");
		},
		onSettled: () => invalidateItemQueries(queryClient),
	});
}

export function useExportItems() {
	return useMutation({
		mutationFn: (_params: Omit<FetchItemsParams, "cursor" | "limit">) => exportItems(),
		onSuccess: ({ blob, filename }) => {
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		},
		onError: () => {
			toast.error("Не удалось скачать таблицу");
		},
	});
}

export function useAssignFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, folderId, isArchived }: { id: string; folderId: string | null; isArchived?: boolean }) =>
			apiUpdateItem(id, { folderId, ...(isArchived !== undefined && { isArchived }) }),
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
