import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface CheckboxBadgeProps {
	id: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	ariaLabel: string;
	children: React.ReactNode;
	className?: string;
}

export function CheckboxBadge({ id, checked, onChange, ariaLabel, children, className }: CheckboxBadgeProps) {
	return (
		<label
			htmlFor={id}
			className={cn(
				"inline-flex w-fit cursor-pointer select-none items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm active:scale-[0.96] transition-[background-color,border-color,color,scale] duration-150 ease-out motion-reduce:transition-none motion-reduce:active:scale-100 focus-within:ring-3 focus-within:ring-ring/50",
				checked
					? "border-primary bg-primary/10 text-foreground"
					: "border-border bg-background text-foreground hover:bg-muted",
				className,
			)}
		>
			<Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} aria-label={ariaLabel} />
			<span>{children}</span>
		</label>
	);
}
