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
	письмо_не_отправлено: "oklch(0.70 0.10 250)",
	ждем_ответа: "oklch(0.60 0.22 295)",
	переговоры: "oklch(0.62 0.20 250)",
	получено_кп: "oklch(0.60 0.20 145)",
	отказ: "oklch(0.65 0.22 25)",
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
		<div data-testid="analytics-chart" className="flex items-center gap-10 rounded-lg border p-6">
			<div className="relative shrink-0">
				<ChartContainer config={chartConfig} className="aspect-square h-[400px] w-[400px]">
					<PieChart>
						<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
						<Pie data={statusCounts} dataKey="count" nameKey="status" innerRadius={100} strokeWidth={2} />
					</PieChart>
				</ChartContainer>
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-4xl font-bold">{total}</span>
					<span className="text-sm text-muted-foreground">Поставщиков</span>
				</div>
			</div>
			<div className="flex flex-1 flex-col gap-4">
				{statusCounts.map((item) => (
					<div key={item.status} className="flex items-center gap-3">
						<div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
						<span className="text-sm text-muted-foreground">{item.label}</span>
						<span className="text-lg tabular-nums font-semibold">{item.count}</span>
					</div>
				))}
			</div>
		</div>
	);
}
