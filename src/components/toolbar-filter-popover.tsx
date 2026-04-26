import { ListFilter } from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ROW_BTN =
	"flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ROW_BTN_ACTIVE = "font-medium text-highlight-foreground";
const SECTION_LABEL = "px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground";

interface FilterSection {
	title: string;
	options: { label: string; value: string; isActive: boolean; onSelect: () => void }[];
}

interface ToolbarFilterPopoverProps {
	ariaLabel?: string;
	tooltip?: string;
	sections: FilterSection[];
}

export function ToolbarFilterPopover({
	ariaLabel = "Фильтры",
	tooltip = "Фильтры",
	sections,
}: ToolbarFilterPopoverProps) {
	const active = sections.some((s) => s.options.some((o) => o.isActive));
	return (
		<Popover>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button type="button" variant="ghost" size="icon-sm" aria-label={ariaLabel} className="relative">
							<ListFilter aria-hidden="true" />
							{active && (
								<span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" aria-hidden="true" />
							)}
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>{tooltip}</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" className="w-72 p-0">
				<div className="flex max-h-[70vh] flex-col overflow-y-auto p-1.5">
					{sections.map((section, idx) => (
						<Fragment key={section.title}>
							{idx > 0 && <div className="my-1 h-px bg-border" />}
							<div className="flex flex-col gap-0.5">
								<div className={SECTION_LABEL}>{section.title}</div>
								{section.options.map((opt) => (
									<button
										key={opt.value}
										type="button"
										className={cn(ROW_BTN, opt.isActive && ROW_BTN_ACTIVE)}
										onClick={opt.onSelect}
									>
										{opt.label}
									</button>
								))}
							</div>
						</Fragment>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
