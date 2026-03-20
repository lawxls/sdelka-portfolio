import { ProcurementTable } from "@/components/procurement-table";
import { SummaryPanel } from "@/components/summary-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toolbar } from "@/components/toolbar";
import { useProcurementData } from "@/data/use-procurement-data";

function App() {
	const { items, totals } = useProcurementData({
		search: "",
		filters: { deviation: "all", status: "all" },
		sort: null,
		page: 1,
		pageSize: 50,
	});

	return (
		<div className="flex min-h-svh flex-col bg-background text-foreground">
			<header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<h1 className="text-lg font-semibold tracking-tight">Портфель закупок</h1>
				<ThemeToggle />
			</header>

			<main className="flex-1 px-4">
				<Toolbar />
				<ProcurementTable items={items} startIndex={0} onRowClick={() => {}} />
			</main>

			<footer className="sticky bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<SummaryPanel totals={totals} />
			</footer>
		</div>
	);
}

export default App;
