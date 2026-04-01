import { useSearchParams } from "react-router";
import { AnalyticsKpiStrip } from "@/components/analytics-kpi-strip";
import { FolderOverpaymentChart } from "@/components/folder-overpayment-chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsSummary } from "@/data/use-analytics";
import { useProcurementCompanies } from "@/data/use-companies";

export function AnalyticsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const company = searchParams.get("company") ?? undefined;

	const { data: companies = [] } = useProcurementCompanies();
	const { kpis, folderBreakdown, isLoading } = useAnalyticsSummary({ company });

	function handleCompanyChange(value: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (value === "__all__") {
					next.delete("company");
				} else {
					next.set("company", value);
				}
				return next;
			},
			{ replace: true },
		);
	}

	return (
		<div className="flex flex-col gap-6 p-4 sm:p-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">Аналитика</h1>
				{companies.length > 1 && (
					<Select value={company ?? "__all__"} onValueChange={handleCompanyChange}>
						<SelectTrigger aria-label="Фильтр по компании">
							<SelectValue placeholder="Все компании" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__all__">Все компании</SelectItem>
							{companies.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			{isLoading ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="kpi-skeletons">
					{Array.from({ length: 5 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
						<Skeleton key={i} className="h-28 rounded-xl" />
					))}
				</div>
			) : kpis ? (
				<AnalyticsKpiStrip kpis={kpis} />
			) : null}

			{isLoading ? (
				<Skeleton className="h-64 rounded-xl" data-testid="folder-chart-skeleton" />
			) : (
				<FolderOverpaymentChart folderBreakdown={folderBreakdown} />
			)}
		</div>
	);
}
