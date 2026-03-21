import type { Totals } from "@/data/types";
import { LogoIcon } from "./logo-icon";

interface SummaryPanelProps {
	totals: Totals;
}

export function SummaryPanel({ totals }: SummaryPanelProps) {
	return (
		<div className="flex items-center justify-between">
			<LogoIcon className="h-4 w-auto" />
			<div className="text-sm">
				<span className="text-muted-foreground">SKU:{"\u00A0"}</span>
				<span className="font-medium tabular-nums">{totals.itemCount}</span>
			</div>
		</div>
	);
}
