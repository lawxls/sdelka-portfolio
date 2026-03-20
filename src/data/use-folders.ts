import { useCallback, useMemo, useState } from "react";
import { mockProcurementItems, SEED_FOLDER_ASSIGNMENTS, SEED_FOLDERS } from "./mock-data";
import type { Folder, ProcurementItem } from "./types";
import { FOLDER_COLORS } from "./types";

const LS_FOLDERS_KEY = "folders";
const LS_ASSIGNMENTS_KEY = "folder-assignments";

function readFolders(): Folder[] {
	const stored = localStorage.getItem(LS_FOLDERS_KEY);
	return stored ? JSON.parse(stored) : SEED_FOLDERS;
}

function readAssignments(): Record<string, string> {
	const stored = localStorage.getItem(LS_ASSIGNMENTS_KEY);
	return stored ? JSON.parse(stored) : SEED_FOLDER_ASSIGNMENTS;
}

function persistFolders(folders: Folder[]) {
	localStorage.setItem(LS_FOLDERS_KEY, JSON.stringify(folders));
}

function persistAssignments(assignments: Record<string, string>) {
	localStorage.setItem(LS_ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

function nextUnusedColor(folders: Folder[]): string {
	const used = new Set(folders.map((f) => f.color));
	for (const color of FOLDER_COLORS) {
		if (!used.has(color)) return color;
	}
	// All colors used — cycle from the start
	return FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
}

export interface UseFoldersResult {
	folders: Folder[];
	counts: Record<string, number>;
	createFolder: (name: string) => Folder | null;
	renameFolder: (id: string, name: string) => boolean;
	recolorFolder: (id: string, color: string) => void;
	deleteFolder: (id: string) => void;
	assignItem: (itemId: string, folderId: string | null) => void;
	applyFolders: (items: ProcurementItem[]) => ProcurementItem[];
}

export function useFolders(): UseFoldersResult {
	const [folders, setFolders] = useState<Folder[]>(readFolders);
	const [assignments, setAssignments] = useState<Record<string, string>>(readAssignments);

	const createFolder = useCallback((name: string): Folder | null => {
		let created: Folder | null = null;
		setFolders((prev) => {
			const lower = name.toLowerCase();
			if (prev.some((f) => f.name.toLowerCase() === lower)) return prev;
			const folder: Folder = {
				id: crypto.randomUUID(),
				name,
				color: nextUnusedColor(prev),
			};
			const next = [...prev, folder];
			persistFolders(next);
			created = folder;
			return next;
		});
		return created;
	}, []);

	const renameFolder = useCallback((id: string, name: string): boolean => {
		let success = false;
		setFolders((prev) => {
			const lower = name.toLowerCase();
			if (prev.some((f) => f.id !== id && f.name.toLowerCase() === lower)) return prev;
			const next = prev.map((f) => (f.id === id ? { ...f, name } : f));
			persistFolders(next);
			success = true;
			return next;
		});
		return success;
	}, []);

	const recolorFolder = useCallback((id: string, color: string) => {
		setFolders((prev) => {
			const next = prev.map((f) => (f.id === id ? { ...f, color } : f));
			persistFolders(next);
			return next;
		});
	}, []);

	const deleteFolder = useCallback((id: string) => {
		setFolders((prev) => {
			const next = prev.filter((f) => f.id !== id);
			persistFolders(next);
			return next;
		});
		setAssignments((prev) => {
			const next = Object.fromEntries(Object.entries(prev).filter(([, fid]) => fid !== id));
			persistAssignments(next);
			return next;
		});
	}, []);

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
			return items.map((item) => ({
				...item,
				folderId: assignments[item.id] ?? null,
			}));
		},
		[assignments],
	);

	const counts = useMemo(() => {
		const result: Record<string, number> = { all: mockProcurementItems.length };
		let unassigned = 0;
		for (const item of mockProcurementItems) {
			const folderId = assignments[item.id];
			if (folderId) {
				result[folderId] = (result[folderId] ?? 0) + 1;
			} else {
				unassigned++;
			}
		}
		result.none = unassigned;
		return result;
	}, [assignments]);

	return {
		folders,
		counts,
		createFolder,
		renameFolder,
		recolorFolder,
		deleteFolder,
		assignItem,
		applyFolders,
	};
}
