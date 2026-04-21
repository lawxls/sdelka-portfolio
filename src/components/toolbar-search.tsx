import { ArrowLeft, Search, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface ToolbarSearchProps {
	value: string;
	onChange: (next: string) => void;
	ariaLabel?: string;
	placeholder?: string;
	debounceMs?: number;
	/**
	 * Parent-owned "user asked to expand" flag. Combined with `value.length > 0`
	 * to decide render state. Lifted so siblings can react to expansion.
	 */
	expanded: boolean;
	onExpandedChange: (next: boolean) => void;
}

export function ToolbarSearch({
	value,
	onChange,
	ariaLabel = "Поиск",
	placeholder = "Поиск…",
	debounceMs = 300,
	expanded,
	onExpandedChange,
}: ToolbarSearchProps) {
	const isMobile = useIsMobile();
	const wrapperRef = useRef<HTMLDivElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const rendered = value.length > 0 || expanded;

	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function scheduleChange(next: string) {
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onChange(next), debounceMs);
	}

	function collapseAndClear() {
		clearTimeout(debounceRef.current);
		onChange("");
		onExpandedChange(false);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Escape") collapseAndClear();
	}

	function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
		const nextFocus = e.relatedTarget as Node | null;
		if (nextFocus && wrapperRef.current?.contains(nextFocus)) return;
		if (!e.currentTarget.value) onExpandedChange(false);
	}

	if (!rendered) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={ariaLabel}
						onClick={() => onExpandedChange(true)}
					>
						<Search aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{ariaLabel}</TooltipContent>
			</Tooltip>
		);
	}

	if (isMobile) {
		return (
			<div ref={wrapperRef} className="flex flex-1 items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label="Закрыть поиск"
					onClick={collapseAndClear}
					className="relative after:absolute after:inset-[-4px] after:content-['']"
				>
					<ArrowLeft aria-hidden="true" />
				</Button>
				<div className="relative flex-1">
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
						autoFocus
						spellCheck={false}
						autoComplete="off"
						aria-label={ariaLabel}
						className="h-9 w-full rounded-[min(var(--radius-md),12px)] pl-9 pr-9 text-base md:text-[0.8125rem]"
					/>
					{value.length > 0 && (
						<button
							type="button"
							aria-label="Очистить"
							onClick={() => onChange("")}
							className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<X className="size-3.5" aria-hidden="true" />
						</button>
					)}
				</div>
			</div>
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
