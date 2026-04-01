import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { FolderBreakdown } from "@/data/analytics-types";
import { formatCurrency, formatDeviation } from "@/lib/format";

const chartConfig: ChartConfig = {
	overpayment: { label: "Переплата", color: "oklch(0.65 0.22 25)" },
};

interface Props {
	folderBreakdown: FolderBreakdown[];
}

export function FolderOverpaymentChart({ folderBreakdown }: Props) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Переплата по папкам</CardTitle>
			</CardHeader>
			<CardContent>
				{folderBreakdown.length === 0 ? (
					<p data-testid="folder-chart-empty" className="py-8 text-center text-sm text-muted-foreground">
						Нет данных — установите лучшую цену хотя бы для одной позиции
					</p>
				) : (
					<>
						<ChartContainer
							config={chartConfig}
							style={{ height: Math.max(folderBreakdown.length * 48 + 48, 120) }}
							className="w-full"
						>
							<BarChart layout="vertical" data={folderBreakdown} margin={{ right: 80, left: 8 }}>
								<YAxis dataKey="folderName" type="category" width={0} tick={false} axisLine={false} />
								<XAxis type="number" hide />
								<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
								<Bar dataKey="overpayment" fill="var(--color-overpayment)" radius={4}>
									<LabelList
										dataKey="deviationPct"
										position="right"
										formatter={(v: unknown) => formatDeviation(typeof v === "number" ? v : null).text}
										className="fill-muted-foreground text-xs"
									/>
								</Bar>
							</BarChart>
						</ChartContainer>
						<div data-testid="folder-chart-legend" className="mt-4 flex flex-col gap-2">
							{folderBreakdown.map((item) => {
								const dev = formatDeviation(item.deviationPct);
								return (
									<div key={item.folderId} className="flex items-center gap-3 text-sm">
										<span className="min-w-0 flex-1 truncate">{item.folderName}</span>
										<span className="tabular-nums font-semibold">{formatCurrency(item.overpayment)}</span>
										<span className={dev.className}>{dev.text}</span>
									</div>
								);
							})}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
