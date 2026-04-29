import type { ListCompaniesParams } from "./domains/companies";
import type { ListItemsParams, TotalsParams } from "./domains/items";

/**
 * Per-domain query-key factory. The single source of truth for every cache
 * namespace this app reads or writes. Hooks construct keys via these factories;
 * mutations invalidate via the policy module (which builds keys via these
 * factories). No inline string arrays should remain in companies/items hooks.
 *
 * Each factory returns a tuple typed `as const` so React Query's structural
 * comparison picks up exact-match vs. prefix-match correctly:
 *   - `keys.items.all()` is `["items"]` — the prefix used to match every items
 *     list / search / cursor variant.
 *   - `keys.items.list(params)` is `["items", params]` — a specific list with
 *     filter/sort/cursor params; included under the `["items"]` prefix.
 *   - `keys.items.search(q)` is `["items", "search", q]` — also under the
 *     prefix; intentional — the items search bar is conceptually part of the
 *     items namespace and refetches when items mutate.
 */
export const keys = {
	companies: {
		all: () => ["companies"] as const,
		list: (params: ListCompaniesParams) => ["companies", params] as const,
		listAll: () => ["companies-global"] as const,
		procurement: () => ["procurementCompanies"] as const,
		detail: (id: string | null) => ["company", id] as const,
	},
	items: {
		all: () => ["items"] as const,
		list: (params: ListItemsParams) => ["items", params] as const,
		listAll: () => ["items-global"] as const,
		detail: (id: string | null) => ["itemDetail", id] as const,
		totals: (params: TotalsParams) => ["totals", params] as const,
		totalsAll: () => ["totals"] as const,
		search: (query: string) => ["items", "search", query] as const,
	},
	folders: {
		stats: () => ["folderStats"] as const,
	},
} as const;
