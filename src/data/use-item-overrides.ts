import { useCallback, useState } from "react";
import type { ProcurementItem } from "./types";

const LS_KEY = "item-overrides";

interface ItemOverrides {
	deleted: string[];
	renamed: Record<string, string>;
}

function readOverrides(): ItemOverrides {
	const stored = localStorage.getItem(LS_KEY);
	return stored ? JSON.parse(stored) : { deleted: [], renamed: {} };
}

function persistOverrides(overrides: ItemOverrides) {
	localStorage.setItem(LS_KEY, JSON.stringify(overrides));
}

export interface UseItemOverridesResult {
	applyOverrides: (items: ProcurementItem[]) => ProcurementItem[];
	deleteItem: (id: string) => void;
	renameItem: (id: string, name: string) => void;
}

export function useItemOverrides(): UseItemOverridesResult {
	const [overrides, setOverrides] = useState<ItemOverrides>(readOverrides);

	const applyOverrides = useCallback(
		(items: ProcurementItem[]): ProcurementItem[] => {
			const { deleted, renamed } = overrides;
			if (deleted.length === 0 && Object.keys(renamed).length === 0) return items;
			const deletedSet = new Set(deleted);
			return items
				.filter((item) => !deletedSet.has(item.id))
				.map((item) => (renamed[item.id] ? { ...item, name: renamed[item.id] } : item));
		},
		[overrides],
	);

	const deleteItem = useCallback((id: string) => {
		setOverrides((prev) => {
			if (prev.deleted.includes(id)) return prev;
			const next = { ...prev, deleted: [...prev.deleted, id] };
			persistOverrides(next);
			return next;
		});
	}, []);

	const renameItem = useCallback((id: string, name: string) => {
		setOverrides((prev) => {
			const next = { ...prev, renamed: { ...prev.renamed, [id]: name } };
			persistOverrides(next);
			return next;
		});
	}, []);

	return { applyOverrides, deleteItem, renameItem };
}
