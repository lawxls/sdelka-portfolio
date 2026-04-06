import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	archiveSupplier,
	deleteSuppliers,
	getAllSuppliers,
	getSupplier,
	getSuppliers,
	sendSupplierMessage,
} from "./supplier-mock-data";
import type { Supplier, SupplierChatMessage, SupplierFilterParams } from "./supplier-types";
import { filesToAttachments } from "./supplier-types";

export function useSuppliers(itemId: string | null) {
	return useQuery({
		queryKey: ["suppliers-all", itemId],
		queryFn: () => getAllSuppliers(itemId as string),
		enabled: itemId !== null,
	});
}

export function useInfiniteSuppliers(itemId: string | null, params?: Omit<SupplierFilterParams, "cursor">) {
	return useInfiniteQuery({
		queryKey: ["suppliers", itemId, params ?? {}],
		queryFn: ({ pageParam }) => getSuppliers(itemId as string, { ...params, cursor: pageParam }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		enabled: itemId !== null,
	});
}

export function useSupplier(itemId: string, supplierId: string | null) {
	return useQuery({
		queryKey: ["supplier", itemId, supplierId],
		queryFn: () => getSupplier(itemId, supplierId as string),
		enabled: supplierId !== null,
	});
}

export function useArchiveSupplier() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, supplierId }: { itemId: string; supplierId: string }) => archiveSupplier(itemId, supplierId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			queryClient.invalidateQueries({ queryKey: ["suppliers-all"] });
		},
	});
}

export function useDeleteSuppliers() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, supplierIds }: { itemId: string; supplierIds: string[] }) =>
			deleteSuppliers(itemId, supplierIds),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			queryClient.invalidateQueries({ queryKey: ["suppliers-all"] });
		},
	});
}

interface SendMessagePayload {
	body: string;
	files: File[];
}

export function useSendSupplierMessage(itemId: string, supplierId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ body, files }: SendMessagePayload) =>
			sendSupplierMessage(itemId, supplierId, body, files.length > 0 ? files : undefined),
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
