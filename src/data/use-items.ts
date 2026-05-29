import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useItemsClient } from "./clients-context";
import type { ExportItemsParams, ListItemsParams, UpdateItemData } from "./domains/items";
import { invalidateAfterItemListChange } from "./invalidation-policies";
import { applyOptimistic, applyToCache, rollbackOptimistic } from "./optimistic";
import { keys } from "./query-keys";
import { infinitePages } from "./shape-adapters";
import type { CurrentSupplier, FilterState, NewItemInput, ProcurementItem, SortState } from "./types";

interface ItemQueryParams {
	search: string;
	filters: FilterState;
	sort: SortState | null;
	folder?: string;
	company?: string;
	procurementInquiry?: string;
}

const ITEMS_PAGE_SIZE = 25;
const INTERACTIVE_LIST_STALE_TIME = 0;

export function buildFilterParams({
	search,
	filters,
	folder,
	sort,
	company,
	procurementInquiry,
}: ItemQueryParams): ListItemsParams {
	return {
		q: search || undefined,
		status: filters.status !== "all" ? filters.status : undefined,
		deviation: filters.deviation !== "all" ? filters.deviation : undefined,
		folder,
		company,
		procurementInquiry,
		sort: sort?.field,
		dir: sort?.direction,
	};
}

export function useItems(params: ItemQueryParams) {
	const client = useItemsClient();
	const filterParams = buildFilterParams(params);

	const query = useInfiniteQuery({
		queryKey: keys.items.list(filterParams),
		queryFn: ({ pageParam }) => client.list({ ...filterParams, cursor: pageParam, limit: ITEMS_PAGE_SIZE }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		staleTime: INTERACTIVE_LIST_STALE_TIME,
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

export function useAllItems(options?: { enabled?: boolean }) {
	const client = useItemsClient();
	return useQuery({
		queryKey: keys.items.listAll(),
		queryFn: () => client.listAll(),
		enabled: options?.enabled ?? true,
	});
}

export function useTotals(params: Omit<ItemQueryParams, "sort">) {
	const client = useItemsClient();
	const { sort: _sort, dir: _dir, ...filterParams } = buildFilterParams({ ...params, sort: null });

	return useQuery({
		queryKey: keys.items.totals(filterParams),
		queryFn: () => client.totals(filterParams),
		staleTime: INTERACTIVE_LIST_STALE_TIME,
	});
}

// --- Mutation hooks ---

const itemsListPages = infinitePages<{ items: ProcurementItem[]; nextCursor: string | null }, ProcurementItem>({
	get: (page) => page.items,
	set: (page, items) => ({ ...page, items }),
});

export function useCreateItems() {
	const client = useItemsClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (items: NewItemInput[]) => client.create(items),
		onSuccess: () => invalidateAfterItemListChange(queryClient),
		onError: () => {
			toast.error("Не удалось создать закупки");
		},
	});
}

type UpdateItemVars = { id: string } & UpdateItemData;

export function useUpdateItem() {
	const client = useItemsClient();
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: ({ id, ...data }: UpdateItemVars) => client.update(id, data),
		onMutate: ({ id, ...updates }) =>
			applyOptimistic(queryClient, [
				{
					queryKey: keys.items.all(),
					prefix: true,
					update: itemsListPages.patchById(id, (item) => ({ ...item, ...updates })),
				},
			]),
		onSuccess: (serverItem) => {
			applyToCache(queryClient, [
				{
					queryKey: keys.items.all(),
					prefix: true,
					update: itemsListPages.patchById(serverItem.id, () => serverItem),
				},
			]);
			if (serverItem.procurementInquiryId) {
				queryClient.invalidateQueries({
					queryKey: keys.procurementInquiries.detail(serverItem.procurementInquiryId),
				});
			}
		},
		onError: (_err, _vars, context) => {
			rollbackOptimistic(queryClient, context);
			toast.error("Не удалось обновить закупку");
		},
	});

	return {
		...mutation,
		/** mutate with synchronous cache update so the old value never flashes. */
		mutate(vars: UpdateItemVars) {
			const { id, ...updates } = vars;
			applyToCache(queryClient, [
				{
					queryKey: keys.items.all(),
					prefix: true,
					update: itemsListPages.patchById(id, (item) => ({ ...item, ...updates })),
				},
			]);
			mutation.mutate(vars);
		},
	};
}

/** Set or clear `currentSupplier` on a procurement item. Also seeds the item's
 * `currentPrice` from the supplier's price when present, and invalidates the
 * suppliers cache so the «Ваш поставщик» pinned row refreshes. */
export function useUpdateItemCurrentSupplier() {
	const client = useItemsClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, currentSupplier }: { id: string; currentSupplier: CurrentSupplier | undefined }) => {
			const patch: Partial<ProcurementItem> = { currentSupplier };
			if (currentSupplier?.pricePerUnit != null) patch.currentPrice = currentSupplier.pricePerUnit;
			return client.update(id, patch);
		},
		onSuccess: (serverItem) => {
			applyToCache(queryClient, [
				{
					queryKey: keys.items.all(),
					prefix: true,
					update: itemsListPages.patchById(serverItem.id, () => serverItem),
				},
			]);
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			queryClient.invalidateQueries({ queryKey: ["suppliers-all"] });
			queryClient.invalidateQueries({ queryKey: ["suppliers-global"] });
			if (serverItem.procurementInquiryId) {
				queryClient.invalidateQueries({
					queryKey: keys.procurementInquiries.detail(serverItem.procurementInquiryId),
				});
			}
		},
		onError: () => {
			toast.error("Не удалось обновить текущего поставщика");
		},
	});
}

export function useArchiveItem() {
	const client = useItemsClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) => client.archive(id, isArchived),
		onSettled: () => invalidateAfterItemListChange(queryClient),
		onError: () => toast.error("Не удалось обновить статус архива"),
	});
}

export function useDeleteItem() {
	const client = useItemsClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => client.delete(id),
		onMutate: (id) =>
			applyOptimistic(queryClient, [
				{ queryKey: keys.items.all(), prefix: true, update: itemsListPages.removeById(id) },
			]),
		onError: (_err, _vars, context) => {
			rollbackOptimistic(queryClient, context);
			toast.error("Не удалось удалить закупку");
		},
		onSettled: () => invalidateAfterItemListChange(queryClient),
	});
}

export function useExportItems() {
	const client = useItemsClient();
	return useMutation({
		mutationFn: (params: ExportItemsParams) => client.export(params),
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
