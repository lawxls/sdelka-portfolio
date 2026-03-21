import { useCallback, useState } from "react";
import type {
	DeliveryType,
	Frequency,
	LegalEntityMode,
	PaymentMethod,
	PaymentType,
	ProcurementItem,
	ProcurementType,
	Unit,
	UnloadingType,
} from "./types";

const LS_KEY = "custom-items";

export interface NewItemInput {
	name: string;
	description?: string;
	unit?: Unit;
	annualQuantity?: number;
	currentPrice?: number;
	procurementType?: ProcurementType;
	frequency?: Frequency;
	legalEntityMode?: LegalEntityMode;
	legalEntityCompany?: string;
	paymentType?: PaymentType;
	paymentDeferralDays?: number;
	vatIncluded?: boolean;
	paymentMethod?: PaymentMethod;
	deliveryType?: DeliveryType;
	deliveryAddress?: string;
	unloading?: UnloadingType;
	analoguesAllowed?: boolean;
}

function readItems(): ProcurementItem[] {
	const stored = localStorage.getItem(LS_KEY);
	return stored ? JSON.parse(stored) : [];
}

function persistItems(items: ProcurementItem[]) {
	localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export interface UseCustomItemsResult {
	items: ProcurementItem[];
	addItems: (inputs: NewItemInput[]) => void;
}

export function useCustomItems(): UseCustomItemsResult {
	const [items, setItems] = useState<ProcurementItem[]>(readItems);

	const addItems = useCallback((inputs: NewItemInput[]) => {
		setItems((prev) => {
			const newItems: ProcurementItem[] = inputs.map((input) => ({
				...input,
				id: `custom-${crypto.randomUUID()}`,
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

	return { items, addItems };
}
