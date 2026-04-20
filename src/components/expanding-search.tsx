import { Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface ExpandingSearchProps {
	value: string;
	onChange: (next: string) => void;
	ariaLabel?: string;
	placeholder?: string;
	debounceMs?: number;
}

export function ExpandingSearch({
	value,
	onChange,
	ariaLabel = "Поиск",
	placeholder = "Поиск…",
	debounceMs = 300,
}: ExpandingSearchProps) {
	const [userExpanded, setUserExpanded] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const expanded = value.length > 0 || userExpanded;

	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function scheduleChange(next: string) {
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onChange(next), debounceMs);
	}

	function collapseAndClear() {
		clearTimeout(debounceRef.current);
		onChange("");
		setUserExpanded(false);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Escape") collapseAndClear();
	}

	function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
		const nextFocus = e.relatedTarget as Node | null;
		if (nextFocus && wrapperRef.current?.contains(nextFocus)) return;
		if (!e.currentTarget.value) setUserExpanded(false);
	}

	if (!expanded) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={ariaLabel}
						onClick={() => setUserExpanded(true)}
					>
						<Search aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{ariaLabel}</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<div ref={wrapperRef} className="relative">
			<Search
				className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<Input
				type="search"
				placeholder={placeholder}
				defaultValue={value}
				onChange={(e) => scheduleChange(e.target.value)}
				onKeyDown={handleKeyDown}
				onBlur={handleInputBlur}
				autoFocus
				spellCheck={false}
				autoComplete="off"
				aria-label={ariaLabel}
				className="h-7 w-48 rounded-[min(var(--radius-md),12px)] pl-8 pr-7 text-[0.8rem] md:w-64"
			/>
			<button
				type="button"
				aria-label="Закрыть поиск"
				onClick={collapseAndClear}
				className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<X className="size-3.5" aria-hidden="true" />
			</button>
		</div>
	);
}
