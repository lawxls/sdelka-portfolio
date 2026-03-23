import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
	createFolder as apiCreateFolder,
	deleteFolder as apiDeleteFolder,
	updateFolder as apiUpdateFolder,
	fetchFolderStats,
	fetchFolders,
} from "./api-client";
import { SEED_FOLDER_ASSIGNMENTS } from "./mock-data";
import type { Folder, ProcurementItem } from "./types";
import { FOLDER_COLORS } from "./types";

export function nextUnusedColor(folders: Folder[]): string {
	const used = new Set(folders.map((f) => f.color));
	for (const color of FOLDER_COLORS) {
		if (!used.has(color)) return color;
	}
	return FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
}

// --- Query hooks ---

export function useFolders() {
	return useQuery({
		queryKey: ["folders"],
		queryFn: fetchFolders,
		select: (data) => data.folders,
	});
}

export function useFolderStats() {
	return useQuery({
		queryKey: ["folderStats"],
		queryFn: fetchFolderStats,
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
			return counts;
		},
	});
}

// --- Mutation hooks ---

export function useCreateFolder() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: { name: string; color: string }) => apiCreateFolder(data),
		onMutate: async (newFolder) => {
			await queryClient.cancelQueries({ queryKey: ["folders"] });
			const previous = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);

			queryClient.setQueryData<{ folders: Folder[] }>(["folders"], (old) => ({
				folders: [...(old?.folders ?? []), { id: `temp-${Date.now()}`, ...newFolder }],
			}));

			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["folders"], context.previous);
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

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) => apiUpdateFolder(id, data),
		onMutate: async ({ id, ...updates }) => {
			await queryClient.cancelQueries({ queryKey: ["folders"] });
			const previous = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);

			queryClient.setQueryData<{ folders: Folder[] }>(["folders"], (old) => ({
				folders: (old?.folders ?? []).map((f) => (f.id === id ? { ...f, ...updates } : f)),
			}));

			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["folders"], context.previous);
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

	return useMutation({
		mutationFn: (id: string) => apiDeleteFolder(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: ["folders"] });
			const previous = queryClient.getQueryData<{ folders: Folder[] }>(["folders"]);

			queryClient.setQueryData<{ folders: Folder[] }>(["folders"], (old) => ({
				folders: (old?.folders ?? []).filter((f) => f.id !== id),
			}));

			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["folders"], context.previous);
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

// --- Temporary backward compatibility (removed in #74/#76) ---

const LS_ASSIGNMENTS_KEY = "folder-assignments";

function readAssignments(): Record<string, string> {
	const stored = localStorage.getItem(LS_ASSIGNMENTS_KEY);
	return stored ? JSON.parse(stored) : SEED_FOLDER_ASSIGNMENTS;
}

function persistAssignments(assignments: Record<string, string>) {
	localStorage.setItem(LS_ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

/** @deprecated Temporary — replaced by item mutations in #74 */
export function useFolderAssignments() {
	const [assignments, setAssignments] = useState<Record<string, string>>(readAssignments);

	const assignItem = useCallback((itemId: string, folderId: string | null) => {
		setAssignments((prev) => {
			const next = { ...prev };
			if (folderId == null) {
				delete next[itemId];
			} else {
				next[itemId] = folderId;
			}
			persistAssignments(next);
			return next;
		});
	}, []);

	const applyFolders = useCallback(
		(items: ProcurementItem[]): ProcurementItem[] => {
			return items.map((item) => {
				const folderId = assignments[item.id] ?? null;
				return folderId === item.folderId ? item : { ...item, folderId };
			});
		},
		[assignments],
	);

	return { assignItem, applyFolders };
}
