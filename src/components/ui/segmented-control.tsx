export function SegmentedControl<T extends string>({
	options,
	labels,
	value,
	onChange,
}: {
	options: readonly T[];
	labels: Record<T, string>;
	value: T;
	onChange: (v: T) => void;
}) {
	return (
		<div className="flex rounded-lg border border-input">
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
		<div className={`flex rounded-lg border border-input${value === null ? " divide-x divide-input" : ""}`}>
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
