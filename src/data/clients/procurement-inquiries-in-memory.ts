import type {
	CreateProcurementInquiryInput,
	CursorPage,
	ListProcurementInquiriesParams,
	ProcurementInquiry,
	ProcurementInquirySummary,
} from "../domains/procurement-inquiries";
import { NotFoundError } from "../errors";
import {
	createProcurementInquiryMock,
	deleteProcurementInquiryMock,
	updateProcurementInquiryMock,
} from "../procurement-inquiries-mock/mutations";
import { fetchProcurementInquiriesListMock, fetchProcurementInquiryMock } from "../procurement-inquiries-mock/queries";
import { _setProcurementInquiries } from "../procurement-inquiries-mock/store";
import type { ProcurementInquiriesClient } from "./procurement-inquiries-client";

export interface InMemoryProcurementInquiriesOptions {
	/** Replace the module-level mock store with these inquiries at construction time.
	 * Used by tests to seed deterministically without reaching into `_setProcurementInquiries`. */
	seed?: ProcurementInquiry[];
}

/**
 * Build an in-memory inquiries adapter wrapping the module-level mock store
 * (`procurement-inquiries-mock/`). Singleton-wrapping (rather than closure-isolated)
 * because list-time joins read the items + suppliers singletons for
 * positionsCount / kpCount derivation. Closure isolation lands once the
 * cross-entity rules migrate via the procurement-operations module.
 */
export function createInMemoryProcurementInquiriesClient(
	options?: InMemoryProcurementInquiriesOptions,
): ProcurementInquiriesClient {
	if (options?.seed !== undefined) {
		_setProcurementInquiries(options.seed);
	}

	return {
		async list(params: ListProcurementInquiriesParams): Promise<CursorPage<ProcurementInquirySummary>> {
			const result = await fetchProcurementInquiriesListMock(params);
			return { items: result.items, nextCursor: result.nextCursor };
		},

		async get(id: string): Promise<ProcurementInquiry> {
			const procurementInquiry = await fetchProcurementInquiryMock(id);
			if (!procurementInquiry) throw new NotFoundError({ id });
			return procurementInquiry;
		},

		async create(input: CreateProcurementInquiryInput): Promise<ProcurementInquiry> {
			return createProcurementInquiryMock(input);
		},

		async update(id: string, patch: Partial<ProcurementInquiry>): Promise<ProcurementInquiry> {
			try {
				return await updateProcurementInquiryMock(id, patch);
			} catch (err) {
				if (err instanceof Error && err.message.includes("not found")) {
					throw new NotFoundError({ id });
				}
				throw err;
			}
		},

		async archive(id: string, isArchived: boolean): Promise<ProcurementInquiry> {
			try {
				return await updateProcurementInquiryMock(id, { isArchived });
			} catch (err) {
				if (err instanceof Error && err.message.includes("not found")) {
					throw new NotFoundError({ id });
				}
				throw err;
			}
		},

		async delete(id: string): Promise<void> {
			try {
				await deleteProcurementInquiryMock(id);
			} catch (err) {
				if (err instanceof Error && err.message.includes("not found")) {
					throw new NotFoundError({ id });
				}
				throw err;
			}
		},
	};
}
