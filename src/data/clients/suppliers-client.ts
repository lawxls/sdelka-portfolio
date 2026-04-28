import type {
	Supplier,
	SupplierChatMessage,
	SupplierFilterParams,
	SupplierQuote,
	SuppliersList,
	SuppliersPage,
} from "../domains/suppliers";

/**
 * Public seam for the suppliers domain. Implementations are in-memory (mock store)
 * or HTTP. Hooks pull this through context, so swapping adapters is a one-line
 * change in the composition root.
 *
 * The suppliers client speaks only about its own entity: cross-entity rules
 * (e.g. "selecting a supplier writes the procurement item's currentSupplier")
 * live in `src/data/operations/procurement-operations.ts`.
 */
export interface SuppliersClient {
	/** Paginated list for one item. Default sort puts получено_кп first then ranks by TCO. */
	list(itemId: string, params?: SupplierFilterParams): Promise<SuppliersPage>;
	/** All suppliers for one item (no filter / pagination). */
	listForItem(itemId: string): Promise<SuppliersList>;
	/** Flat list across all items (excludes archived). Drives the global supplier search. */
	listAll(): Promise<Supplier[]>;
	get(itemId: string, supplierId: string): Promise<Supplier | null>;
	getById(supplierId: string): Promise<Supplier | null>;
	/** Cross-item received-КП offers for the matching INN, sorted with `contextItemId` first. */
	quotesByInn(inn: string, contextItemId: string): Promise<SupplierQuote[]>;

	archive(itemId: string, supplierIds: string[]): Promise<void>;
	unarchive(itemId: string, supplierIds: string[]): Promise<void>;
	delete(itemId: string, supplierIds: string[]): Promise<void>;

	/** Transition matching status="new" rows to "кп_запрошено". Returns the ids actually flipped. */
	sendRequest(itemId: string, supplierIds: string[]): Promise<string[]>;
	sendMessage(itemId: string, supplierId: string, body: string, files?: File[]): Promise<SupplierChatMessage>;
}
