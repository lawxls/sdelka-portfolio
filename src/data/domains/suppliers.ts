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

export interface SupplierIdentity {
	companyName: string;
	website: string;
	address: string;
	email: string;
}

/** Payload for `SuppliersClient.create` — inquiry-scoped candidate creation. */
export interface CreateSupplierInput {
	procurementInquiryId: string;
	/** INN — empty string when the user adds the supplier manually. */
	inn: string;
	companyName: string;
	website: string;
	email: string;
}
