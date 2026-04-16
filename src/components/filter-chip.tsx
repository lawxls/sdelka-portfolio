import { X } from "lucide-react";

interface FilterChipProps {
	label: string;
	color?: string;
	onRemove: () => void;
	removeAriaLabel: string;
	testId?: string;
}

export function FilterChip({ label, color, onRemove, removeAriaLabel, testId }: FilterChipProps) {
	return (
		<span
			data-testid={testId}
			className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-muted/50 py-0.5 pr-0.5 pl-2 text-xs"
		>
			{color && (
				<span
					className="size-2 shrink-0 rounded-full"
					style={{ backgroundColor: `var(--folder-${color})` }}
					aria-hidden="true"
				/>
			)}
			<span className="max-w-[10rem] truncate">{label}</span>
			<button
				type="button"
				onClick={onRemove}
				aria-label={removeAriaLabel}
				className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<X className="size-3" aria-hidden="true" />
			</button>
		</span>
	);
}
