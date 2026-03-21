import { useCallback, useState } from "react";
import type { Frequency, ProcurementItem, ProcurementType, Unit } from "./types";

const LS_KEY = "custom-items";

export interface NewItemInput {
	name: string;
	description?: string;
	unit?: Unit;
	annualQuantity?: number;
	currentPrice?: number;
	procurementType?: ProcurementType;
	frequency?: Frequency;
}

function readItems(): ProcurementItem[] {
	const stored = localStorage.getItem(LS_KEY);
	return stored ? JSON.parse(stored) : [];
}

function persistItems(items: ProcurementItem[]) {
	localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export interface UseCustomItemsResult {
	getItems: () => ProcurementItem[];
	addItems: (inputs: NewItemInput[]) => void;
}

export function useCustomItems(): UseCustomItemsResult {
	const [items, setItems] = useState<ProcurementItem[]>(readItems);

	const getItems = useCallback(() => items, [items]);

	const addItems = useCallback((inputs: NewItemInput[]) => {
		setItems((prev) => {
			const newItems: ProcurementItem[] = inputs.map((input) => ({
				id: `custom-${crypto.randomUUID()}`,
				name: input.name,
				description: input.description,
				unit: input.unit,
				procurementType: input.procurementType,
				frequency: input.frequency,
				status: "searching" as const,
				annualQuantity: input.annualQuantity ?? 0,
				currentPrice: input.currentPrice ?? 0,
				bestPrice: null,
				averagePrice: null,
				folderId: null,
			}));
			const next = [...prev, ...newItems];
			persistItems(next);
			return next;
		});
	}, []);

	return { getItems, addItems };
}
