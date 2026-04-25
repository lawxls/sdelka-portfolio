import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
	options,
	labels,
	value,
	onChange,
	disabled,
}: {
	options: readonly T[];
	labels: Record<T, string>;
	value: T;
	onChange: (v: T) => void;
	disabled?: boolean;
}) {
	return (
		<div className={cn("flex w-fit rounded-lg border border-input", disabled && "pointer-events-none opacity-50")}>
			{options.map((opt) => (
				<button
					key={opt}
					type="button"
					aria-pressed={value === opt}
					disabled={disabled}
					className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
						value === opt
							? "bg-primary text-primary-foreground"
							: "bg-background text-muted-foreground hover:text-foreground"
					}`}
					onClick={() => onChange(opt)}
				>
					{labels[opt]}
				</button>
			))}
		</div>
	);
}

export function OptionalSegmentedControl<T extends string>({
	options,
	labels,
	value,
	onChange,
}: {
	options: readonly T[];
	labels: Record<T, string>;
	value: T | null;
	onChange: (v: T | null) => void;
}) {
	return (
		<div className={cn("flex w-fit rounded-lg border border-input", value === null && "divide-x divide-input")}>
			{options.map((opt) => (
				<button
					key={opt}
					type="button"
					aria-pressed={value === opt}
					className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
						value === opt
							? "bg-primary text-primary-foreground"
							: "bg-background text-muted-foreground hover:text-foreground"
					}`}
					onClick={() => onChange(value === opt ? null : opt)}
				>
					{labels[opt]}
				</button>
			))}
		</div>
	);
}
