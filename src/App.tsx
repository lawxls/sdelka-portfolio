import { useCallback, useState } from "react";
import { ProcurementTable } from "@/components/procurement-table";
import { SummaryPanel } from "@/components/summary-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toolbar } from "@/components/toolbar";
import type { FilterState, SortField, SortState } from "@/data/types";
import { useProcurementData } from "@/data/use-procurement-data";

function App() {
	const [search, setSearch] = useState("");
	const [filters, setFilters] = useState<FilterState>({ deviation: "all", status: "all" });
	const [sort, setSort] = useState<SortState | null>(null);
	const [page, setPage] = useState(1);

	const pageSize = 50;
	const { items, totals, pageInfo } = useProcurementData({
		search,
		filters,
		sort,
		page,
		pageSize,
	});

	const handleSearchChange = useCallback((query: string) => {
		setSearch(query);
		setPage(1);
	}, []);

	const handleFiltersChange = useCallback((newFilters: FilterState) => {
		setFilters(newFilters);
		setPage(1);
	}, []);

	function handleSort(field: SortField) {
		setSort((prev) => {
			if (prev?.field === field) {
				return prev.direction === "asc" ? { field, direction: "desc" } : null;
			}
			return { field, direction: "asc" };
		});
	}

	return (
		<div className="flex h-svh flex-col bg-background text-foreground">
			<header className="z-30 flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
				<h1 className="text-lg font-semibold tracking-tight">Портфель закупок</h1>
				<ThemeToggle />
			</header>

			<main className="flex min-h-0 flex-1 flex-col px-4">
				<Toolbar onSearchChange={handleSearchChange} filters={filters} onFiltersChange={handleFiltersChange} />
				<ProcurementTable
					items={items}
					startIndex={(pageInfo.currentPage - 1) * pageSize}
					sort={sort}
					pageInfo={pageInfo}
					onSort={handleSort}
					onRowClick={() => {}}
					onPageChange={setPage}
				/>
			</main>

			<footer className="z-30 shrink-0 border-t border-border bg-background px-4 py-3">
				<SummaryPanel totals={totals} />
			</footer>
		</div>
	);
}

export default App;
