import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CompanySummary, TenderStatus } from "@/data/types";
import { STATUS_LABELS } from "@/data/types";
import { OVERFLOW_ROW_BTN } from "@/lib/class-presets";
import { cn } from "@/lib/utils";

const STATUS_PRESETS: { label: string; value: TenderStatus }[] = [
	{ label: STATUS_LABELS.searching, value: "searching" },
	{ label: STATUS_LABELS.searching_completed, value: "searching_completed" },
	{ label: STATUS_LABELS.negotiating, value: "negotiating" },
	{ label: STATUS_LABELS.completed, value: "completed" },
];

const ROW_BTN =
	"flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ROW_BTN_ACTIVE = "font-medium text-highlight-foreground";
const SECTION_LABEL = "px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground";

interface TendersFiltersPopoverProps {
	status: TenderStatus | undefined;
	onStatusChange: (status: TenderStatus | undefined) => void;
	companies?: CompanySummary[];
	selectedCompany?: string | undefined;
	onCompanySelect?: (company: string | undefined) => void;
	showCompanies?: boolean;
	triggerVariant?: "icon" | "row";
}

export function TendersFiltersPopover({
	status,
	onStatusChange,
	companies,
	selectedCompany,
	onCompanySelect,
	showCompanies = false,
	triggerVariant = "icon",
}: TendersFiltersPopoverProps) {
	const active = status !== undefined || (showCompanies && selectedCompany !== undefined);
	return (
		<Popover>
			{triggerVariant === "row" ? (
				<PopoverTrigger asChild>
					<button type="button" className={cn(OVERFLOW_ROW_BTN, "relative")}>
						<ListFilter className="size-4" aria-hidden="true" />
						<span>Фильтры</span>
						{active && <span className="ml-auto size-2 rounded-full bg-primary" aria-hidden="true" />}
					</button>
				</PopoverTrigger>
			) : (
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button type="button" variant="ghost" size="icon-sm" aria-label="Фильтры" className="relative">
								<ListFilter aria-hidden="true" />
								{active && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />}
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Фильтры</TooltipContent>
				</Tooltip>
			)}
			<PopoverContent align="end" className="w-72 p-0">
				<div className="flex max-h-[70vh] flex-col overflow-y-auto p-1.5">
					{showCompanies && onCompanySelect && (
						<>
							<div data-testid="tenders-filters-section-company" className="flex flex-col gap-0.5">
								<div className={SECTION_LABEL}>Компания</div>
								{(companies ?? []).map((company) => {
									const isActive = selectedCompany === company.id;
									return (
										<button
											key={company.id}
											type="button"
											className={cn(ROW_BTN, isActive && ROW_BTN_ACTIVE)}
											onClick={() => onCompanySelect(isActive ? undefined : company.id)}
										>
											<span className="truncate">{company.name}</span>
										</button>
									);
								})}
							</div>
							<div className="my-1 h-px bg-border" />
						</>
					)}
					<div data-testid="tenders-filters-section-status" className="flex flex-col gap-0.5">
						<div className={SECTION_LABEL}>Статус</div>
						{STATUS_PRESETS.map((preset) => (
							<button
								key={preset.value}
								type="button"
								className={cn(ROW_BTN, status === preset.value && ROW_BTN_ACTIVE)}
								onClick={() => onStatusChange(status === preset.value ? undefined : preset.value)}
							>
								{preset.label}
							</button>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
