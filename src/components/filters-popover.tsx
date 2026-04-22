import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CompanySummary, DeviationFilter, FilterState, StatusFilter } from "@/data/types";
import { STATUS_LABELS } from "@/data/types";
import { cn } from "@/lib/utils";

const DEVIATION_PRESETS: { label: string; value: DeviationFilter }[] = [
	{ label: "С переплатой", value: "overpaying" },
	{ label: "С экономией", value: "saving" },
];

const STATUS_PRESETS: { label: string; value: StatusFilter }[] = [
	{ label: STATUS_LABELS.searching, value: "searching" },
	{ label: STATUS_LABELS.searching_completed, value: "searching_completed" },
	{ label: STATUS_LABELS.negotiating, value: "negotiating" },
	{ label: STATUS_LABELS.completed, value: "completed" },
];

const ROW_BTN =
	"flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ROW_BTN_ACTIVE = "font-medium text-highlight-foreground";
const SECTION_LABEL = "px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground";

function hasActiveFilter(filters: FilterState): boolean {
	return filters.deviation !== "all" || filters.status !== "all";
}

interface FiltersPopoverProps {
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
	companies?: CompanySummary[];
	selectedCompany?: string | undefined;
	onCompanySelect?: (company: string | undefined) => void;
	showCompanies?: boolean;
}

export function FiltersPopover({
	filters,
	onFiltersChange,
	companies,
	selectedCompany,
	onCompanySelect,
	showCompanies = false,
}: FiltersPopoverProps) {
	return (
		<Popover>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button type="button" variant="ghost" size="icon-sm" aria-label="Фильтры" className="relative">
							<ListFilter aria-hidden="true" />
							{hasActiveFilter(filters) && (
								<span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />
							)}
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>Фильтры</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" className="w-72 p-0">
				<div className="flex max-h-[70vh] flex-col overflow-y-auto p-1.5">
					{showCompanies && onCompanySelect && (
						<>
							<CompanySection
								companies={companies ?? []}
								selectedCompany={selectedCompany}
								onCompanySelect={onCompanySelect}
							/>
							<Divider />
						</>
					)}
					<DeviationSection filters={filters} onFiltersChange={onFiltersChange} />
					<Divider />
					<StatusSection filters={filters} onFiltersChange={onFiltersChange} />
				</div>
			</PopoverContent>
		</Popover>
	);
}

function Divider() {
	return <div className="my-1 h-px bg-border" />;
}

function CompanySection({
	companies,
	selectedCompany,
	onCompanySelect,
}: {
	companies: CompanySummary[];
	selectedCompany: string | undefined;
	onCompanySelect: (company: string | undefined) => void;
}) {
	return (
		<div data-testid="filters-section-company" className="flex flex-col gap-0.5">
			<div className={SECTION_LABEL}>Компания</div>
			{companies.map((company) => {
				const isActive = selectedCompany === company.id;
				return (
					<button
						key={company.id}
						type="button"
						className={cn(ROW_BTN, isActive && ROW_BTN_ACTIVE)}
						onClick={() => onCompanySelect(isActive ? undefined : company.id)}
					>
						<span className="truncate">{company.name}</span>
						<span className="shrink-0 tabular-nums text-xs text-muted-foreground">{company.procurementItemCount}</span>
					</button>
				);
			})}
		</div>
	);
}

function DeviationSection({
	filters,
	onFiltersChange,
}: {
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
}) {
	function toggle(value: DeviationFilter) {
		onFiltersChange({ ...filters, deviation: filters.deviation === value ? "all" : value });
	}
	return (
		<div data-testid="filters-section-deviation" className="flex flex-col gap-0.5">
			<div className={SECTION_LABEL}>Отклонение</div>
			{DEVIATION_PRESETS.map((preset) => (
				<button
					key={preset.value}
					type="button"
					className={cn(ROW_BTN, filters.deviation === preset.value && ROW_BTN_ACTIVE)}
					onClick={() => toggle(preset.value)}
				>
					{preset.label}
				</button>
			))}
		</div>
	);
}

function StatusSection({
	filters,
	onFiltersChange,
}: {
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
}) {
	function toggle(value: StatusFilter) {
		onFiltersChange({ ...filters, status: filters.status === value ? "all" : value });
	}
	return (
		<div data-testid="filters-section-status" className="flex flex-col gap-0.5">
			<div className={SECTION_LABEL}>Статус</div>
			{STATUS_PRESETS.map((preset) => (
				<button
					key={preset.value}
					type="button"
					className={cn(ROW_BTN, filters.status === preset.value && ROW_BTN_ACTIVE)}
					onClick={() => toggle(preset.value)}
				>
					{preset.label}
				</button>
			))}
		</div>
	);
}
