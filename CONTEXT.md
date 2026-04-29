# CONTEXT — domain glossary

Seed glossary for architecture work and AI navigation. Add a term here the
moment a name in the codebase needs explaining beyond its identifier; remove
it when the codebase makes it self-evident.

## Domain entities

- **Company** — a customer-side organization (the buyer's own company or one
  of its subsidiaries). Aggregate root: owns `Address`es and `Employee`s.
- **Address** — a physical location on a `Company`. Sub-resource of company.
- **Employee** — a person inside a `Company`. Sub-resource of company. Has
  `permissions` (per-module access levels).
- **CompanySummary** — projection of `Company` for list views (no employees,
  no description, addresses reduced to `AddressSummary`).
- **ProcurementItem** — a thing being procured. Lives under a Company,
  optionally inside a Folder. Has a current supplier and a list of candidate
  suppliers.
- **Supplier** — a vendor candidate evaluated for a procurement item. Lives
  under a single item, not globally — per-item store.
- **SearchSupplier** — a catalog row ("we found this company"); becomes a
  `Supplier` when promoted via the Поиск tab.
- **Task** — work assigned to a teammate, scoped to a procurement item.
- **Folder** — a category that groups procurement items. Flat list (parent
  ids), not a tree.
- **Notification** — a notification surfaced in the bell icon dropdown.
- **Email** — an SMTP/IMAP account configured in workspace settings.
- **Profile** — current user identity and preferences. Single-row domain
  (one record per active session) — backs `useMe`, `useSettings`,
  `useUpdateSettings`, and `useChangePassword`. Distinct from `WorkspaceEmployee`
  (a person enumerated across the workspace) and from `Employee` (a person
  inside one company).
- **WorkspaceEmployee** — a person enumerated across the entire workspace,
  with their company memberships (modelled via `companies: CompanySummary[]`,
  since they may belong to several). Distinct from `Employee` on a single
  company. Owns invitation lifecycle: a row with `registeredAt: null` is a
  pending invite. Backs `useWorkspaceEmployees`,
  `useWorkspaceEmployeeDetail`, `useInviteEmployees`,
  `useDeleteWorkspaceEmployees`, `useUpdateWorkspaceEmployee`, and
  `useUpdateWorkspaceEmployeePermissions`. Distinct from
  `CompaniesClient.{create,update,delete}Employee`, which scope to one
  company aggregate.
- **CompanyInfo** — the active workspace's company-level metadata (name,
  branding, plan). Distinct from `Company` (an arbitrary org record): the
  companies client (`CompaniesClient`) lists/edits *Company aggregates* — any
  number of customer-side organizations, with employees and addresses;
  `CompanyInfoClient` is read-only over a single workspace-scoped record
  (the current tenant's identity). Backs `useCompanyInfo` only. Surface is a
  single `get()` returning `{ name }` today; branding/plan fields are a
  forward extension on the same client.
- **Invitation** — an outstanding invite to join the workspace. Two halves:
  *creation* (an admin invites a new employee) lives on
  `WorkspaceEmployeesClient.invite()` — a row with `registeredAt: null` is a
  pending invitation in the workspace-employees list. *Acceptance* (a recipient
  registers with the code) lives on the auth adapter (out of scope per PRD).
  The seam in between — looking up an invitation by code to confirm it's
  still valid before showing the registration form — is `InvitationsClient`.
  Backs `useVerifyInvitationCode`.

## Architectural primitives

- **DataClient** — public seam for one domain entity (one client per domain).
  Lives behind a small interface (`CompaniesClient`, etc.) so callers can swap
  implementations without changing the call site. Entry point for hooks.
- **In-memory adapter** — implements a `DataClient` against a mock store.
  Used in tests, demos, offline development. Factories:
  `createInMemoryCompaniesClient(seed)`, `createInMemoryItemsClient({ seed })`,
  `createInMemorySuppliersClient({ seedByItemId })`,
  `createInMemoryTasksClient({ seed })`,
  `createInMemoryFoldersClient({ seed })`,
  `createInMemoryNotificationsClient({ seed, readIds })`,
  `createInMemoryEmailsClient(seed)`,
  `createInMemoryProfileClient({ me, settings })`,
  `createInMemoryWorkspaceEmployeesClient({ seed })`,
  `createInMemoryInvitationsClient({ isValid })`,
  `createInMemoryCompanyInfoClient({ info })`. Companies', emails',
  invitations', profile's, company-info's, and workspace-employees' adapters
  are closure-isolated — every call to the factory produces an independent
  store with its own seed. Items', suppliers', tasks', folders', and
  notifications' adapters wrap the module-level singletons
  (`items-mock-data`, `supplier-mock-data`, `tasks-mock-data`,
  `folders-mock-data`, `notifications-mock-data`) so cross-entity callers see
  the same store the hook sees — folders' delete reaches into items via
  `_unassignItemsFromFolder`, and stats pulls counts from the items
  singleton. Workspace-employees still reaches into `companies-mock-data`
  via `_getCompanySummariesByIds` at invite time so an invitee's `companies`
  array stays coherent with the companies adapter; lifting it would require
  a `getSummaries` port. Passing seed options to the factory resets the
  store without reaching into underscore helpers directly. Remaining
  singleton wrapping disappears once cross-entity rules move to the
  procurement-operations module (#251). The tasks singleton's internals are
  decomposed into `tasks-mock/store.ts` (mutable array + clone +
  reset/set/get helpers + index lookup), `tasks-mock/queries.ts` (board /
  list / detail with filter+sort+paginate helpers), and
  `tasks-mock/mutations.ts` (status change + attachment upload/delete);
  `tasks-mock-data.ts` is now a barrel re-exporting the public surface, and
  the seed roster lives at `seeds/tasks.ts` (mirrors `seeds/items.ts` /
  `seeds/companies.ts` / `seeds/emails.ts` / `seeds/workspace-employees.ts`).
  The suppliers singleton's internals follow the same layout:
  `suppliers-mock/enrichment.ts` (REGIONS / region meta / hash / INN +
  postal + address + identity profile + quote-anchor timestamps + chat
  history + the candidate-pool builder + `generateCandidates`),
  `suppliers-mock/store.ts` (mutable per-item map + lazy
  `getSuppliersForItem` + `makeYourSupplier` + `_addYourSupplier` +
  `_resetSupplierStore` + `_setSuppliersForItem` + `_setSendShouldFail` +
  `_setSupplierMockDelay` + `simulateDelay`),
  `suppliers-mock/queries.ts` (filter + sort + the five fetch fns plus
  `getSupplierQuotesByInn`), and `suppliers-mock/mutations.ts`
  (delete / archive / unarchive / `sendSupplierRequest` /
  `sendSupplierMessage`); `supplier-mock-data.ts` is now a barrel
  re-exporting the public surface and the Ormatek seed roster (the
  hand-authored 7000-line dataset for item-1) lives at
  `seeds/suppliers-ormatek.ts` (joins the other `seeds/` files).
- **HTTP adapter** — implements a `DataClient` against the `httpClient`
  utility. Selected per-entity at boot via env vars. Factories:
  `createHttpCompaniesClient(http?)`, `createHttpItemsClient(http?)`,
  `createHttpSuppliersClient(http?)`, `createHttpTasksClient(http?)`,
  `createHttpFoldersClient(http?)`, `createHttpNotificationsClient(http?)`,
  `createHttpEmailsClient(http?)`, `createHttpProfileClient(http?)`,
  `createHttpWorkspaceEmployeesClient(http?)`,
  `createHttpInvitationsClient(http?)`,
  `createHttpCompanyInfoClient(http?)`.
- **httpClient** — the shared HTTP utility. Attaches the bearer token, parses
  JSON, maps status codes to typed errors. No retries (React Query handles
  that). Single instance per app build.
- **Typed error hierarchy** — `HttpError` is the base; subclasses
  `NetworkError`, `AuthError`, `NotFoundError`, `ConflictError`,
  `ValidationError` (with `fieldErrors`). Both adapters throw these types so
  hook tests can branch on error class without caring about the adapter.
- **DataClientsProvider** — React context that holds the `DataClients` map.
  `useCompaniesClient()`, `useItemsClient()`, `useSuppliersClient()`,
  `useTasksClient()`, `useFoldersClient()`, `useNotificationsClient()`,
  `useEmailsClient()`, `useProfileClient()`,
  `useWorkspaceEmployeesClient()`, `useInvitationsClient()`,
  `useCompanyInfoClient()` (and future friends) read from it. Missing
  client throws `"<name> client not provided"`.
- **Composition root** — `buildDataClients()` instantiates every migrated
  entity's client based on `VITE_DATA_<ENTITY>` env vars. Default is
  `memory`. Tests pass their own client map directly to the provider.
- **CursorPage<T>** — shared list shape `{ items, nextCursor }` for cursor-
  paginated endpoints. Domains with materially different list shapes return
  their own typed responses — e.g. tasks' `TaskBoardResponse` is a status-
  keyed object (one column per status) and tasks' `TaskListResponse` is a
  page-based shape (`{ count, results, next, previous }`); folders' list
  is a flat `Folder[]` and folders' `FolderStatsResponse` is a flat
  snapshot keyed by folder id with an `archiveCount`; notifications'
  `NotificationsResponse` is a flat snapshot plus a per-user read-id set;
  emails' list is a flat `WorkspaceEmail[]` since the workspace inbox
  roster is a small bounded list; workspace-employees' list is a flat
  `WorkspaceEmployee[]` (similarly small and bounded); profile is a
  single-row domain (no list shape at all — `me`, `settings`, `update`,
  `changePassword`); invitations is also a no-list domain — only
  `verify(code)` returning `{ valid: boolean }`; company-info is the
  third no-list domain — only `get()` returning the active workspace's
  identity record `{ name }`.
- **Query-keys factory** — `keys` exported from `src/data/query-keys.ts`. The
  single source of truth for every cache namespace the app reads or writes.
  Hooks construct keys via these factories; no inline string arrays remain in
  migrated hook files. Currently covers companies, items, and folder stats
  (added incrementally as domains migrate).
- **Invalidation policy** — a named function in
  `src/data/invalidation-policies.ts` that knows the *full* set of cache keys
  affected by one mutation event (e.g.
  `invalidateAfterItemListChange(qc)` — items list namespace + listAll +
  totals + folder stats). Mutations call policies by name; they never list
  keys directly. Cross-domain effects live here, not at the call site.
- **Procurement operation** — the seam for cross-entity domain rules. Lives in
  `src/data/operations/procurement-operations.ts` (operations) and
  `src/data/operations/use-procurement-operations.ts` (hooks). Inhabitants
  today: `selectSupplierForItem(itemId, supplierId, { items, suppliers })` —
  reads the supplier and writes the item's `currentSupplier`; and
  `setCurrentSupplierFromQuote(itemId, inn, { items, suppliers })` — finds
  the matching-INN supplier in the per-item list, writes the item's
  `currentSupplier` (with INN + prepayment %), and snaps `currentPrice` to
  the supplier's TCO. Hooks `useSelectSupplierForItem` and
  `useSetCurrentSupplierFromQuote` resolve `ItemsClient` + `SuppliersClient`
  from context and invoke the operation; the suppliers client itself
  exposes no cross-entity methods. When the real backend ships, this
  module is the one place that decides "one server call or two"; today
  both operations issue two (read supplier, then write item).
  Out-of-scope cross-entity rules still living in mocks:
  `sendSupplierRequest`'s "first-burst flips item from
  searching+searchCompleted to negotiating" item-status side effect (a
  server-driven status transition once the backend models the RFQ
  lifecycle); and `_addYourSupplier` at item creation time (a fixture
  that seeds a placeholder «Ваш поставщик» row, materialized server-side
  on item creation when the backend ships). Both stay on the suppliers
  in-memory adapter for now and migrate when their hooks need them.
- **Optimistic-update orchestrator** — `applyOptimistic` / `rollbackOptimistic`
  / `applyToCache` in `src/data/optimistic.ts`. Accepts a set of targets
  (`{ queryKey, prefix?, update }`), snapshots all atomically, applies
  shape-aware updaters, and rolls all back on failure. Prefix mode walks
  every cache matching a key prefix in one pass — the canonical case is
  the items list namespace with a dozen filter/sort variants in cache.
  Shape adapters in `src/data/shape-adapters.ts` (`detail`, `flatList`,
  `flatListIn`, `infinitePages`, `boardColumns`) expose intent-level verbs
  (`patchById`, `removeById`, `patchOrRemoveById`, `moveBetween`) so call
  sites stop writing page traversal / column lookup / array index math.
  Bespoke cache shapes pass a hand-rolled `Updater<T>` directly — adapters
  are convenience, not a wall. Items mutations and `useUpdateCompany`
  migrated as proof; other domains adopt as they migrate.

## Test layers

The data layer has three distinct test layers; tests live in exactly one.

- **Layer A — hook tests via fake clients.** Render a hook with a fake
  client injected through `TestClientsProvider`. Assert on hook output
  (loading flags, derived state, optimistic updates, error class branching).
  Files like `use-companies.test.tsx`.
- **Layer B — adapter contract tests.** Same suite runs against the
  in-memory adapter and the HTTP adapter (with `fetch` stubbed). Asserts
  identical observable behavior. Files:
  `src/data/clients/companies-contract.test.ts`,
  `src/data/clients/items-contract.test.ts`,
  `src/data/clients/suppliers-contract.test.ts`,
  `src/data/clients/tasks-contract.test.ts`,
  `src/data/clients/folders-contract.test.ts`,
  `src/data/clients/notifications-contract.test.ts`,
  `src/data/clients/emails-contract.test.ts`,
  `src/data/clients/profile-contract.test.ts`,
  `src/data/clients/workspace-employees-contract.test.ts`,
  `src/data/clients/invitations-contract.test.ts`,
  `src/data/clients/company-info-contract.test.ts`.
- **Layer C — `httpClient` unit tests.** Verb construction, URL/header
  building, JSON parsing, status-code-to-error mapping. File:
  `src/data/http-client.test.ts`.

A hook test must not assert on URL construction. A contract test must not
render React. An httpClient test must not import a domain.
