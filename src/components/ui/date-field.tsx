import { CalendarDays } from "lucide-react";
import { useRef } from "react";
import { formatDate as formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DateFieldProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	inputRef?: React.RefObject<HTMLInputElement | null>;
	ariaLabel?: string;
	ariaRequired?: boolean;
	ariaInvalid?: boolean;
	ariaDescribedBy?: string;
	hasError?: boolean;
	placeholder?: string;
	className?: string;
	min?: string;
	max?: string;
}

/** Shadcn-style wrapper around a native `<input type="date">` — visible
 * label is the long Russian date (or a placeholder), the underlying input
 * sits transparent over the row so its native picker still opens via
 * `showPicker()` on click. */
export function DateField({
	id,
	value,
	onChange,
	inputRef,
	ariaLabel,
	ariaRequired,
	ariaInvalid,
	ariaDescribedBy,
	hasError,
	placeholder = "Выберите дату",
	className,
	min,
	max,
}: DateFieldProps) {
	const localRef = useRef<HTMLInputElement | null>(null);
	const display = value ? formatLongDate(value) : placeholder;

	function setRefs(el: HTMLInputElement | null) {
		localRef.current = el;
		if (inputRef) inputRef.current = el;
	}

	function openPicker() {
		const el = localRef.current;
		if (!el) return;
		// Native showPicker() must be called from a user gesture; falling back to
		// focus + click ensures the calendar opens on browsers that lack the API.
		if (typeof el.showPicker === "function") {
			try {
				el.showPicker();
				return;
			} catch {
				// Some browsers throw when showPicker is unavailable in this context.
			}
		}
		el.focus();
		el.click();
	}

	return (
		<div
			className={cn(
				"group relative flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors",
				"focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
				"hover:border-ring/60",
				hasError && "border-destructive focus-within:border-destructive focus-within:ring-destructive/30",
				className,
			)}
		>
			<CalendarDays
				aria-hidden="true"
				className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground group-focus-within:text-foreground"
			/>
			<span className={cn("flex-1 truncate tabular-nums", !value && "text-muted-foreground")}>{display}</span>
			<input
				id={id}
				ref={setRefs}
				type="date"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onClick={openPicker}
				required={ariaRequired}
				aria-label={ariaLabel}
				aria-invalid={ariaInvalid ? true : undefined}
				aria-describedby={ariaDescribedBy}
				min={min}
				max={max}
				className="absolute inset-0 cursor-pointer opacity-0"
			/>
		</div>
	);
}
