import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Totals } from "@/data/types";

interface SummaryPanelProps {
	totals: Totals;
}

export function SummaryPanel({ totals }: SummaryPanelProps) {
	return (
		<div className="flex items-center justify-between gap-4">
			<Button type="button" variant="outline" size="sm" onClick={() => {}}>
				<Download data-icon="inline-start" aria-hidden="true" />
				Скачать таблицу
			</Button>
			<div className="text-sm">
				<span className="text-muted-foreground">SKU:{"\u00A0"}</span>
				<span className="font-medium tabular-nums">{totals.itemCount}</span>
			</div>
		</div>
	);
}
