import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFoldersClient } from "./clients-context";
import type { Folder } from "./types";
import { FOLDER_COLORS } from "./types";

export function nextUnusedColor(folders: Folder[]): string {
	const used = new Set(folders.map((f) => f.color));
	for (const color of FOLDER_COLORS) {
		if (!used.has(color)) return color;
	}
	return FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
}

// --- Query hooks ---

export function useFolders(company?: string) {
	const client = useFoldersClient();
	return useQuery({
		queryKey: ["folders", { company }],
		queryFn: () => client.list(),
	});
}

export function useFolderStats(company?: string) {
	const client = useFoldersClient();
	return useQuery({
		queryKey: ["folderStats", { company }],
		queryFn: () => client.stats({ company }),
		select: (data) => {
			const counts: Record<string, number> = {};
			let total = 0;
			for (const stat of data.stats) {
				if (stat.folderId === null) {
					counts.none = stat.itemCount;
				} else {
					counts[stat.folderId] = stat.itemCount;
				}
				total += stat.itemCount;
			}
			counts.all = total;
			counts.archive = data.archiveCount ?? 0;
			return counts;
		},
	});
}

// --- Mutation hooks ---

export function useCreateFolder() {
	const queryClient = useQueryClient();
	const client = useFoldersClient();

	return useMutation({
		mutationFn: (data: { name: string; color: string }) => client.create(data),
		onMutate: async (newFolder) => {
			await queryClient.cancelQueries({ queryKey: ["folders"] });
			const previous = queryClient.getQueriesData<Folder[]>({ queryKey: ["folders"] });

			queryClient.setQueriesData<Folder[]>({ queryKey: ["folders"] }, (old) => [
				...(old ?? []),
				{ id: `temp-${Date.now()}`, ...newFolder },
			]);

			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				for (const [key, value] of context.previous) {
					queryClient.setQueryData(key, value);
				}
			}
			toast.error("Не удалось создать раздел");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["folders"] });
			queryClient.invalidateQueries({ queryKey: ["folderStats"] });
		},
	});
}

export function useUpdateFolder() {
	const queryClient = useQueryClient();
	const client = useFoldersClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) => client.update(id, data),
		onMutate: async ({ id, ...updates }) => {
			await queryClient.cancelQueries({ queryKey: ["folders"] });
			const previous = queryClient.getQueriesData<Folder[]>({ queryKey: ["folders"] });

			queryClient.setQueriesData<Folder[]>({ queryKey: ["folders"] }, (old) =>
				(old ?? []).map((f) => (f.id === id ? { ...f, ...updates } : f)),
			);

			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				for (const [key, value] of context.previous) {
					queryClient.setQueryData(key, value);
				}
			}
			toast.error("Не удалось обновить раздел");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["folders"] });
			queryClient.invalidateQueries({ queryKey: ["folderStats"] });
		},
	});
}

export function useDeleteFolder() {
	const queryClient = useQueryClient();
	const client = useFoldersClient();

	return useMutation({
		mutationFn: (id: string) => client.delete(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["folders"] });
			const previous = queryClient.getQueriesData<Folder[]>({ queryKey: ["folders"] });

			queryClient.setQueriesData<Folder[]>({ queryKey: ["folders"] }, (old) => (old ?? []).filter((f) => f.id !== id));

			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				for (const [key, value] of context.previous) {
					queryClient.setQueryData(key, value);
				}
			}
			toast.error("Не удалось удалить раздел");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["folders"] });
			queryClient.invalidateQueries({ queryKey: ["folderStats"] });
			queryClient.invalidateQueries({ queryKey: ["items"] });
		},
	});
}
