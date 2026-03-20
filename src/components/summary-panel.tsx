import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Totals } from "@/data/types";
import { formatCurrency } from "@/lib/format";

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
					<span
						className={`font-medium tabular-nums ${totals.totalDeviation > 0 ? "text-red-600 dark:text-red-400" : totals.totalDeviation < 0 ? "text-green-600 dark:text-green-400" : ""}`}
					>
						{formatCurrency(totals.totalDeviation)}
					</span>
				</div>
				<div>
					<span className="text-muted-foreground">Переплата:{"\u00A0"}</span>
					<span
						className={`font-medium tabular-nums ${totals.totalOverpayment > 0 ? "text-red-600 dark:text-red-400" : ""}`}
					>
						{formatCurrency(totals.totalOverpayment)}
					</span>
				</div>
				<div>
					<span className="text-muted-foreground">Экономия:{"\u00A0"}</span>
					<span
						className={`font-medium tabular-nums ${totals.totalSavings > 0 ? "text-green-600 dark:text-green-400" : ""}`}
					>
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
