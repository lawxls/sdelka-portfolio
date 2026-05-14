import { SEED_PROCUREMENT_INQUIRIES } from "../seeds/procurement-inquiries";
import type { ProcurementInquiry } from "../types";

let procurementInquiriesStore: ProcurementInquiry[] = [];

function cloneProcurementInquiry(t: ProcurementInquiry): ProcurementInquiry {
	return {
		...t,
		addressIds: t.addressIds ? [...t.addressIds] : undefined,
		attachedFiles: t.attachedFiles ? t.attachedFiles.map((a) => ({ ...a })) : undefined,
	};
}

function seedStore() {
	procurementInquiriesStore = SEED_PROCUREMENT_INQUIRIES.map(cloneProcurementInquiry);
}

seedStore();

export function _setProcurementInquiries(procurementInquiries: ProcurementInquiry[]): void {
	procurementInquiriesStore = procurementInquiries.map(cloneProcurementInquiry);
}

/** Read-side accessor for queries. Returns the live array reference; callers
 * must not mutate it. Mutations go through `writeProcurementInquiryAt`. */
export function readProcurementInquiries(): ProcurementInquiry[] {
	return procurementInquiriesStore;
}

/** Cross-entity lookup helper. Returns a defensive clone, or null when the slug
 * is unknown. Used by items-in-memory (filter join) and folders-mock-data (stats). */
export function _getProcurementInquiry(id: string): ProcurementInquiry | null {
	const procurementInquiry = procurementInquiriesStore.find((t) => t.id === id);
	return procurementInquiry ? cloneProcurementInquiry(procurementInquiry) : null;
}

/** Cross-entity helper: is the parent inquiry archived? Items-in-memory uses
 * this to cascade archive into the positions list — items belonging to an
 * archived inquiry disappear from non-archive views. */
export function _isProcurementInquiryArchived(procurementInquiryId: string): boolean {
	return procurementInquiriesStore.find((t) => t.id === procurementInquiryId)?.isArchived === true;
}

export function _resetProcurementInquiriesStore(): void {
	seedStore();
}

export function writeProcurementInquiryAt(idx: number, procurementInquiry: ProcurementInquiry): void {
	procurementInquiriesStore[idx] = procurementInquiry;
}

export function pushProcurementInquiry(procurementInquiry: ProcurementInquiry): void {
	procurementInquiriesStore = [procurementInquiry, ...procurementInquiriesStore];
}

export function removeProcurementInquiry(id: string): boolean {
	const before = procurementInquiriesStore.length;
	procurementInquiriesStore = procurementInquiriesStore.filter((t) => t.id !== id);
	return procurementInquiriesStore.length < before;
}

export function findProcurementInquiryIndex(id: string): number {
	return procurementInquiriesStore.findIndex((t) => t.id === id);
}

export function listSlugs(): string[] {
	return procurementInquiriesStore.map((t) => t.id);
}
