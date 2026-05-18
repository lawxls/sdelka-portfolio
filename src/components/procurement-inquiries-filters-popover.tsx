import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CompanySummary, ProcurementInquiryStatus } from "@/data/types";
import { STATUS_LABELS } from "@/data/types";
import { OVERFLOW_ROW_BTN } from "@/lib/class-presets";
import { cn } from "@/lib/utils";
import type { DeadlineFilter } from "./procurement-inquiries-toolbar";

function DateRangePicker({
	idPrefix,
	from,
	to,
	onChange,
	ariaLabelPrefix,
	overduePreset,
	onClear,
}: {
	idPrefix: string;
	from: string | undefined;
	to: string | undefined;
	onChange: (from: string | undefined, to: string | undefined) => void;
	ariaLabelPrefix: string;
	overduePreset?: { active: boolean; onSelect: () => void };
	onClear: () => void;
}) {
	const hasRange = Boolean(from) || Boolean(to);
	const showFooter = hasRange || (overduePreset?.active ?? false);
	return (
		<div className="flex flex-col gap-1.5">
			<div className="grid grid-cols-2 gap-1.5">
				<div className="flex flex-col gap-0.5">
					<label htmlFor={`${idPrefix}-from`} className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
						С
					</label>
					<DateField
						id={`${idPrefix}-from`}
						value={from ?? ""}
						onChange={(v) => onChange(v || undefined, to)}
						ariaLabel={`${ariaLabelPrefix} с`}
						placeholder="—"
						max={to}
					/>
				</div>
				<div className="flex flex-col gap-0.5">
					<label htmlFor={`${idPrefix}-to`} className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
						По
					</label>
					<DateField
						id={`${idPrefix}-to`}
						value={to ?? ""}
						onChange={(v) => onChange(from, v || undefined)}
						ariaLabel={`${ariaLabelPrefix} по`}
						placeholder="—"
						min={from}
					/>
				</div>
			</div>
			{(overduePreset || showFooter) && (
				<div className="flex items-center justify-between gap-2">
					{overduePreset ? (
						<button
							type="button"
							onClick={overduePreset.onSelect}
							data-testid={`${idPrefix}-filter-overdue`}
							className={cn(
								"rounded-md border border-transparent px-2 py-1 text-xs transition-colors hover:bg-muted",
								overduePreset.active && "border-border bg-muted font-medium text-highlight-foreground",
							)}
						>
							Просрочены
						</button>
					) : (
						<span aria-hidden="true" />
					)}
					{showFooter && (
						<button
							type="button"
							onClick={onClear}
							data-testid={`${idPrefix}-filter-all`}
							className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							Сбросить
						</button>
					)}
				</div>
			)}
		</div>
	);
}

const STATUS_PRESETS: { label: string; value: ProcurementInquiryStatus }[] = [
	{ label: STATUS_LABELS.searching, value: "searching" },
	{ label: STATUS_LABELS.searching_completed, value: "searching_completed" },
	{ label: STATUS_LABELS.negotiating, value: "negotiating" },
	{ label: STATUS_LABELS.completed, value: "completed" },
];

const ROW_BTN =
	"flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ROW_BTN_ACTIVE = "font-medium text-highlight-foreground";
const SECTION_LABEL = "px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground";

interface ProcurementInquiriesFiltersPopoverProps {
	status: ProcurementInquiryStatus | undefined;
	onStatusChange: (status: ProcurementInquiryStatus | undefined) => void;
	deadline: DeadlineFilter;
	onDeadlineChange: (deadline: DeadlineFilter) => void;
	deadlineFrom?: string;
	deadlineTo?: string;
	onDeadlineRangeChange?: (from: string | undefined, to: string | undefined) => void;
	createdAtFrom?: string;
	createdAtTo?: string;
	onCreatedAtRangeChange?: (from: string | undefined, to: string | undefined) => void;
	companies?: CompanySummary[];
	selectedCompany?: string | undefined;
	onCompanySelect?: (company: string | undefined) => void;
	showCompanies?: boolean;
	triggerVariant?: "icon" | "row";
}

export function ProcurementInquiriesFiltersPopover({
	status,
	onStatusChange,
	deadline,
	onDeadlineChange,
	deadlineFrom,
	deadlineTo,
	onDeadlineRangeChange,
	createdAtFrom,
	createdAtTo,
	onCreatedAtRangeChange,
	companies,
	selectedCompany,
	onCompanySelect,
	showCompanies = false,
	triggerVariant = "icon",
}: ProcurementInquiriesFiltersPopoverProps) {
	const active =
		status !== undefined ||
		deadline !== "all" ||
		Boolean(deadlineFrom) ||
		Boolean(deadlineTo) ||
		Boolean(createdAtFrom) ||
		Boolean(createdAtTo) ||
		(showCompanies && selectedCompany !== undefined);
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
							<div data-testid="procurement-inquiries-filters-section-company" className="flex flex-col gap-0.5">
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
					<div data-testid="procurement-inquiries-filters-section-status" className="flex flex-col gap-0.5">
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
					{onDeadlineRangeChange && (
						<>
							<div className="my-1 h-px bg-border" />
							<div
								data-testid="procurement-inquiries-filters-section-deadline"
								className="flex flex-col gap-1.5 px-2 py-1.5"
							>
								<div className="text-xs font-medium text-muted-foreground">Дедлайн</div>
								<DateRangePicker
									idPrefix="deadline"
									from={deadlineFrom}
									to={deadlineTo}
									onChange={onDeadlineRangeChange}
									ariaLabelPrefix="Дедлайн"
									overduePreset={{
										active: deadline === "overdue",
										onSelect: () => {
											onDeadlineChange("overdue");
											onDeadlineRangeChange(undefined, undefined);
										},
									}}
									onClear={() => {
										onDeadlineChange("all");
										onDeadlineRangeChange(undefined, undefined);
									}}
								/>
							</div>
						</>
					)}
					{onCreatedAtRangeChange && (
						<>
							<div className="my-1 h-px bg-border" />
							<div
								data-testid="procurement-inquiries-filters-section-created-at"
								className="flex flex-col gap-1.5 px-2 py-1.5"
							>
								<div className="text-xs font-medium text-muted-foreground">Дата создания</div>
								<DateRangePicker
									idPrefix="created-at"
									from={createdAtFrom}
									to={createdAtTo}
									onChange={onCreatedAtRangeChange}
									ariaLabelPrefix="Дата создания"
									onClear={() => onCreatedAtRangeChange(undefined, undefined)}
								/>
							</div>
						</>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
