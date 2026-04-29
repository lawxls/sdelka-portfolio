import type {
	Supplier,
	SupplierChatMessage,
	SupplierFilterParams,
	SupplierQuote,
	SupplierSeed,
	SuppliersList,
	SuppliersPage,
} from "../domains/suppliers";
import {
	_resetSupplierStore,
	_setSuppliersForItem,
	archiveSuppliers,
	deleteSuppliers,
	fetchAllSuppliersMock,
	getAllSuppliers,
	getSupplier,
	getSupplierById,
	getSupplierQuotesByInn,
	getSuppliers,
	sendSupplierMessage,
	sendSupplierRequest,
	unarchiveSuppliers,
} from "../supplier-mock-data";
import type { SuppliersClient } from "./suppliers-client";

export interface InMemorySuppliersOptions {
	/** Per-item seeds. If provided, the singleton store is reset and re-seeded so a
	 * test lands deterministically without reaching into `_setSuppliersForItem`. */
	seedByItemId?: Record<string, readonly SupplierSeed[]>;
}

/**
 * Build an in-memory suppliers adapter wrapping the module-level mock store
 * (`supplier-mock-data`). All clients share that singleton, so cross-entity
 * callers (items-mock-data via `_addYourSupplier` at item creation time, plus
 * read-only enrichment from item rows) keep seeing the same state the hook
 * sees. The supplier-mock-side write rules into items (selectSupplier /
 * selectSupplierByInn) have moved to `src/data/operations/procurement-operations.ts`;
 * the remaining write that this adapter still triggers is the searching →
 * negotiating item-status flip on the first request burst (`sendSupplierRequest`),
 * documented as out-of-scope here in CONTEXT.md and likely a server-side rule
 * once the backend ships.
 */
export function createInMemorySuppliersClient(options?: InMemorySuppliersOptions): SuppliersClient {
	if (options?.seedByItemId) {
		_resetSupplierStore();
		for (const [itemId, seeds] of Object.entries(options.seedByItemId)) {
			_setSuppliersForItem(itemId, seeds);
		}
	}

	return {
		async list(itemId: string, params?: SupplierFilterParams): Promise<SuppliersPage> {
			return getSuppliers(itemId, params);
		},

		async listForItem(itemId: string): Promise<SuppliersList> {
			return getAllSuppliers(itemId);
		},

		async listAll(): Promise<Supplier[]> {
			return fetchAllSuppliersMock();
		},

		async get(itemId: string, supplierId: string): Promise<Supplier | null> {
			return getSupplier(itemId, supplierId);
		},

		async getById(supplierId: string): Promise<Supplier | null> {
			return getSupplierById(supplierId);
		},

		async quotesByInn(inn: string, contextItemId: string): Promise<SupplierQuote[]> {
			return getSupplierQuotesByInn(inn, contextItemId);
		},

		async archive(itemId: string, supplierIds: string[]): Promise<void> {
			return archiveSuppliers(itemId, supplierIds);
		},

		async unarchive(itemId: string, supplierIds: string[]): Promise<void> {
			return unarchiveSuppliers(itemId, supplierIds);
		},

		async delete(itemId: string, supplierIds: string[]): Promise<void> {
			return deleteSuppliers(itemId, supplierIds);
		},

		async sendRequest(itemId: string, supplierIds: string[]): Promise<string[]> {
			return sendSupplierRequest(itemId, supplierIds);
		},

		async sendMessage(itemId: string, supplierId: string, body: string, files?: File[]): Promise<SupplierChatMessage> {
			return sendSupplierMessage(itemId, supplierId, body, files);
		},
	};
}
