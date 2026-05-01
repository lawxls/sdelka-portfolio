/**
 * Tenders mock data — barrel re-exporting the public surface needed by the
 * in-memory adapter. The actual store, queries, and mutations live in
 * `tenders-mock/`. The seed roster lives at `seeds/tenders.ts`. Mirrors the
 * layout introduced for tasks in #252 and suppliers in #253.
 */

export { createTenderMock, deleteTenderMock, updateTenderMock } from "./tenders-mock/mutations";
export { fetchTenderMock, fetchTendersListMock } from "./tenders-mock/queries";
export { _setTenders } from "./tenders-mock/store";
