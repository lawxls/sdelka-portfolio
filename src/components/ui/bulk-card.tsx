import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { SURFACE_TINT } from "@/lib/class-presets";
import { cn } from "@/lib/utils";

interface BulkCardProps {
	label: string;
	canRemove: boolean;
	onRemove: () => void;
	removeAriaLabel: string;
	className?: string;
	"data-testid"?: string;
	children: ReactNode;
}

/** Numbered card chrome used by drawers that collect a list of bulk inputs
 * (invite cards, inbox cards, address cards). Title row sits above whatever
 * fields the caller renders; the trash button is right-aligned and hidden
 * when the list has a single row. */
export function BulkCard({
	label,
	canRemove,
	onRemove,
	removeAriaLabel,
	className,
	"data-testid": dataTestId,
	children,
}: BulkCardProps) {
	return (
		<div
			data-testid={dataTestId}
			className={cn(
				"flex flex-col gap-2 rounded-lg border border-border/60 p-3",
				SURFACE_TINT,
				"[&_input]:bg-background [&_[data-slot=select-trigger]]:bg-background dark:[&_input]:bg-input/30 dark:[&_[data-slot=select-trigger]]:bg-input/30",
				className,
			)}
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">{label}</span>
				{canRemove && (
					<button
						type="button"
						onClick={onRemove}
						aria-label={removeAriaLabel}
						className="relative flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:inset-[-8px] after:content-['']"
					>
						<Trash2 className="size-3.5" aria-hidden="true" />
					</button>
				)}
			</div>
			{children}
		</div>
	);
}
