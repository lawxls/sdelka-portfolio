import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsKpis } from "@/data/analytics-types";
import { formatCurrency, pluralizeRu } from "@/lib/format";

interface Props {
	kpis: AnalyticsKpis;
}

export function AnalyticsKpiStrip({ kpis }: Props) {
	const completedPct = kpis.totalCount > 0 ? Math.round((kpis.completedCount / kpis.totalCount) * 100) : 0;

	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
			<Card>
				<CardHeader>
					<CardTitle>Годовые затраты</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold tabular-nums">{formatCurrency(kpis.totalSpend)}</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Переплата</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
						{formatCurrency(kpis.totalOverpayment)}
					</p>
					{kpis.pendingAnalysisCount > 0 && (
						<p className="mt-1 text-xs text-muted-foreground">
							{pluralizeRu(kpis.pendingAnalysisCount, "позиция", "позиции", "позиций")} не проанализировано
						</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Экономия</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
						{formatCurrency(kpis.totalSavings)}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Выполнено</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold tabular-nums">
						{kpis.completedCount}{" "}
						<span className="text-base font-normal text-muted-foreground">из {kpis.totalCount}</span>
					</p>
					<p className="text-xs text-muted-foreground">{completedPct}%</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Открытые задачи</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold tabular-nums">{kpis.openTasksCount}</p>
				</CardContent>
			</Card>
		</div>
	);
}
