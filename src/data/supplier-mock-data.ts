/**
 * Supplier mock data — barrel re-exporting the decomposed sub-modules. The
 * actual store, queries, mutations, and enrichment live in `suppliers-mock/`
 * and the Ormatek seed roster in `seeds/suppliers-ormatek.ts`. This file
 * preserves the import surface the in-memory adapter, items-mock-data, and
 * the legacy mock-store test rely on.
 */

export {
	archiveSuppliers,
	deleteSuppliers,
	sendSupplierMessage,
	sendSupplierRequest,
	unarchiveSuppliers,
} from "./suppliers-mock/mutations";
export {
	fetchAllSuppliersMock,
	getAllSuppliers,
	getSupplier,
	getSupplierById,
	getSupplierQuotesByInn,
	getSuppliers,
} from "./suppliers-mock/queries";
export {
	_addYourSupplier,
	_resetSupplierStore,
	_setSendShouldFail,
	_setSupplierMockDelay,
	_setSuppliersForItem,
} from "./suppliers-mock/store";
