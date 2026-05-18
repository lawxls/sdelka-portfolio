import {
	type CreateProcurementInquiryInput,
	type CursorPage,
	FOLDER_FILTER_ALL,
	FOLDER_FILTER_ARCHIVE,
	FOLDER_FILTER_NONE,
	type ListProcurementInquiriesParams,
	type ProcurementInquiry,
	type ProcurementInquirySortField,
} from "../domains/procurement-inquiries";
import { NotFoundError } from "../errors";
import { delay, nextId, paginate } from "../mock-utils";
import type { ProcurementInquiriesClient } from "./procurement-inquiries-client";

/** Minimal fields a test fixture must provide; everything else is filled with
 * sensible defaults so tests don't have to spell out every backend column. */
export type ProcurementInquirySeed = Partial<ProcurementInquiry> & { id: string; companyId: string };

export interface InMemoryProcurementInquiriesOptions {
	/** Initial inquiries. The closure clones each entry so callers can safely
	 * reuse fixture arrays across tests. */
	seed?: ProcurementInquirySeed[];
}

const FALLBACK_DATE = "2026-01-01T00:00:00+03:00";

function fillDefaults(partial: Partial<ProcurementInquiry> & { id: string; companyId: string }): ProcurementInquiry {
	const base: ProcurementInquiry = {
		id: partial.id,
		name: partial.name ?? "",
		companyId: partial.companyId,
		folderId: partial.folderId ?? null,
		copySuppliersFromInquiryId: partial.copySuppliersFromInquiryId ?? null,
		status: partial.status ?? "searching",
		deadline: partial.deadline ?? null,
		additionalInfo: partial.additionalInfo ?? "",
		deliveryAddressId: partial.deliveryAddressId ?? null,
		unloading: partial.unloading ?? "",
		analoguesNotAllowed: partial.analoguesNotAllowed ?? false,
		cashAllowed: partial.cashAllowed ?? false,
		emailSubject: partial.emailSubject ?? "",
		emailBody: partial.emailBody ?? "",
		sendRequestsAutomatically: partial.sendRequestsAutomatically ?? false,
		isArchived: partial.isArchived ?? false,
		kpCount: partial.kpCount ?? 0,
		positionsCount: partial.positionsCount ?? 0,
		tasksCount: partial.tasksCount ?? 0,
		suppliersCount: partial.suppliersCount ?? 0,
		createdAt: partial.createdAt ?? FALLBACK_DATE,
		updatedAt: partial.updatedAt ?? partial.createdAt ?? FALLBACK_DATE,
	};
	if (partial.items !== undefined) base.items = partial.items;
	return base;
}

function clone(t: ProcurementInquiry): ProcurementInquiry {
	return { ...t };
}

/** Strip the nested `items` field — mirrors backend behavior where only the
 * retrieve action serializes items, while list/archive/update omit them. */
function withoutItems(t: ProcurementInquiry): ProcurementInquiry {
	if (t.items === undefined) return t;
	const { items: _items, ...rest } = t;
	return rest;
}

function matchesFolder(inquiry: ProcurementInquiry, folder: string | undefined): boolean {
	if (folder === FOLDER_FILTER_ARCHIVE) return inquiry.isArchived;
	if (inquiry.isArchived) return false;
	if (folder === undefined || folder === FOLDER_FILTER_ALL) return true;
	if (folder === FOLDER_FILTER_NONE) return inquiry.folderId === null;
	return inquiry.folderId === folder;
}

function matchesDeadline(
	inquiry: ProcurementInquiry,
	filter: ListProcurementInquiriesParams["deadline"],
	now: Date,
): boolean {
	if (!filter || filter === "all") return true;
	if (!inquiry.deadline) return false;
	const deadline = new Date(inquiry.deadline);
	if (Number.isNaN(deadline.getTime())) return false;
	if (filter === "overdue") return deadline.getTime() < now.getTime();
	const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
	const diff = deadline.getTime() - now.getTime();
	return diff >= 0 && diff <= sevenDaysMs;
}

function inIsoRange(value: string | null, from?: string, to?: string): boolean {
	if (!from && !to) return true;
	if (!value) return false;
	const head = value.slice(0, 10);
	if (from && head < from) return false;
	if (to && head > to) return false;
	return true;
}

function applyFilters(
	inquiries: ProcurementInquiry[],
	params: ListProcurementInquiriesParams,
	now: Date,
): ProcurementInquiry[] {
	const q = params.q?.trim().toLowerCase();
	return inquiries.filter((t) => {
		if (!matchesFolder(t, params.folder)) return false;
		if (params.company && t.companyId !== params.company) return false;
		if (q && !t.name.toLowerCase().includes(q)) return false;
		if (!matchesDeadline(t, params.deadline, now)) return false;
		if (!inIsoRange(t.deadline, params.deadlineFrom, params.deadlineTo)) return false;
		if (!inIsoRange(t.createdAt, params.createdAtFrom, params.createdAtTo)) return false;
		if (params.status && t.status !== params.status) return false;
		return true;
	});
}

function compareByField(a: ProcurementInquiry, b: ProcurementInquiry, field: ProcurementInquirySortField): number {
	switch (field) {
		case "suppliersCount":
			return a.suppliersCount - b.suppliersCount;
		case "kpCount":
			return a.kpCount - b.kpCount;
		case "tasksCount":
			return a.tasksCount - b.tasksCount;
		case "createdAt":
			return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
		case "updatedAt":
			return a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0;
		case "deadline": {
			const av = a.deadline ?? "";
			const bv = b.deadline ?? "";
			return av < bv ? -1 : av > bv ? 1 : 0;
		}
	}
}

function sortInquiries(inquiries: ProcurementInquiry[], params: ListProcurementInquiriesParams): ProcurementInquiry[] {
	const sortField = params.sort;
	if (sortField) {
		const mul = params.dir === "asc" ? 1 : -1;
		return inquiries.sort((a, b) => compareByField(a, b, sortField) * mul);
	}
	// Default: createdAt desc with id tiebreak (mirrors backend `(-created_at, pk)`).
	return inquiries.sort((a, b) => {
		if (a.createdAt < b.createdAt) return 1;
		if (a.createdAt > b.createdAt) return -1;
		return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
	});
}

/**
 * Build an in-memory inquiries adapter that holds its own state in a closure.
 * Used by component, page, and contract tests so they can seed fixtures
 * deterministically without stubbing `fetch`. Production code path is HTTP —
 * this factory is intentionally not wired into `buildDataClients()`.
 */
export function createInMemoryProcurementInquiriesClient(
	options: InMemoryProcurementInquiriesOptions = {},
): ProcurementInquiriesClient {
	const store: ProcurementInquiry[] = (options.seed ?? []).map((t) => clone(fillDefaults(t)));

	function indexOf(id: string): number {
		return store.findIndex((t) => t.id === id);
	}

	async function setArchived(id: string, archived: boolean): Promise<ProcurementInquiry> {
		await delay();
		const idx = indexOf(id);
		if (idx === -1) throw new NotFoundError({ id });
		const now = new Date().toISOString();
		store[idx] = { ...store[idx], isArchived: archived, updatedAt: now };
		return withoutItems(clone(store[idx]));
	}

	return {
		async list(params: ListProcurementInquiriesParams): Promise<CursorPage<ProcurementInquiry>> {
			await delay();
			const filtered = sortInquiries(applyFilters(store, params, new Date()), params);
			const page = paginate({ items: filtered, cursor: params.cursor, limit: params.limit, getId: (t) => t.id });
			return { items: page.items.map((t) => withoutItems(clone(t))), nextCursor: page.nextCursor };
		},

		async get(id: string): Promise<ProcurementInquiry> {
			await delay();
			const idx = indexOf(id);
			if (idx === -1) throw new NotFoundError({ id });
			return clone(store[idx]);
		},

		async create(input: CreateProcurementInquiryInput): Promise<ProcurementInquiry> {
			await delay();
			const now = new Date().toISOString();
			// `items` on `CreateProcurementInquiryInput` is the write-only nested
			// create payload (shape: `CreateProcurementInquiryItemInput[]`); the
			// in-memory adapter doesn't simulate the items table, so it's dropped
			// from the stored row to match the backend's write-only behavior.
			const { items: _items, ...rest } = input;
			const inquiry = fillDefaults({
				...rest,
				id: nextId("inquiry"),
				createdAt: now,
				updatedAt: now,
			});
			store.unshift(inquiry);
			return clone(inquiry);
		},

		async update(id: string, patch: Partial<ProcurementInquiry>): Promise<ProcurementInquiry> {
			await delay();
			const idx = indexOf(id);
			if (idx === -1) throw new NotFoundError({ id });
			const now = new Date().toISOString();
			store[idx] = { ...store[idx], ...patch, id: store[idx].id, updatedAt: now };
			return withoutItems(clone(store[idx]));
		},

		archive: (id) => setArchived(id, true),
		unarchive: (id) => setArchived(id, false),

		async delete(id: string): Promise<void> {
			await delay();
			const idx = indexOf(id);
			if (idx === -1) throw new NotFoundError({ id });
			store.splice(idx, 1);
		},
	};
}
