import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ProcurementStatus } from "@/data/analytics-types";
import { STATUS_LABELS } from "@/data/types";

const PROCUREMENT_STATUSES: ProcurementStatus[] = ["awaiting_analytics", "searching", "negotiating", "completed"];

const STATUS_COLORS: Record<ProcurementStatus, string> = {
	awaiting_analytics: "oklch(0.70 0.15 60)",
	searching: "oklch(0.65 0.18 250)",
	negotiating: "oklch(0.62 0.20 295)",
	completed: "oklch(0.60 0.20 145)",
};

const chartConfig: ChartConfig = Object.fromEntries(
	PROCUREMENT_STATUSES.map((status) => [status, { label: STATUS_LABELS[status], color: STATUS_COLORS[status] }]),
);

interface Props {
	statusBreakdown: Record<ProcurementStatus, number>;
}

export function ProcurementStatusDonut({ statusBreakdown }: Props) {
	const data = PROCUREMENT_STATUSES.map((status) => ({
		status,
		label: STATUS_LABELS[status],
		count: statusBreakdown[status],
		fill: STATUS_COLORS[status],
	}));

	const total = data.reduce((sum, d) => sum + d.count, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Статусы позиций</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col items-center gap-6 sm:flex-row">
					<div className="relative shrink-0">
						<ChartContainer config={chartConfig} className="h-[200px] w-[200px]">
							<PieChart>
								<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
								<Pie data={data} dataKey="count" nameKey="status" innerRadius={60} strokeWidth={2} />
							</PieChart>
						</ChartContainer>
						<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
							<span className="tabular-nums text-3xl font-bold">{total}</span>
							<span className="text-xs text-muted-foreground">Позиций</span>
						</div>
					</div>
					<div data-testid="status-donut-legend" className="flex flex-1 flex-col gap-3">
						{data.map((item) => (
							<div key={item.status} className="flex items-center gap-3 text-sm">
								<div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
								<span className="flex-1 text-muted-foreground">{item.label}</span>
								<span className="tabular-nums font-semibold">{item.count}</span>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
