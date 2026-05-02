import { Archive, ArchiveRestore, EllipsisVertical } from "lucide-react";
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

interface TendersToolbarProps {
	status: TenderStatus | undefined;
	onStatusChange: (status: TenderStatus | undefined) => void;
	deadline: DeadlineFilter;
	onDeadlineChange: (deadline: DeadlineFilter) => void;
	deadlineFrom?: string;
	deadlineTo?: string;
	onDeadlineRangeChange?: (from: string | undefined, to: string | undefined) => void;
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
	deadlineFrom,
	deadlineTo,
	onDeadlineRangeChange,
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
			deadline={deadline}
			onDeadlineChange={onDeadlineChange}
			deadlineFrom={deadlineFrom}
			deadlineTo={deadlineTo}
			onDeadlineRangeChange={onDeadlineRangeChange}
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
		Boolean(deadlineFrom) ||
		Boolean(deadlineTo) ||
		(activeFolder !== undefined && activeFolder !== "archive") ||
		(showCompanies && selectedCompany !== undefined);

	return (
		<div className="flex flex-1 items-center justify-end gap-2">
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
				<Button type="button" size="sm" onClick={onCreateTender} className="btn-cta ml-2 rounded-full border-0">
					<span className="hidden sm:inline">Создать тендер</span>
					<span className="sm:hidden">Создать</span>
				</Button>
			)}
		</div>
	);
}
