import type { CreateSupplierInput } from "../domains/suppliers";
import { _getItem, _patchItem } from "../items-mock-data";
import type { Supplier, SupplierChatMessage } from "../supplier-types";
import { AGENT_EMAIL, filesToAttachments } from "../supplier-types";
import { inferCompanyType, synthesizeSupplierIdentity } from "./enrichment";
import {
	appendInquirySupplier,
	getSendShouldFail,
	getSuppliersForInquiry,
	getSuppliersForItem,
	simulateDelay,
	writeSuppliersForInquiry,
	writeSuppliersForItem,
} from "./store";

/** User-supplied identity only (INN + company name + website + email). Profile
 * fields the user didn't enter (region, founding year, revenue, …) stay empty
 * so the UI renders «—» rather than a fabricated number — the real backend
 * doesn't know them either until enrichment runs server-side. */
export async function createInquirySupplier(input: CreateSupplierInput): Promise<Supplier> {
	await simulateDelay();
	const existing = getSuppliersForInquiry(input.procurementInquiryId);
	const seq = existing.length + 1;
	const id = `user-supplier-${input.procurementInquiryId}-${seq}`;
	const synthesized = input.inn ? synthesizeSupplierIdentity(input.inn) : null;
	const companyName = input.companyName || synthesized?.companyName || "Без названия";
	const supplier: Supplier = {
		id,
		procurementInquiryId: input.procurementInquiryId,
		companyName,
		status: "new",
		archived: false,
		inn: input.inn,
		companyType: inferCompanyType(companyName),
		region: "",
		foundedYear: 0,
		revenue: 0,
		employeeCount: 0,
		postalCode: "",
		email: input.email || synthesized?.email || "",
		website: input.website || synthesized?.website || "",
		address: synthesized?.address ?? "",
		pricePerUnit: null,
		tco: null,
		deliveryCost: null,
		paymentType: "prepayment",
		deferralDays: 0,
		leadTimeDays: null,
		agentComment: "",
		documents: [],
		chatHistory: [],
	};
	return appendInquirySupplier(input.procurementInquiryId, supplier);
}

export async function archiveInquirySuppliers(procurementInquiryId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForInquiry(procurementInquiryId);
	const ids = new Set(supplierIds);
	writeSuppliersForInquiry(
		procurementInquiryId,
		suppliers.map((s) => (ids.has(s.id) ? { ...s, archived: true } : s)),
	);
}

export async function unarchiveInquirySuppliers(procurementInquiryId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForInquiry(procurementInquiryId);
	const ids = new Set(supplierIds);
	writeSuppliersForInquiry(
		procurementInquiryId,
		suppliers.map((s) => (ids.has(s.id) ? { ...s, archived: false } : s)),
	);
}

export async function deleteSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const idsToDelete = new Set(supplierIds);
	const remaining = suppliers.filter((s) => !idsToDelete.has(s.id));
	writeSuppliersForItem(itemId, remaining);
}

export async function archiveSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const idsToArchive = new Set(supplierIds);
	writeSuppliersForItem(
		itemId,
		suppliers.map((s) => (idsToArchive.has(s.id) ? { ...s, archived: true } : s)),
	);
}

export async function unarchiveSuppliers(itemId: string, supplierIds: string[]): Promise<void> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const ids = new Set(supplierIds);
	writeSuppliersForItem(
		itemId,
		suppliers.map((s) => (ids.has(s.id) ? { ...s, archived: false } : s)),
	);
}

/** Transitions eligible (status="new") suppliers to "quote_requested".
 * Returns ids actually transitioned (already-requested ones are skipped).
 * When the item was in a completed-search state, the first request burst flips it to negotiating. */
export async function sendSupplierRequest(itemId: string, supplierIds: string[]): Promise<string[]> {
	await simulateDelay();
	const suppliers = getSuppliersForItem(itemId);
	const ids = new Set(supplierIds);
	const transitioned: string[] = [];
	const next = suppliers.map((s) => {
		if (!ids.has(s.id) || s.status !== "new") return s;
		transitioned.push(s.id);
		return { ...s, status: "quote_requested" as const };
	});
	writeSuppliersForItem(itemId, next);

	if (transitioned.length > 0) {
		const item = _getItem(itemId);
		if (item && item.status === "searching" && item.searchCompleted) {
			_patchItem(itemId, { status: "negotiating", searchCompleted: false });
		}
	}

	return transitioned;
}

export async function sendSupplierMessage(
	itemId: string,
	supplierId: string,
	body: string,
	files?: File[],
): Promise<SupplierChatMessage> {
	await simulateDelay();
	if (getSendShouldFail()) throw new Error("Не удалось отправить сообщение");
	const suppliers = getSuppliersForItem(itemId);
	const supplier = suppliers.find((s) => s.id === supplierId);
	if (!supplier) throw new Error("Supplier not found");

	const attachments = files && files.length > 0 ? filesToAttachments(files) : undefined;

	const message: SupplierChatMessage = {
		sender: "Агент",
		senderEmail: AGENT_EMAIL,
		timestamp: new Date().toISOString(),
		body,
		isOurs: true,
		attachments,
	};
	supplier.chatHistory.push(message);
	return message;
}
