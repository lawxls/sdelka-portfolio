import { delay } from "../mock-utils";
import { generateTenderSlug } from "../tenders/generate-tender-slug";
import type { ProcurementInquiry } from "../types";
import { findTenderIndex, listSlugs, pushTender, readTenders, removeTender, writeTenderAt } from "./store";

export interface CreateTenderInput {
	name: string;
	companyId: string;
	folderId?: string | null;
	budget: number;
	deadline: string;
	createdAt?: string;
}

export async function createTenderMock(input: CreateTenderInput): Promise<ProcurementInquiry> {
	await delay();
	const tender: ProcurementInquiry = {
		id: generateTenderSlug(listSlugs()),
		name: input.name,
		companyId: input.companyId,
		folderId: input.folderId ?? null,
		budget: input.budget,
		deadline: input.deadline,
		createdAt: input.createdAt ?? new Date().toISOString(),
	};
	pushTender(tender);
	return { ...tender };
}

export async function updateTenderMock(id: string, patch: Partial<ProcurementInquiry>): Promise<ProcurementInquiry> {
	await delay();
	const idx = findTenderIndex(id);
	if (idx === -1) throw new Error(`Tender ${id} not found`);
	const current = readTenders()[idx];
	const updated: ProcurementInquiry = { ...current, ...patch, id: current.id };
	writeTenderAt(idx, updated);
	return { ...updated };
}

export async function deleteTenderMock(id: string): Promise<void> {
	await delay();
	const ok = removeTender(id);
	if (!ok) throw new Error(`Tender ${id} not found`);
}
