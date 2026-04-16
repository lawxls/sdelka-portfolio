import { _getItem, _patchItem, _resetItemsStore } from "./items-mock-data";
import type { ProcurementItem } from "./types";

export function _resetItemDetailStore(): void {
	_resetItemsStore();
}

// --- Configurable delay ---

let delayConfig = { min: 300, max: 500 };

export function _setItemDetailMockDelay(min: number, max: number) {
	delayConfig = { min, max };
}

function simulateDelay(): Promise<void> {
	const ms = delayConfig.min + Math.floor(Math.random() * (delayConfig.max - delayConfig.min + 1));
	if (ms <= 0) return Promise.resolve();
	return new Promise((r) => setTimeout(r, ms));
}

// --- Mock API functions ---

export async function getItemDetail(id: string): Promise<ProcurementItem | null> {
	await simulateDelay();
	return _getItem(id);
}

export async function updateItemDetail(
	id: string,
	data: Partial<Omit<ProcurementItem, "id" | "status" | "bestPrice" | "averagePrice" | "companyId">>,
): Promise<ProcurementItem> {
	await simulateDelay();
	const updated = _patchItem(id, data);
	if (!updated) throw new Error(`Item ${id} not found`);
	return updated;
}
