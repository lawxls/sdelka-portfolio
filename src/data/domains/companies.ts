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
	/** Archive view toggle, sent to the backend's `isArchived` filter. Absent or
	 * `false` ⇒ active companies; `true` ⇒ the archive view. */
	isArchived?: boolean;
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
	/** Display name. The drawer threads DaData's full_name here. */
	name: string;
	/** Short canonical name from DaData (`short_with_opf`). */
	shortName: string;
	/** Full canonical name from DaData (`full_with_opf`). */
	fullName: string;
	/** INN — required, 10 or 12 digits, unique per workspace. */
	inn: string;
	kpp: string;
	ogrn: string;
	directorName: string;
	/** Contact phone — pre-filled from DaData when present, user-editable. */
	phoneNumber?: string;
	/** Contact email — pre-filled from DaData when present, user-editable. */
	email?: string;
	website?: string;
	additionalComments?: string;
	addresses: CreateAddressData[];
}

export interface UpdateCompanyData {
	name?: string;
	fullName?: string;
	phoneNumber?: string;
	email?: string;
	website?: string;
	additionalComments?: string;
}

export interface UpdateAddressData {
	name?: string;
	address?: string;
	phone?: string;
	isMain?: boolean;
}

/** DaData-backed identity payload returned by `/companies/lookup-by-inn/`.
 * `existing` is set when the workspace already has a company with this INN —
 * the drawer turns that into a duplicate notice with a link to the existing
 * company instead of allowing creation. */
export interface CompanyLookup {
	inn: string;
	shortName: string;
	fullName: string;
	kpp: string;
	ogrn: string;
	directorName: string;
	/** DaData `data.phones[0].value` — empty string when not provided. */
	phoneNumber: string;
	/** DaData `data.emails[0].value` — empty string when not provided. */
	email: string;
	address: string;
	status: string;
	existing: { id: string; name: string } | null;
}
