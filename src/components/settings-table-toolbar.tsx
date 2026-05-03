import { Archive, ArchiveRestore, EllipsisVertical, X } from "lucide-react";
import type { ReactNode } from "react";
import { ToolbarSearch } from "@/components/toolbar-search";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OVERFLOW_ROW_BTN } from "@/lib/class-presets";
import { pluralizeRu } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ToolbarBulkAction {
	label: string;
	icon?: ReactNode;
	onClick: () => void;
	variant?: "default" | "destructive" | "outline";
	disabled?: boolean;
	disabledReason?: string;
}

interface SettingsTableToolbarProps {
	totalCount: number;
	totalForms: [one: string, few: string, many: string];
	primaryAction: ReactNode;
	search: {
		value: string;
		onChange: (next: string) => void;
		expanded: boolean;
		onExpandedChange: (next: boolean) => void;
		ariaLabel: string;
		placeholder?: string;
	};
	/** Optional filter slot rendered between search and the archive toggle. */
	filter?: ReactNode;
	/** Optional row-style content rendered inside a mobile-only "Ещё" Popover. When provided,
	 * the desktop filter and archive toggle are hidden on mobile and these rows + an archive row
	 * take their place. Use `triggerVariant="row"` on nested popovers to match the row layout. */
	mobileMore?: ReactNode;
	archiveActive: boolean;
	onToggleArchive: () => void;
	selectedCount: number;
	onClearSelection: () => void;
	bulkActions: ToolbarBulkAction[];
	bulkForms: [one: string, few: string, many: string];
}

export function SettingsTableToolbar({
	totalCount,
	totalForms,
	primaryAction,
	search,
	filter,
	mobileMore,
	archiveActive,
	onToggleArchive,
	selectedCount,
	onClearSelection,
	bulkActions,
	bulkForms,
}: SettingsTableToolbarProps) {
	const inSelection = selectedCount > 0;

	return (
		<div
			className="flex shrink-0 flex-wrap items-center gap-sm border-b border-border bg-background px-lg py-sm"
			data-testid="settings-table-toolbar"
		>
			{inSelection ? (
				<>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Сбросить выбор"
						onClick={onClearSelection}
						className="text-muted-foreground"
					>
						<X className="size-4" aria-hidden="true" />
					</Button>
					<span className="text-sm font-medium tabular-nums" data-testid="toolbar-selected-count">
						Выбрано {pluralizeRu(selectedCount, bulkForms[0], bulkForms[1], bulkForms[2])}
					</span>
					<div className="ml-auto flex items-center gap-xs">
						{bulkActions.map((action) => (
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
				</>
			) : (
				<>
					<span className="text-sm font-medium text-foreground tabular-nums" data-testid="toolbar-total-count">
						{pluralizeRu(totalCount, totalForms[0], totalForms[1], totalForms[2])}
					</span>
					<div className="ml-auto flex items-center gap-xs">
						<ToolbarSearch
							value={search.value}
							onChange={search.onChange}
							ariaLabel={search.ariaLabel}
							placeholder={search.placeholder}
							expanded={search.expanded}
							onExpandedChange={search.onExpandedChange}
						/>
						<div className={cn("flex items-center gap-xs", mobileMore && "hidden md:flex")}>
							{filter}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										aria-label={archiveActive ? "Скрыть архив" : "Показать архив"}
										aria-pressed={archiveActive}
										onClick={onToggleArchive}
										className={cn(archiveActive && "bg-accent text-accent-foreground")}
									>
										<Archive aria-hidden="true" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>{archiveActive ? "Скрыть архив" : "Архив"}</TooltipContent>
							</Tooltip>
						</div>
						{mobileMore && (
							<Popover>
								<Tooltip>
									<TooltipTrigger asChild>
										<PopoverTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label="Ещё"
												className="relative md:hidden"
											>
												<EllipsisVertical aria-hidden="true" />
											</Button>
										</PopoverTrigger>
									</TooltipTrigger>
									<TooltipContent>Ещё</TooltipContent>
								</Tooltip>
								<PopoverContent align="end" className="w-52 p-1">
									<div className="flex flex-col gap-0.5">
										{mobileMore}
										<button
											type="button"
											aria-label={archiveActive ? "Скрыть архив" : "Архив"}
											aria-pressed={archiveActive}
											onClick={onToggleArchive}
											className={cn(OVERFLOW_ROW_BTN, archiveActive && "font-medium text-highlight-foreground")}
										>
											{archiveActive ? (
												<ArchiveRestore className="size-4" aria-hidden="true" />
											) : (
												<Archive className="size-4" aria-hidden="true" />
											)}
											<span>{archiveActive ? "Скрыть архив" : "Архив"}</span>
										</button>
									</div>
								</PopoverContent>
							</Popover>
						)}
						{primaryAction}
					</div>
				</>
			)}
		</div>
	);
}
