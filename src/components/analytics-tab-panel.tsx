import { Pie, PieChart } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { Supplier, SupplierStatus } from "@/data/supplier-types";
import { SUPPLIER_STATUSES } from "@/data/supplier-types";
import { useSuppliers } from "@/data/use-suppliers";

const CHART_LABELS: Record<SupplierStatus, string> = {
	письмо_не_отправлено: "Отправлено RFQ",
	ждем_ответа: "Не ответили",
	переговоры: "Переговоры",
	получено_кп: "Прислали КП",
	отказ: "Отказались",
};

const CHART_COLORS: Record<SupplierStatus, string> = {
	письмо_не_отправлено: "var(--color-chart-1)",
	ждем_ответа: "var(--color-chart-2)",
	переговоры: "var(--color-chart-3)",
	получено_кп: "var(--color-chart-4)",
	отказ: "var(--color-chart-5)",
};

export interface StatusCount {
	status: SupplierStatus;
	label: string;
	count: number;
	fill: string;
}

export function getStatusCounts(suppliers: Supplier[]): StatusCount[] {
	const counts = new Map<SupplierStatus, number>();
	for (const s of suppliers) {
		counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
	}
	return SUPPLIER_STATUSES.map((status) => ({
		status,
		label: CHART_LABELS[status],
		count: counts.get(status) ?? 0,
		fill: CHART_COLORS[status],
	}));
}

const chartConfig: ChartConfig = Object.fromEntries(
	SUPPLIER_STATUSES.map((status) => [status, { label: CHART_LABELS[status], color: CHART_COLORS[status] }]),
);

export function AnalyticsTabPanel({ itemId }: { itemId: string }) {
	const { data, isLoading } = useSuppliers(itemId);
	const suppliers = data?.suppliers ?? [];

	if (isLoading) {
		return (
			<div data-testid="analytics-loading" className="flex flex-col items-center gap-4 py-8">
				<Skeleton className="h-[200px] w-[200px] rounded-full" />
				<Skeleton className="h-4 w-48" />
			</div>
		);
	}

	const statusCounts = getStatusCounts(suppliers);
	const total = suppliers.length;

	return (
		<div data-testid="analytics-chart" className="flex flex-col items-center gap-6">
			<div className="relative">
				<ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px]">
					<PieChart>
						<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
						<Pie data={statusCounts} dataKey="count" nameKey="status" innerRadius={60} strokeWidth={2} />
					</PieChart>
				</ChartContainer>
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-2xl font-bold">{total}</span>
					<span className="text-xs text-muted-foreground">Поставщиков</span>
				</div>
			</div>
			<div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
				{statusCounts.map((item) => (
					<div key={item.status} className="flex items-center gap-1.5 text-sm">
						<div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.fill }} />
						<span className="text-muted-foreground">{item.label}</span>
						<span className="tabular-nums font-medium">{item.count}</span>
					</div>
				))}
			</div>
		</div>
	);
}
