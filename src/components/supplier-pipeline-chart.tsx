import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
	SUPPLIER_STATUS_CHART_COLORS,
	SUPPLIER_STATUS_LABELS,
	SUPPLIER_STATUSES,
	type SupplierStatus,
} from "@/data/supplier-types";

const chartConfig: ChartConfig = Object.fromEntries(
	SUPPLIER_STATUSES.map((s) => [s, { label: SUPPLIER_STATUS_LABELS[s], color: SUPPLIER_STATUS_CHART_COLORS[s] }]),
);

interface Props {
	supplierPipeline: Record<SupplierStatus, number>;
}

export function SupplierPipelineChart({ supplierPipeline }: Props) {
	const chartData = SUPPLIER_STATUSES.map((status) => ({
		status,
		label: SUPPLIER_STATUS_LABELS[status],
		count: supplierPipeline[status],
		fill: SUPPLIER_STATUS_CHART_COLORS[status],
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Статусы поставщиков</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[260px] w-full">
					<BarChart layout="vertical" data={chartData} margin={{ right: 48, left: 8 }}>
						<YAxis dataKey="label" type="category" width={0} tick={false} axisLine={false} />
						<XAxis type="number" hide />
						<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
						<Bar dataKey="count" radius={4}>
							{chartData.map((entry) => (
								<Cell key={entry.status} fill={entry.fill} />
							))}
							<LabelList dataKey="count" position="right" className="fill-muted-foreground text-xs" />
						</Bar>
					</BarChart>
				</ChartContainer>
				<div data-testid="supplier-pipeline-legend" className="mt-4 flex flex-col gap-2">
					{chartData.map((item) => (
						<div key={item.status} className="flex items-center gap-3 text-sm">
							<div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
							<span className="flex-1">{item.label}</span>
							<span className="tabular-nums font-semibold">{item.count}</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
