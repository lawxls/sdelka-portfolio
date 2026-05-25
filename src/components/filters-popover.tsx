import { ListFilter, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProcurementInquiry } from "@/data/domains/procurement-inquiries";
import type { CompanySummary, DeviationFilter, FilterState, StatusFilter } from "@/data/types";
import { STATUS_LABELS } from "@/data/types";
import { OVERFLOW_ROW_BTN } from "@/lib/class-presets";
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
	{ label: STATUS_LABELS.ready_for_analytics, value: "ready_for_analytics" },
];

const ROW_BTN =
	"flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ROW_BTN_ACTIVE = "font-medium text-highlight-foreground";
const SECTION_LABEL = "px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground";

function hasActiveFilter(filters: FilterState, selectedProcurementInquiry?: string): boolean {
	return filters.deviation !== "all" || filters.status !== "all" || Boolean(selectedProcurementInquiry);
}

interface FiltersPopoverProps {
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
	companies?: CompanySummary[];
	selectedCompany?: string | undefined;
	onCompanySelect?: (company: string | undefined) => void;
	showCompanies?: boolean;
	procurementInquiries?: ProcurementInquiry[];
	selectedProcurementInquiry?: string | undefined;
	onProcurementInquirySelect?: (procurementInquiryId: string | undefined) => void;
	triggerVariant?: "icon" | "row";
}

export function FiltersPopover({
	filters,
	onFiltersChange,
	companies,
	selectedCompany,
	onCompanySelect,
	showCompanies = false,
	procurementInquiries,
	selectedProcurementInquiry,
	onProcurementInquirySelect,
	triggerVariant = "icon",
}: FiltersPopoverProps) {
	const active = hasActiveFilter(filters, selectedProcurementInquiry);
	const showProcurementInquiries = !!onProcurementInquirySelect && (procurementInquiries?.length ?? 0) > 0;
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
			<PopoverContent align="end" className="w-72 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
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
					{showProcurementInquiries && onProcurementInquirySelect && (
						<>
							<ProcurementInquirySection
								procurementInquiries={procurementInquiries ?? []}
								selectedProcurementInquiry={selectedProcurementInquiry}
								onProcurementInquirySelect={onProcurementInquirySelect}
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

function ProcurementInquirySection({
	procurementInquiries,
	selectedProcurementInquiry,
	onProcurementInquirySelect,
}: {
	procurementInquiries: ProcurementInquiry[];
	selectedProcurementInquiry: string | undefined;
	onProcurementInquirySelect: (procurementInquiryId: string | undefined) => void;
}) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return procurementInquiries;
		return procurementInquiries.filter((t) => t.name.toLowerCase().includes(q));
	}, [procurementInquiries, query]);
	const selected = procurementInquiries.find((t) => t.id === selectedProcurementInquiry);
	return (
		<div data-testid="filters-section-procurement-inquiry" className="flex flex-col gap-1">
			<div className={SECTION_LABEL}>Запрос</div>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverAnchor className="px-1">
					{selected ? (
						<div className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs">
							<Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
							<span className="inline-flex h-6 min-w-0 items-stretch overflow-hidden rounded-full bg-muted text-xs">
								<button
									type="button"
									onClick={() => setOpen(true)}
									aria-label={`Запрос: ${selected.name}. Открыть список`}
									className="min-w-0 truncate py-0.5 pr-1 pl-2 transition-colors hover:bg-muted-foreground/10 focus-visible:bg-muted-foreground/10 focus-visible:outline-none"
								>
									{selected.name}
								</button>
								<button
									type="button"
									onClick={() => {
										onProcurementInquirySelect(undefined);
										setQuery("");
									}}
									aria-label={`Снять фильтр запроса ${selected.name}`}
									className="flex shrink-0 items-center justify-center px-1 text-muted-foreground transition-colors hover:bg-muted-foreground/10 hover:text-foreground focus-visible:bg-muted-foreground/10 focus-visible:outline-none"
								>
									<X aria-hidden="true" className="size-3" />
								</button>
							</span>
						</div>
					) : (
						<div className="relative">
							<Search
								aria-hidden="true"
								className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								value={query}
								onChange={(e) => {
									setQuery(e.target.value);
									setOpen(true);
								}}
								onFocus={() => setOpen(true)}
								onClick={() => setOpen(true)}
								placeholder="Поиск по названию"
								aria-label="Поиск по запросам"
								className="h-10 pl-9 text-sm"
							/>
						</div>
					)}
				</PopoverAnchor>
				<PopoverContent
					align="start"
					side="left"
					sideOffset={16}
					className="w-64 max-h-[60vh] overflow-y-auto p-1"
					onOpenAutoFocus={(e) => e.preventDefault()}
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					<div className="flex flex-col gap-0.5">
						{filtered.length === 0 ? (
							<div className="px-2 py-2 text-xs text-muted-foreground">Ничего не найдено</div>
						) : (
							filtered.map((procurementInquiry) => {
								const isActive = selectedProcurementInquiry === procurementInquiry.id;
								return (
									<button
										key={procurementInquiry.id}
										type="button"
										className={cn(ROW_BTN, isActive && ROW_BTN_ACTIVE)}
										onClick={() => {
											onProcurementInquirySelect(isActive ? undefined : procurementInquiry.id);
											setOpen(false);
										}}
									>
										<span className="min-w-0 flex-1 truncate text-left text-sm">{procurementInquiry.name}</span>
									</button>
								);
							})
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
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
