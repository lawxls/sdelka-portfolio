import type {
	CreateTenderInput,
	CursorPage,
	ListTendersParams,
	ProcurementInquiry,
	TenderSummary,
} from "../domains/tenders";
import { NotFoundError } from "../errors";
import {
	_setTenders,
	createTenderMock,
	deleteTenderMock,
	fetchTenderMock,
	fetchTendersListMock,
	updateTenderMock,
} from "../tenders-mock-data";
import type { TendersClient } from "./tenders-client";

export interface InMemoryTendersOptions {
	/** Replace the module-level mock store with these tenders at construction time.
	 * Used by tests to seed deterministically without reaching into `_setTenders`. */
	seed?: ProcurementInquiry[];
}

/**
 * Build an in-memory tenders adapter wrapping the module-level mock store
 * (`tenders-mock-data`). Singleton-wrapping (rather than closure-isolated)
 * because list-time joins read the items + suppliers singletons for
 * positionsCount / kpCount derivation. Closure isolation lands once the
 * cross-entity rules migrate via the procurement-operations module.
 */
export function createInMemoryTendersClient(options?: InMemoryTendersOptions): TendersClient {
	if (options?.seed !== undefined) {
		_setTenders(options.seed);
	}

	return {
		async list(params: ListTendersParams): Promise<CursorPage<TenderSummary>> {
			const result = await fetchTendersListMock(params);
			return { items: result.items, nextCursor: result.nextCursor };
		},

		async get(id: string): Promise<ProcurementInquiry> {
			const tender = await fetchTenderMock(id);
			if (!tender) throw new NotFoundError({ id });
			return tender;
		},

		async create(input: CreateTenderInput): Promise<ProcurementInquiry> {
			return createTenderMock(input);
		},

		async update(id: string, patch: Partial<ProcurementInquiry>): Promise<ProcurementInquiry> {
			try {
				return await updateTenderMock(id, patch);
			} catch (err) {
				if (err instanceof Error && err.message.includes("not found")) {
					throw new NotFoundError({ id });
				}
				throw err;
			}
		},

		async archive(id: string, isArchived: boolean): Promise<ProcurementInquiry> {
			try {
				return await updateTenderMock(id, { isArchived });
			} catch (err) {
				if (err instanceof Error && err.message.includes("not found")) {
					throw new NotFoundError({ id });
				}
				throw err;
			}
		},

		async delete(id: string): Promise<void> {
			try {
				await deleteTenderMock(id);
			} catch (err) {
				if (err instanceof Error && err.message.includes("not found")) {
					throw new NotFoundError({ id });
				}
				throw err;
			}
		},
	};
}
