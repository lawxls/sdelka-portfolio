import { Archive, ArchiveRestore, EllipsisVertical, Plus } from "lucide-react";
import { useState } from "react";
import { CategoriesPopover } from "@/components/categories-popover";
import { TendersFiltersPopover } from "@/components/tenders-filters-popover";
import { ToolbarSearch } from "@/components/toolbar-search";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CompanySummary, Folder, TenderStatus } from "@/data/types";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { OVERFLOW_ROW_BTN } from "@/lib/class-presets";
import { cn } from "@/lib/utils";

export type DeadlineFilter = "all" | "overdue" | "soon";

const DEADLINE_PRESETS: { label: string; value: DeadlineFilter }[] = [
	{ label: "Все", value: "all" },
	{ label: "Просрочены", value: "overdue" },
	{ label: "Ближайшие 7 дней", value: "soon" },
];

interface TendersToolbarProps {
	status: TenderStatus | undefined;
	onStatusChange: (status: TenderStatus | undefined) => void;
	deadline: DeadlineFilter;
	onDeadlineChange: (deadline: DeadlineFilter) => void;
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
	isArchiveView?: boolean;
	onArchiveToggle?: () => void;
	onCreateTender?: () => void;
}

export function TendersToolbar({
	status,
	onStatusChange,
	deadline,
	onDeadlineChange,
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
	isArchiveView = false,
	onArchiveToggle,
	onCreateTender,
}: TendersToolbarProps) {
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
					ariaLabel="Поиск тендеров"
					expanded={userExpanded}
					onExpandedChange={setUserExpanded}
				/>
			</div>
		);
	}

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
		<TendersFiltersPopover
			status={status}
			onStatusChange={onStatusChange}
			companies={companies}
			selectedCompany={selectedCompany}
			onCompanySelect={onCompanySelect}
			showCompanies={showCompanies}
			triggerVariant={variant}
		/>
	);

	const hasActiveFilter =
		status !== undefined ||
		deadline !== "all" ||
		(activeFolder !== undefined && activeFolder !== "archive") ||
		(showCompanies && selectedCompany !== undefined);

	return (
		<div className="flex flex-1 items-center justify-end gap-2">
			<fieldset className="hidden items-center gap-1 border-0 p-0 md:flex" aria-label="Фильтр по дедлайну">
				{DEADLINE_PRESETS.map((preset) => (
					<button
						key={preset.value}
						type="button"
						aria-pressed={deadline === preset.value}
						onClick={() => onDeadlineChange(preset.value)}
						className={cn(
							"rounded-full border border-transparent px-3 py-1 text-xs transition-colors",
							"hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							deadline === preset.value
								? "border-border bg-muted font-medium text-highlight-foreground"
								: "text-muted-foreground",
						)}
						data-testid={`deadline-filter-${preset.value}`}
					>
						{preset.label}
					</button>
				))}
			</fieldset>

			<ToolbarSearch
				value={current}
				onChange={setDebounced}
				ariaLabel="Поиск тендеров"
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
					<PopoverContent align="end" className="w-56 p-1">
						<div className="flex flex-col gap-0.5">
							<div className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">Дедлайн</div>
							{DEADLINE_PRESETS.map((preset) => (
								<button
									key={preset.value}
									type="button"
									aria-pressed={deadline === preset.value}
									onClick={() => onDeadlineChange(preset.value)}
									className={cn(OVERFLOW_ROW_BTN, deadline === preset.value && "font-medium text-highlight-foreground")}
									data-testid={`deadline-filter-mobile-${preset.value}`}
								>
									{preset.label}
								</button>
							))}
							<div className="my-1 h-px bg-border" />
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

			{onCreateTender && (
				<Button type="button" size="sm" onClick={onCreateTender} className="btn-cta rounded-full border-0">
					<Plus data-icon="inline-start" aria-hidden="true" />
					<span className="hidden sm:inline">Создать тендер</span>
					<span className="sm:hidden">Создать</span>
				</Button>
			)}
		</div>
	);
}
