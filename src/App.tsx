import { useSearchParams } from "react-router";
import { ProcurementTable } from "@/components/procurement-table";
import { SummaryPanel } from "@/components/summary-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toolbar } from "@/components/toolbar";
import type { DeviationFilter, FilterState, SortField, SortState, StatusFilter } from "@/data/types";
import { useProcurementData } from "@/data/use-procurement-data";

const SORT_FIELDS = new Set<string>([
	"annualQuantity",
	"currentPrice",
	"bestPrice",
	"averagePrice",
	"deviation",
	"overpayment",
]);

function parseSort(params: URLSearchParams): SortState | null {
	const field = params.get("sort");
	const dir = params.get("dir");
	if (!field || !SORT_FIELDS.has(field) || (dir !== "asc" && dir !== "desc")) return null;
	return { field: field as SortField, direction: dir };
}

function parseDeviation(params: URLSearchParams): DeviationFilter {
	const v = params.get("deviation");
	return v === "overpaying" || v === "saving" ? v : "all";
}

function parseStatus(params: URLSearchParams): StatusFilter {
	const v = params.get("status");
	return v === "searching" || v === "negotiating" || v === "completed" ? v : "all";
}

function App() {
	const [searchParams, setSearchParams] = useSearchParams();

	const search = searchParams.get("q") ?? "";
	const filters: FilterState = {
		deviation: parseDeviation(searchParams),
		status: parseStatus(searchParams),
	};
	const sort = parseSort(searchParams);
	const page = Math.max(1, Number(searchParams.get("page")) || 1);

	const pageSize = 50;
	const { items, totals, pageInfo } = useProcurementData({
		search,
		filters,
		sort,
		page,
		pageSize,
	});

	function handleSearchChange(query: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (query) next.set("q", query);
				else next.delete("q");
				next.delete("page");
				return next;
			},
			{ replace: true },
		);
	}

	function handleFiltersChange(newFilters: FilterState) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (newFilters.deviation !== "all") next.set("deviation", newFilters.deviation);
			else next.delete("deviation");
			if (newFilters.status !== "all") next.set("status", newFilters.status);
			else next.delete("status");
			next.delete("page");
			return next;
		});
	}

	function handleSort(field: SortField) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			const currentField = next.get("sort");
			const currentDir = next.get("dir");
			if (currentField === field) {
				if (currentDir === "asc") {
					next.set("dir", "desc");
				} else {
					next.delete("sort");
					next.delete("dir");
				}
			} else {
				next.set("sort", field);
				next.set("dir", "asc");
			}
			return next;
		});
	}

	function handlePageChange(newPage: number) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (newPage > 1) next.set("page", String(newPage));
			else next.delete("page");
			return next;
		});
	}

	return (
		<div className="flex h-svh flex-col bg-background text-foreground">
			<header className="z-30 flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
				<h1 className="text-lg font-semibold tracking-tight">Портфель закупок</h1>
				<ThemeToggle />
			</header>

			<main className="flex min-h-0 flex-1 flex-col px-4">
				<Toolbar
					defaultSearch={search}
					onSearchChange={handleSearchChange}
					filters={filters}
					onFiltersChange={handleFiltersChange}
				/>
				<ProcurementTable
					items={items}
					sort={sort}
					pageInfo={pageInfo}
					onSort={handleSort}
					onPageChange={handlePageChange}
				/>
			</main>

			<footer className="z-30 shrink-0 border-t border-border bg-background px-4 py-3">
				<SummaryPanel totals={totals} />
			</footer>
		</div>
	);
}

export default App;
