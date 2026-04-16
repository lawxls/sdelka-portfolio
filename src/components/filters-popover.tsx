import { Check, CirclePlus, EllipsisVertical, ListFilter, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CompanySummary, DeviationFilter, FilterState, Folder, StatusFilter } from "@/data/types";
import { FOLDER_COLORS, FOLDER_NAME_MAX_LENGTH, STATUS_LABELS } from "@/data/types";
import { nextUnusedColor } from "@/data/use-folders";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { useMenuEditGuard } from "@/hooks/use-menu-edit-guard";
import { cn } from "@/lib/utils";

const DEVIATION_PRESETS: { label: string; value: DeviationFilter }[] = [
	{ label: "С переплатой", value: "overpaying" },
	{ label: "С экономией", value: "saving" },
];

const STATUS_PRESETS: { label: string; value: StatusFilter }[] = [
	{ label: STATUS_LABELS.awaiting_analytics, value: "awaiting_analytics" },
	{ label: STATUS_LABELS.searching, value: "searching" },
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

export function FiltersPopover({
	filters,
	onFiltersChange,
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
					<CategorySection
						folders={folders}
						folderCounts={folderCounts}
						foldersLoading={foldersLoading}
						activeFolder={activeFolder}
						onFolderSelect={onFolderSelect}
						onCreateFolder={onCreateFolder}
						onRenameFolder={onRenameFolder}
						onRecolorFolder={onRecolorFolder}
						onDeleteFolder={onDeleteFolder}
					/>
					<Divider />
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

function CategorySection({
	folders,
	folderCounts,
	foldersLoading,
	activeFolder,
	onFolderSelect,
	onCreateFolder,
	onRenameFolder,
	onRecolorFolder,
	onDeleteFolder,
}: {
	folders: Folder[];
	folderCounts: Record<string, number>;
	foldersLoading?: boolean;
	activeFolder: string | undefined;
	onFolderSelect: (folder: string | undefined) => void;
	onCreateFolder: (name: string) => void;
	onRenameFolder: (id: string, name: string) => void;
	onRecolorFolder: (id: string, color: string) => void;
	onDeleteFolder: (id: string) => void;
}) {
	const [isCreating, setIsCreating] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	function handleCreate(name: string) {
		onCreateFolder(name);
		setIsCreating(false);
	}

	function handleDelete(id: string) {
		if (activeFolder === id) onFolderSelect(undefined);
		onDeleteFolder(id);
	}

	return (
		<div data-testid="filters-section-category" className="flex flex-col gap-0.5">
			<div className="flex items-center justify-between">
				<div className={SECTION_LABEL}>Категория</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="ghost" size="icon-xs" onClick={() => setIsCreating(true)} aria-label="Новая категория">
							<CirclePlus className="size-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="right">Добавить категорию</TooltipContent>
				</Tooltip>
			</div>

			<button
				type="button"
				className={cn(ROW_BTN, activeFolder === undefined && ROW_BTN_ACTIVE)}
				onClick={() => onFolderSelect(undefined)}
			>
				<span>Все закупки</span>
				<span className="tabular-nums text-xs text-muted-foreground">{folderCounts.all ?? 0}</span>
			</button>
			<button
				type="button"
				className={cn(ROW_BTN, activeFolder === "none" && ROW_BTN_ACTIVE)}
				onClick={() => onFolderSelect("none")}
			>
				<span>Без категории</span>
				<span className="tabular-nums text-xs text-muted-foreground">{folderCounts.none ?? 0}</span>
			</button>

			{foldersLoading ? (
				<div className="space-y-1 px-2 pt-1" data-testid="filters-folder-skeletons">
					{["skel-a", "skel-b", "skel-c"].map((id) => (
						<div key={id} className="flex items-center gap-2 py-1">
							<Skeleton className="size-2.5 rounded-full" />
							<Skeleton className="h-4 flex-1" />
						</div>
					))}
				</div>
			) : (
				<>
					{folders.map((folder) =>
						editingId === folder.id ? (
							<InlineFolderRow
								key={folder.id}
								color={folder.color}
								defaultValue={folder.name}
								onSave={(name) => {
									onRenameFolder(folder.id, name);
									setEditingId(null);
								}}
								onCancel={() => setEditingId(null)}
							/>
						) : (
							<FolderRow
								key={folder.id}
								folder={folder}
								count={folderCounts[folder.id] ?? 0}
								active={activeFolder === folder.id}
								onClick={() => onFolderSelect(folder.id)}
								onRename={() => setEditingId(folder.id)}
								onRecolor={(color) => onRecolorFolder(folder.id, color)}
								onDelete={() => handleDelete(folder.id)}
							/>
						),
					)}
					{isCreating && (
						<InlineFolderRow
							color={nextUnusedColor(folders)}
							dotTestId="creating-folder-dot"
							onSave={handleCreate}
							onCancel={() => setIsCreating(false)}
						/>
					)}
				</>
			)}
		</div>
	);
}

function FolderRow({
	folder,
	count,
	active,
	onClick,
	onRename,
	onRecolor,
	onDelete,
}: {
	folder: Folder;
	count: number;
	active: boolean;
	onClick: () => void;
	onRename: () => void;
	onRecolor: (color: string) => void;
	onDelete: () => void;
}) {
	const [deleteOpen, setDeleteOpen] = useState(false);
	const { willEditRef, onCloseAutoFocus } = useMenuEditGuard();

	return (
		<div className="group relative">
			<button type="button" className={cn(ROW_BTN, "pr-12", active && ROW_BTN_ACTIVE)} onClick={onClick}>
				<span className="flex min-w-0 items-center gap-2">
					<span
						className="size-2.5 shrink-0 rounded-full"
						style={{ backgroundColor: `var(--folder-${folder.color})` }}
						aria-hidden="true"
						data-testid={`filters-folder-dot-${folder.id}`}
					/>
					<span className="truncate">{folder.name}</span>
				</span>
			</button>

			<span
				className={cn(
					"pointer-events-none absolute right-7 top-1/2 -translate-y-1/2",
					"tabular-nums text-xs text-muted-foreground",
					"group-hover:invisible group-focus-within:invisible",
				)}
				aria-hidden="true"
			>
				{count}
			</span>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className={cn(
							"absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5",
							"text-muted-foreground hover:text-foreground",
							"invisible group-hover:visible group-focus-within:visible",
						)}
						onClick={(e) => e.stopPropagation()}
						aria-label={`Меню категории ${folder.name}`}
					>
						<EllipsisVertical className="size-3.5" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" side="right" className="min-w-40" onCloseAutoFocus={onCloseAutoFocus}>
					<DropdownMenuItem
						onSelect={() => {
							willEditRef.current = true;
							onRename();
						}}
					>
						<Pencil className="size-3.5" />
						Переименовать
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<div className="px-1.5 py-1" data-testid={`filters-color-picker-${folder.id}`}>
						<div className="flex max-w-[92px] flex-wrap gap-1">
							{FOLDER_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									className="flex size-5 items-center justify-center rounded-full transition-transform hover:scale-110"
									style={{ backgroundColor: `var(--folder-${color})` }}
									onClick={() => onRecolor(color)}
									data-testid={`filters-color-dot-${color}`}
									aria-label={`Цвет ${color}`}
								>
									{folder.color === color && <Check className="size-3 text-white" data-testid="filters-color-check" />}
								</button>
							))}
						</div>
					</div>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
						<Trash2 className="size-3.5" />
						Удалить
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
						<AlertDialogDescription>
							Категория «{folder.name}» будет удалена. Закупки из этой категории не будут удалены.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								onDelete();
								setDeleteOpen(false);
							}}
						>
							Удалить
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function InlineFolderRow({
	color,
	defaultValue,
	dotTestId,
	onSave,
	onCancel,
}: {
	color: string;
	defaultValue?: string;
	dotTestId?: string;
	onSave: (value: string) => void;
	onCancel: () => void;
}) {
	const { inputRef, handleKeyDown, handleBlur } = useInlineEdit({
		onSave,
		onCancel,
		selectOnMount: !!defaultValue,
		deferFocus: !!defaultValue,
	});

	return (
		<div className="flex items-center gap-2 rounded-md px-2 py-1.5">
			<span
				className="size-2.5 shrink-0 rounded-full"
				style={{ backgroundColor: `var(--folder-${color})` }}
				aria-hidden="true"
				data-testid={dotTestId}
			/>
			<input
				ref={inputRef}
				type="text"
				className="h-5 flex-1 bg-transparent text-sm outline-none"
				defaultValue={defaultValue}
				maxLength={FOLDER_NAME_MAX_LENGTH}
				aria-label="Название категории"
				spellCheck={false}
				autoComplete="off"
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
			/>
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
