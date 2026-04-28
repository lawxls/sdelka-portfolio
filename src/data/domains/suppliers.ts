/**
 * Suppliers domain types — the import surface used by suppliers clients and
 * contract tests. Behavior, fixtures, and helpers live elsewhere; this module
 * is types-only. Components still import the visual-config types directly from
 * `supplier-types` until they migrate behind the seam.
 */
export type {
	Supplier,
	SupplierChatMessage,
	SupplierFilterParams,
	SupplierQuote,
	SupplierSeed,
} from "../supplier-types";

import type { Supplier } from "../supplier-types";

export interface SuppliersPage {
	suppliers: Supplier[];
	nextCursor: string | null;
	total: number;
}

export interface SuppliersList {
	suppliers: Supplier[];
}
