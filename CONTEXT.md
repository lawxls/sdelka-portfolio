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
- **Invitation** — an outstanding invite to join the workspace.
- **Notification** — a notification surfaced in the bell icon dropdown.
- **Email** — an SMTP/IMAP account configured in workspace settings.
- **Profile** — current user identity and preferences (covers `useMe`).
- **WorkspaceEmployee** — a person enumerated across the entire workspace,
  with their company memberships. Distinct from `Employee` on a single
  company.
- **CompanyInfo** — the active workspace's company-level metadata (name,
  branding, plan). Distinct from `Company` (an arbitrary org record).

## Architectural primitives

- **DataClient** — public seam for one domain entity (one client per domain).
  Lives behind a small interface (`CompaniesClient`, etc.) so callers can swap
  implementations without changing the call site. Entry point for hooks.
- **In-memory adapter** — implements a `DataClient` against a mock store.
  Used in tests, demos, offline development. Factories:
  `createInMemoryCompaniesClient(seed)`, `createInMemoryItemsClient({ seed })`.
  Companies' adapter is closure-isolated. Items' adapter wraps the
  module-level `items-mock-data` singleton so cross-entity callers
  (`supplier-mock-data`, `folders-mock-data`) see the same store the hook sees;
  passing `seed` to the factory resets the singleton without reaching into
  `_setItems` directly. The singleton wrapping disappears for items when
  cross-entity rules move to the procurement-operations module.
- **HTTP adapter** — implements a `DataClient` against the `httpClient`
  utility. Selected per-entity at boot via env vars. Factories:
  `createHttpCompaniesClient(http?)`, `createHttpItemsClient(http?)`.
- **httpClient** — the shared HTTP utility. Attaches the bearer token, parses
  JSON, maps status codes to typed errors. No retries (React Query handles
  that). Single instance per app build.
- **Typed error hierarchy** — `HttpError` is the base; subclasses
  `NetworkError`, `AuthError`, `NotFoundError`, `ConflictError`,
  `ValidationError` (with `fieldErrors`). Both adapters throw these types so
  hook tests can branch on error class without caring about the adapter.
- **DataClientsProvider** — React context that holds the `DataClients` map.
  `useCompaniesClient()`, `useItemsClient()` (and future friends) read from
  it. Missing client throws `"<name> client not provided"`.
- **Composition root** — `buildDataClients()` instantiates every migrated
  entity's client based on `VITE_DATA_<ENTITY>` env vars. Default is
  `memory`. Tests pass their own client map directly to the provider.
- **CursorPage<T>** — shared list shape `{ items, nextCursor }` for cursor-
  paginated endpoints. Domains with materially different list shapes (board
  columns, flat tree) return their own typed responses.
- **Procurement operation** — the seam for cross-entity rules (e.g. "selecting
  a supplier updates the item's current supplier"). Lives in
  `procurement-operations` once created; not yet in tree.
- **Optimistic-update orchestrator** — multi-key snapshot/apply/rollback
  helper with shape adapters for `infinitePages`, `boardColumns`, `flatList`,
  `detail`. Not yet in tree.

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
  `src/data/clients/items-contract.test.ts`.
- **Layer C — `httpClient` unit tests.** Verb construction, URL/header
  building, JSON parsing, status-code-to-error mapping. File:
  `src/data/http-client.test.ts`.

A hook test must not assert on URL construction. A contract test must not
render React. An httpClient test must not import a domain.
