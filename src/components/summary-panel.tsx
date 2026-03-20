import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Totals } from "@/data/types";
import { formatCurrency, signClassName } from "@/lib/format";

interface SummaryPanelProps {
	totals: Totals;
}

export function SummaryPanel({ totals }: SummaryPanelProps) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
				<div>
					<span className="text-muted-foreground">Позиций:{"\u00A0"}</span>
					<span className="font-medium tabular-nums">{totals.itemCount}</span>
				</div>
				<div>
					<span className="text-muted-foreground">Общее отклонение:{"\u00A0"}</span>
					<span className={`font-medium tabular-nums ${signClassName(totals.totalDeviation)}`}>
						{formatCurrency(totals.totalDeviation)}
					</span>
				</div>
				<div>
					<span className="text-muted-foreground">Переплата:{"\u00A0"}</span>
					<span className={`font-medium tabular-nums ${signClassName(totals.totalOverpayment)}`}>
						{formatCurrency(totals.totalOverpayment)}
					</span>
				</div>
				<div>
					<span className="text-muted-foreground">Экономия:{"\u00A0"}</span>
					<span className={`font-medium tabular-nums ${signClassName(-totals.totalSavings)}`}>
						{formatCurrency(totals.totalSavings)}
					</span>
				</div>
			</div>
			<Button type="button" variant="outline" size="sm" onClick={() => {}}>
				<Download data-icon="inline-start" aria-hidden="true" />
				Скачать таблицу
			</Button>
		</div>
	);
}
