import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Totals } from "@/data/types";
import { LogoIcon } from "./logo-icon";

interface SummaryPanelProps {
	totals?: Totals;
	isLoading?: boolean;
}

export function SummaryPanel({ totals, isLoading }: SummaryPanelProps) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-1.5">
				<LogoIcon className="h-4 w-auto" />
				<Badge variant="secondary" className="text-foreground/60">
					Beta
				</Badge>
			</div>
			<div className="text-sm">
				<span className="text-muted-foreground">SKU:{"\u00A0"}</span>
				{isLoading ? (
					<Skeleton className="inline-block h-4 w-8 align-middle" data-testid="sku-skeleton" />
				) : (
					<span className="font-medium tabular-nums">{totals?.itemCount ?? 0}</span>
				)}
			</div>
		</div>
	);
}
