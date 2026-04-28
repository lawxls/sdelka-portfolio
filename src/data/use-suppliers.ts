import { type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSuppliersClient } from "./clients-context";
import type { Supplier, SupplierChatMessage, SupplierFilterParams } from "./supplier-types";
import { filesToAttachments } from "./supplier-types";

export function invalidateSupplierLists(queryClient: QueryClient, itemId: string) {
	queryClient.invalidateQueries({ queryKey: ["suppliers", itemId] });
	queryClient.invalidateQueries({ queryKey: ["suppliers-all", itemId] });
	queryClient.invalidateQueries({ queryKey: ["suppliers-global"] });
	queryClient.invalidateQueries({ queryKey: ["supplier-quotes"] });
}

export function useSuppliers(itemId: string | null) {
	const client = useSuppliersClient();
	return useQuery({
		queryKey: ["suppliers-all", itemId],
		queryFn: () => client.listForItem(itemId as string),
		enabled: itemId !== null,
	});
}

export function useAllSuppliers(options?: { enabled?: boolean }) {
	const client = useSuppliersClient();
	return useQuery({
		queryKey: ["suppliers-global"],
		queryFn: () => client.listAll(),
		enabled: options?.enabled ?? true,
	});
}

export function useInfiniteSuppliers(itemId: string | null, params?: Omit<SupplierFilterParams, "cursor">) {
	const client = useSuppliersClient();
	return useInfiniteQuery({
		queryKey: ["suppliers", itemId, params ?? {}],
		queryFn: ({ pageParam }) => client.list(itemId as string, { ...params, cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		enabled: itemId !== null,
	});
}

export function useSupplier(itemId: string, supplierId: string | null) {
	const client = useSuppliersClient();
	return useQuery({
		queryKey: ["supplier", itemId, supplierId],
		queryFn: () => client.get(itemId, supplierId as string),
		enabled: supplierId !== null,
	});
}

export function useSupplierById(supplierId: string | null) {
	const client = useSuppliersClient();
	return useQuery({
		queryKey: ["supplier-by-id", supplierId],
		queryFn: () => client.getById(supplierId as string),
		enabled: supplierId !== null,
	});
}

export function useSupplierQuotes(inn: string | null, contextItemId: string) {
	const client = useSuppliersClient();
	return useQuery({
		queryKey: ["supplier-quotes", inn, contextItemId],
		queryFn: () => client.quotesByInn(inn as string, contextItemId),
		enabled: inn !== null && inn.length > 0,
	});
}

export function useArchiveSuppliers() {
	const client = useSuppliersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, supplierIds }: { itemId: string; supplierIds: string[] }) =>
			client.archive(itemId, supplierIds),
		onSuccess: (_data, { itemId }) => invalidateSupplierLists(queryClient, itemId),
	});
}

export function useUnarchiveSuppliers() {
	const client = useSuppliersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, supplierIds }: { itemId: string; supplierIds: string[] }) =>
			client.unarchive(itemId, supplierIds),
		onSuccess: (_data, { itemId }) => invalidateSupplierLists(queryClient, itemId),
	});
}

export function useSendSupplierRequest() {
	const client = useSuppliersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, supplierIds }: { itemId: string; supplierIds: string[] }) =>
			client.sendRequest(itemId, supplierIds),
		onSuccess: (_data, { itemId }) => {
			invalidateSupplierLists(queryClient, itemId);
			// The item may have flipped to "negotiating" — refresh the item list/detail queries.
			queryClient.invalidateQueries({ queryKey: ["items"] });
			queryClient.invalidateQueries({ queryKey: ["totals"] });
			queryClient.invalidateQueries({ queryKey: ["itemDetail", itemId] });
		},
	});
}

export function useDeleteSuppliers() {
	const client = useSuppliersClient();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, supplierIds }: { itemId: string; supplierIds: string[] }) =>
			client.delete(itemId, supplierIds),
		onSuccess: (_data, { itemId }) => invalidateSupplierLists(queryClient, itemId),
	});
}

interface SendMessagePayload {
	body: string;
	files: File[];
}

export function useSendSupplierMessage(itemId: string, supplierId: string) {
	const client = useSuppliersClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ body, files }: SendMessagePayload) =>
			client.sendMessage(itemId, supplierId, body, files.length > 0 ? files : undefined),
		onMutate: async ({ body, files }) => {
			const queryKey = ["supplier", itemId, supplierId];
			await queryClient.cancelQueries({ queryKey });

			const snapshot = queryClient.getQueryData<Supplier | null>(queryKey);

			const attachments = files.length > 0 ? filesToAttachments(files) : undefined;

			const optimisticMessage: SupplierChatMessage = {
				sender: "Агент",
				timestamp: new Date().toISOString(),
				body,
				isOurs: true,
				attachments,
			};

			queryClient.setQueryData<Supplier | null>(queryKey, (old) => {
				if (!old) return old;
				return { ...old, chatHistory: [...old.chatHistory, optimisticMessage] };
			});

			return { snapshot };
		},
		onError: (_err, _payload, context) => {
			if (context?.snapshot !== undefined) {
				queryClient.setQueryData(["supplier", itemId, supplierId], context.snapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["supplier", itemId, supplierId] });
		},
	});
}
