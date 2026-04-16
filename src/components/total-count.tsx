import { Skeleton } from "@/components/ui/skeleton";

interface TotalCountProps {
	value: number | undefined;
	isLoading: boolean;
	suffix?: string;
}

export function TotalCount({ value, isLoading, suffix }: TotalCountProps) {
	if (isLoading || value === undefined) {
		return <Skeleton className="h-5 w-24" data-testid="total-count-skeleton" />;
	}
	const text = suffix ? `Всего: ${value} ${suffix}` : `Всего: ${value}`;
	return (
		<span className="text-sm font-medium text-foreground" data-testid="total-count">
			{text}
		</span>
	);
}
