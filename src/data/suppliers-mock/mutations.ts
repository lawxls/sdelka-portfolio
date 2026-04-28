import { _getItem, _patchItem } from "../items-mock-data";
import type { SupplierChatMessage } from "../supplier-types";
import { AGENT_EMAIL, filesToAttachments } from "../supplier-types";
import { getSendShouldFail, getSuppliersForItem, simulateDelay, writeSuppliersForItem } from "./store";

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

/** Transitions eligible (status="new") suppliers to "кп_запрошено".
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
		return { ...s, status: "кп_запрошено" as const };
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
