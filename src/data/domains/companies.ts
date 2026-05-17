/**
 * Companies + addresses domain types — the single import surface for components
 * and clients. Employees + per-module permissions live in
 * `./employees.ts`; this seam covers company CRUD + address CRUD only.
 */
export type {
	Address,
	Company,
	CompanySortField,
	CompanySortState,
	CompanySummary,
} from "../types";

import type { CompanySortState } from "../types";

export type { CursorPage } from "./shared";

export interface ListCompaniesParams {
	q?: string;
	sort?: CompanySortState["field"];
	dir?: CompanySortState["direction"];
	cursor?: string;
	limit?: number;
}

export interface CreateAddressData {
	name: string;
	address: string;
	phone: string;
	isMain?: boolean;
}

export interface CreateCompanyPayload {
	name: string;
	website?: string;
	description?: string;
	additionalComments?: string;
	address: CreateAddressData;
}

export interface UpdateCompanyData {
	name?: string;
	website?: string;
	description?: string;
	additionalComments?: string;
}

export interface UpdateAddressData {
	name?: string;
	address?: string;
	phone?: string;
	isMain?: boolean;
}
