import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { pluralizeRu } from "@/lib/format";

interface BulkAction {
	label: string;
	onClick: () => void;
	icon?: ReactNode;
	variant?: "default" | "destructive" | "outline";
	disabled?: boolean;
	disabledReason?: string;
}

interface BulkActionsBarProps {
	count: number;
	actions: BulkAction[];
	onClear: () => void;
	forms: [one: string, few: string, many: string];
}

export function BulkActionsBar({ count, actions, onClear, forms }: BulkActionsBarProps) {
	if (count <= 0) return null;
	return (
		<div
			className="flex shrink-0 items-center gap-sm border-b border-border bg-accent/40 px-lg py-sm"
			data-testid="bulk-actions-bar"
		>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label="Сбросить выбор"
				onClick={onClear}
				className="text-muted-foreground"
			>
				<X className="size-4" />
			</Button>
			<span className="text-sm font-medium tabular-nums">
				Выбрано {pluralizeRu(count, forms[0], forms[1], forms[2])}
			</span>
			<div className="ml-auto flex items-center gap-xs">
				{actions.map((action) => (
					<Button
						key={action.label}
						type="button"
						size="sm"
						variant={action.variant ?? "outline"}
						onClick={action.onClick}
						disabled={action.disabled}
						title={action.disabled ? action.disabledReason : undefined}
					>
						{action.icon}
						<span>{action.label}</span>
					</Button>
				))}
			</div>
		</div>
	);
}
