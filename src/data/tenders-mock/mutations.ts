import { delay } from "../mock-utils";
import { generateTenderSlug } from "../tenders/generate-tender-slug";
import type { AttachedFile, CurrentSupplier, PaymentMethod, ProcurementInquiry, UnloadingType } from "../types";
import { findTenderIndex, listSlugs, pushTender, readTenders, removeTender, writeTenderAt } from "./store";

export type TenderSendMode = "auto" | "manual";

export interface TenderEmailDraft {
	subject: string;
	body: string;
}

export interface CreateTenderInput {
	name: string;
	companyId: string;
	folderId?: string | null;
	budget: number;
	deadline: string;
	createdAt?: string;
	currentSupplier?: CurrentSupplier;
	addressIds?: string[];
	unloading?: UnloadingType;
	paymentMethod?: PaymentMethod;
	deferralRequired?: boolean;
	sampleRequired?: boolean;
	analoguesAllowed?: boolean;
	additionalInfo?: string;
	attachedFiles?: AttachedFile[];
	email?: TenderEmailDraft;
	sendMode?: TenderSendMode;
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
		...(input.currentSupplier && { currentSupplier: input.currentSupplier }),
		...(input.addressIds && { addressIds: input.addressIds }),
		...(input.unloading && { unloading: input.unloading }),
		...(input.paymentMethod && { paymentMethod: input.paymentMethod }),
		...(input.deferralRequired !== undefined && { deferralRequired: input.deferralRequired }),
		...(input.sampleRequired !== undefined && { sampleRequired: input.sampleRequired }),
		...(input.analoguesAllowed !== undefined && { analoguesAllowed: input.analoguesAllowed }),
		...(input.additionalInfo && { additionalInfo: input.additionalInfo }),
		...(input.attachedFiles && { attachedFiles: input.attachedFiles }),
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
