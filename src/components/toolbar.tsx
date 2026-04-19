import { Archive, ArrowDown, ArrowUp, ArrowUpDown, Download, Plus } from "lucide-react";
import { FiltersPopover } from "@/components/filters-popover";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CompanySummary, FilterState, Folder, SortField, SortState } from "@/data/types";
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
	onCreateFolder: (name: string) => void;
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
	return (
		<div className="flex flex-1 items-center justify-end gap-2">
			<Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Сортировка"
								className="relative md:hidden"
							>
								<ArrowUpDown aria-hidden="true" />
								{sort && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />}
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Сортировка</TooltipContent>
				</Tooltip>
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

			<FiltersPopover
				filters={filters}
				onFiltersChange={onFiltersChange}
				folders={folders}
				folderCounts={folderCounts}
				foldersLoading={foldersLoading}
				activeFolder={activeFolder}
				onFolderSelect={onFolderSelect}
				onCreateFolder={onCreateFolder}
				onRenameFolder={onRenameFolder}
				onRecolorFolder={onRecolorFolder}
				onDeleteFolder={onDeleteFolder}
				companies={companies}
				selectedCompany={selectedCompany}
				onCompanySelect={onCompanySelect}
				showCompanies={showCompanies}
			/>

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

			<Tooltip>
				<TooltipTrigger asChild>
					<Button type="button" variant="ghost" size="icon-sm" aria-label="Скачать таблицу" onClick={onExport}>
						<Download aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Скачать таблицу</TooltipContent>
			</Tooltip>

			<Button
				type="button"
				size="sm"
				onClick={onAddPositions}
				className="bg-status-highlight hover:bg-status-highlight/80"
			>
				<Plus data-icon="inline-start" aria-hidden="true" />
				<span className="hidden sm:inline">Добавить позицию</span>
				<span className="sm:hidden">Добавить</span>
			</Button>
		</div>
	);
}
