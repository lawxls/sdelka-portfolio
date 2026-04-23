import {
	Archive,
	ArchiveRestore,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Download,
	EllipsisVertical,
	Plus,
} from "lucide-react";
import { useState } from "react";
import { CategoriesPopover } from "@/components/categories-popover";
import { FiltersPopover } from "@/components/filters-popover";
import { ToolbarSearch } from "@/components/toolbar-search";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CompanySummary, FilterState, Folder, SortField, SortState } from "@/data/types";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { OVERFLOW_ROW_BTN } from "@/lib/class-presets";
import { cn } from "@/lib/utils";

interface ToolbarProps {
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
	sort: SortState | null;
	onSort: (field: SortField) => void;
	onAddPositions?: () => void;
	onExport?: () => void;
	isArchiveView?: boolean;
	onArchiveToggle?: () => void;
	folders: Folder[];
	folderCounts: Record<string, number>;
	foldersLoading?: boolean;
	activeFolder: string | undefined;
	onFolderSelect: (folder: string | undefined) => void;
	onCreateFolder: (name: string, color: string) => void;
	onRenameFolder: (id: string, name: string) => void;
	onRecolorFolder: (id: string, color: string) => void;
	onDeleteFolder: (id: string) => void;
	companies?: CompanySummary[];
	selectedCompany?: string | undefined;
	onCompanySelect?: (company: string | undefined) => void;
	showCompanies?: boolean;
}

const SORT_FIELD_PRESETS: { label: string; field: SortField }[] = [
	{ label: "Объем в\u00A0₽", field: "annualCost" },
	{ label: "Текущее ТСО", field: "currentPrice" },
	{ label: "Лучшее ТСО", field: "bestPrice" },
	{ label: "Среднее ТСО", field: "averagePrice" },
	{ label: "Переплата", field: "overpayment" },
	{ label: "Отклонение", field: "deviation" },
];

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FILTER_BTN_ACTIVE = "font-medium text-highlight-foreground";

export function Toolbar({
	filters,
	onFiltersChange,
	sort,
	onSort,
	onAddPositions,
	onExport,
	isArchiveView = false,
	onArchiveToggle,
	folders,
	folderCounts,
	foldersLoading,
	activeFolder,
	onFolderSelect,
	onCreateFolder,
	onRenameFolder,
	onRecolorFolder,
	onDeleteFolder,
	companies,
	selectedCompany,
	onCompanySelect,
	showCompanies,
}: ToolbarProps) {
	const isMobile = useIsMobile();
	const { current, setDebounced } = useDebouncedSearchParam("q", 300);
	const [userExpanded, setUserExpanded] = useState(false);
	const searchExpanded = current.length > 0 || userExpanded;

	if (isMobile && searchExpanded) {
		return (
			<div className="flex flex-1 items-center">
				<ToolbarSearch
					value={current}
					onChange={setDebounced}
					ariaLabel="Поиск позиций"
					expanded={userExpanded}
					onExpandedChange={setUserExpanded}
				/>
			</div>
		);
	}

	const renderSortPopover = (variant: "icon" | "row") => (
		<Popover>
			{variant === "row" ? (
				<PopoverTrigger asChild>
					<button type="button" className={cn(OVERFLOW_ROW_BTN, "relative")}>
						<ArrowUpDown className="size-4" aria-hidden="true" />
						<span>Сортировка</span>
						{sort && <span className="ml-auto size-2 rounded-full bg-primary" aria-hidden="true" />}
					</button>
				</PopoverTrigger>
			) : (
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button type="button" variant="ghost" size="icon-sm" aria-label="Сортировка" className="relative">
								<ArrowUpDown aria-hidden="true" />
								{sort && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />}
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Сортировка</TooltipContent>
				</Tooltip>
			)}
			<PopoverContent align="end" className="w-56">
				<div className="flex flex-col gap-1">
					{SORT_FIELD_PRESETS.map((preset) => {
						const isActive = sort?.field === preset.field;
						return (
							<button
								key={preset.field}
								type="button"
								className={`${FILTER_BTN} ${isActive ? FILTER_BTN_ACTIVE : ""}`}
								onClick={() => onSort(preset.field)}
							>
								<span className="flex items-center justify-between">
									{preset.label}
									{isActive &&
										(sort.direction === "asc" ? (
											<ArrowUp className="size-3.5" aria-hidden="true" />
										) : (
											<ArrowDown className="size-3.5" aria-hidden="true" />
										))}
								</span>
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);

	const renderCategoriesPopover = (variant: "icon" | "row") => (
		<CategoriesPopover
			folders={folders}
			folderCounts={folderCounts}
			foldersLoading={foldersLoading}
			activeFolder={activeFolder}
			onFolderSelect={onFolderSelect}
			onCreateFolder={onCreateFolder}
			onRenameFolder={onRenameFolder}
			onRecolorFolder={onRecolorFolder}
			onDeleteFolder={onDeleteFolder}
			triggerVariant={variant}
		/>
	);

	const renderFiltersPopover = (variant: "icon" | "row") => (
		<FiltersPopover
			filters={filters}
			onFiltersChange={onFiltersChange}
			companies={companies}
			selectedCompany={selectedCompany}
			onCompanySelect={onCompanySelect}
			showCompanies={showCompanies}
			triggerVariant={variant}
		/>
	);

	const hasActiveFilter =
		!!sort ||
		filters.deviation !== "all" ||
		filters.status !== "all" ||
		(activeFolder !== undefined && activeFolder !== "archive");

	return (
		<div className="flex flex-1 items-center justify-end gap-2">
			<ToolbarSearch
				value={current}
				onChange={setDebounced}
				ariaLabel="Поиск позиций"
				expanded={userExpanded}
				onExpandedChange={setUserExpanded}
			/>

			{isMobile ? (
				<Popover>
					<Tooltip>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>
								<Button type="button" variant="ghost" size="icon-sm" aria-label="Ещё" className="relative">
									<EllipsisVertical aria-hidden="true" />
									{hasActiveFilter && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />}
								</Button>
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent>Ещё</TooltipContent>
					</Tooltip>
					<PopoverContent align="end" className="w-52 p-1">
						<div className="flex flex-col gap-0.5">
							{renderSortPopover("row")}
							{renderCategoriesPopover("row")}
							{renderFiltersPopover("row")}
							{onArchiveToggle && (
								<button
									type="button"
									aria-label={isArchiveView ? "Выйти из архива" : "Архив"}
									aria-pressed={isArchiveView}
									onClick={onArchiveToggle}
									className={cn(OVERFLOW_ROW_BTN, isArchiveView && "font-medium text-highlight-foreground")}
								>
									{isArchiveView ? (
										<ArchiveRestore className="size-4" aria-hidden="true" />
									) : (
										<Archive className="size-4" aria-hidden="true" />
									)}
									<span>{isArchiveView ? "Выйти из архива" : "Архив"}</span>
								</button>
							)}
						</div>
					</PopoverContent>
				</Popover>
			) : (
				<div className="flex items-center gap-2">
					{renderCategoriesPopover("icon")}
					{renderFiltersPopover("icon")}
					{onArchiveToggle && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Архив"
									aria-pressed={isArchiveView}
									onClick={onArchiveToggle}
									className={cn(isArchiveView && "bg-muted text-highlight-foreground")}
								>
									<Archive aria-hidden="true" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Архив</TooltipContent>
						</Tooltip>
					)}
				</div>
			)}

			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Скачать таблицу"
						onClick={onExport}
						className="hidden md:inline-flex"
					>
						<Download aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Скачать таблицу</TooltipContent>
			</Tooltip>

			<Button
				type="button"
				size="sm"
				onClick={onAddPositions}
				className="rounded-lg bg-status-highlight hover:bg-status-highlight/80"
			>
				<Plus data-icon="inline-start" aria-hidden="true" />
				<span className="hidden sm:inline">Добавить позиции</span>
				<span className="sm:hidden">Добавить</span>
			</Button>
		</div>
	);
}
