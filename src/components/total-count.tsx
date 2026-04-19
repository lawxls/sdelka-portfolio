import { Skeleton } from "@/components/ui/skeleton";
import { formatRussianPlural } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TotalCountProps {
	value: number | undefined;
	isLoading: boolean;
	forms?: [one: string, few: string, many: string];
	className?: string;
}

export function TotalCount({ value, isLoading, forms, className }: TotalCountProps) {
	if (isLoading || value === undefined) {
		return <Skeleton className={cn("h-5 w-24", className)} data-testid="total-count-skeleton" />;
	}
	const text = forms ? formatRussianPlural(value, forms) : `${value}`;
	return (
		<span className={cn("text-sm font-medium text-foreground tabular-nums", className)} data-testid="total-count">
			{text}
		</span>
	);
}
