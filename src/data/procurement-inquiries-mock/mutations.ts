import { delay } from "../mock-utils";
import { generateProcurementInquirySlug } from "../procurement-inquiries/generate-procurement-inquiry-slug";
import type {
	AttachedFile,
	CurrentSupplier,
	PaymentMethod,
	ProcurementInquiry,
	ProcurementInquiryEmailDraft,
	ProcurementInquirySendMode,
	UnloadingType,
} from "../types";
import {
	findProcurementInquiryIndex,
	listSlugs,
	pushProcurementInquiry,
	readProcurementInquiries,
	removeProcurementInquiry,
	writeProcurementInquiryAt,
} from "./store";

export interface CreateProcurementInquiryInput {
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
	email?: ProcurementInquiryEmailDraft;
	sendMode?: ProcurementInquirySendMode;
}

export async function createProcurementInquiryMock(input: CreateProcurementInquiryInput): Promise<ProcurementInquiry> {
	await delay();
	const procurementInquiry: ProcurementInquiry = {
		id: generateProcurementInquirySlug(listSlugs()),
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
		...(input.email && { email: input.email }),
		...(input.sendMode && { sendMode: input.sendMode }),
	};
	pushProcurementInquiry(procurementInquiry);
	return { ...procurementInquiry };
}

export async function updateProcurementInquiryMock(
	id: string,
	patch: Partial<ProcurementInquiry>,
): Promise<ProcurementInquiry> {
	await delay();
	const idx = findProcurementInquiryIndex(id);
	if (idx === -1) throw new Error(`ProcurementInquiry ${id} not found`);
	const current = readProcurementInquiries()[idx];
	const updated: ProcurementInquiry = { ...current, ...patch, id: current.id };
	writeProcurementInquiryAt(idx, updated);
	return { ...updated };
}

export async function deleteProcurementInquiryMock(id: string): Promise<void> {
	await delay();
	const ok = removeProcurementInquiry(id);
	if (!ok) throw new Error(`ProcurementInquiry ${id} not found`);
}
