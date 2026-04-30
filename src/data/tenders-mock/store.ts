import { SEED_TENDERS } from "../seeds/tenders";
import type { ProcurementInquiry } from "../types";

let tendersStore: ProcurementInquiry[] = [];

function cloneTender(t: ProcurementInquiry): ProcurementInquiry {
	return {
		...t,
		addressIds: t.addressIds ? [...t.addressIds] : undefined,
		attachedFiles: t.attachedFiles ? t.attachedFiles.map((a) => ({ ...a })) : undefined,
		currentSupplier: t.currentSupplier ? { ...t.currentSupplier } : undefined,
	};
}

function seedStore() {
	tendersStore = SEED_TENDERS.map(cloneTender);
}

seedStore();

export function _setTenders(tenders: ProcurementInquiry[]): void {
	tendersStore = tenders.map(cloneTender);
}

/** Read-side accessor for queries. Returns the live array reference; callers
 * must not mutate it. Mutations go through `writeTenderAt`. */
export function readTenders(): ProcurementInquiry[] {
	return tendersStore;
}

/** Cross-entity lookup helper. Returns a defensive clone, or null when the slug
 * is unknown. Used by items-in-memory (filter join), folders-mock-data (stats),
 * and suppliers-mock (currentSupplier reads) since shared step1 meta now lives
 * on the tender, not on the item. */
export function _getTender(id: string): ProcurementInquiry | null {
	const tender = tendersStore.find((t) => t.id === id);
	return tender ? cloneTender(tender) : null;
}

/** Cross-entity helper: is the parent tender archived? Items-in-memory uses
 * this to cascade archive into the positions list — items belonging to an
 * archived tender disappear from non-archive views. */
export function _isTenderArchived(tenderId: string): boolean {
	return tendersStore.find((t) => t.id === tenderId)?.isArchived === true;
}

export function _resetTendersStore(): void {
	seedStore();
}

export function writeTenderAt(idx: number, tender: ProcurementInquiry): void {
	tendersStore[idx] = tender;
}

export function pushTender(tender: ProcurementInquiry): void {
	tendersStore = [tender, ...tendersStore];
}

export function removeTender(id: string): boolean {
	const before = tendersStore.length;
	tendersStore = tendersStore.filter((t) => t.id !== id);
	return tendersStore.length < before;
}

export function findTenderIndex(id: string): number {
	return tendersStore.findIndex((t) => t.id === id);
}

export function listSlugs(): string[] {
	return tendersStore.map((t) => t.id);
}
