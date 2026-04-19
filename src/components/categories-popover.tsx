import { Check, EllipsisVertical, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
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
import { CreateFolderRow } from "@/components/ui/folder-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Folder } from "@/data/types";
import { FOLDER_COLORS, FOLDER_NAME_MAX_LENGTH } from "@/data/types";
import { nextUnusedColor } from "@/data/use-folders";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { useMenuEditGuard } from "@/hooks/use-menu-edit-guard";
import { cn } from "@/lib/utils";

const ROW_BTN =
	"flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ROW_BTN_ACTIVE = "font-medium text-highlight-foreground";
const SECTION_LABEL = "px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground";

interface CategoriesPopoverProps {
	folders: Folder[];
	folderCounts: Record<string, number>;
	foldersLoading?: boolean;
	activeFolder: string | undefined;
	onFolderSelect: (folder: string | undefined) => void;
	onCreateFolder: (name: string, color: string) => void;
	onRenameFolder: (id: string, name: string) => void;
	onRecolorFolder: (id: string, color: string) => void;
	onDeleteFolder: (id: string) => void;
}

export function CategoriesPopover({
	folders,
	folderCounts,
	foldersLoading,
	activeFolder,
	onFolderSelect,
	onCreateFolder,
	onRenameFolder,
	onRecolorFolder,
	onDeleteFolder,
}: CategoriesPopoverProps) {
	const hasActive = activeFolder !== undefined && activeFolder !== "archive";
	return (
		<Popover>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<Button type="button" variant="ghost" size="icon-sm" aria-label="Категории" className="relative">
							<FolderOpen aria-hidden="true" />
							{hasActive && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />}
						</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>Категории</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" className="w-72 p-0">
				<div className="flex max-h-[70vh] flex-col overflow-y-auto p-1.5">
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
				</div>
			</PopoverContent>
		</Popover>
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
	onCreateFolder: (name: string, color: string) => void;
	onRenameFolder: (id: string, name: string) => void;
	onRecolorFolder: (id: string, color: string) => void;
	onDeleteFolder: (id: string) => void;
}) {
	const [isCreating, setIsCreating] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	function handleCreate(name: string, color: string) {
		onCreateFolder(name, color);
		setIsCreating(false);
	}

	function handleDelete(id: string) {
		if (activeFolder === id) onFolderSelect(undefined);
		onDeleteFolder(id);
	}

	return (
		<div data-testid="categories-section" className="flex flex-col gap-0.5">
			<div className={SECTION_LABEL}>Категория</div>

			<div className="relative">
				<button
					type="button"
					className={cn(ROW_BTN, "pr-8", activeFolder === "none" && ROW_BTN_ACTIVE)}
					onClick={() => onFolderSelect(activeFolder === "none" ? undefined : "none")}
				>
					<span className="flex min-w-0 items-center gap-2">
						<span
							className="size-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground"
							aria-hidden="true"
						/>
						<span className="truncate">Без категории</span>
					</span>
				</button>
				<span
					className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 tabular-nums text-xs text-muted-foreground"
					aria-hidden="true"
				>
					{folderCounts.none ?? 0}
				</span>
			</div>

			{foldersLoading ? (
				<div className="space-y-1 px-2 pt-1" data-testid="categories-folder-skeletons">
					{["skel-a", "skel-b", "skel-c"].map((id) => (
						<div key={id} className="flex items-center gap-2 py-1">
							<Skeleton className="size-2.5 rounded-full" />
							<Skeleton className="h-4 flex-1" />
						</div>
					))}
				</div>
			) : (
				folders.map((folder) =>
					editingId === folder.id ? (
						<InlineRenameRow
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
							onClick={() => onFolderSelect(activeFolder === folder.id ? undefined : folder.id)}
							onRename={() => setEditingId(folder.id)}
							onRecolor={(color) => onRecolorFolder(folder.id, color)}
							onDelete={() => handleDelete(folder.id)}
						/>
					),
				)
			)}

			<div className="my-1 border-t border-border" />
			{isCreating ? (
				<CreateFolderRow
					defaultColor={nextUnusedColor(folders)}
					onSave={handleCreate}
					onCancel={() => setIsCreating(false)}
				/>
			) : (
				<button
					type="button"
					onClick={() => setIsCreating(true)}
					className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-accent focus-visible:bg-accent focus-visible:outline-hidden"
				>
					<Plus className="size-3.5" aria-hidden="true" />
					<span>Создать категорию</span>
				</button>
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
			<button type="button" className={cn(ROW_BTN, "pr-8", active && ROW_BTN_ACTIVE)} onClick={onClick}>
				<span className="flex min-w-0 items-center gap-2">
					<span
						className="size-2.5 shrink-0 rounded-full"
						style={{ backgroundColor: `var(--folder-${folder.color})` }}
						aria-hidden="true"
						data-testid={`categories-folder-dot-${folder.id}`}
					/>
					<span className="truncate">{folder.name}</span>
				</span>
			</button>

			<span
				className={cn(
					"pointer-events-none absolute right-2 top-1/2 -translate-y-1/2",
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
					<div className="px-1.5 py-1" data-testid={`categories-color-picker-${folder.id}`}>
						<div className="flex max-w-[92px] flex-wrap gap-1">
							{FOLDER_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									className="flex size-5 items-center justify-center rounded-full transition-transform hover:scale-110"
									style={{ backgroundColor: `var(--folder-${color})` }}
									onClick={() => onRecolor(color)}
									data-testid={`categories-color-dot-${color}`}
									aria-label={`Цвет ${color}`}
								>
									{folder.color === color && (
										<Check className="size-3 text-white" data-testid="categories-color-check" />
									)}
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

function InlineRenameRow({
	color,
	defaultValue,
	onSave,
	onCancel,
}: {
	color: string;
	defaultValue: string;
	onSave: (value: string) => void;
	onCancel: () => void;
}) {
	const { inputRef, handleKeyDown, handleBlur } = useInlineEdit({
		onSave,
		onCancel,
		selectOnMount: true,
		deferFocus: true,
	});

	return (
		<div className="flex items-center gap-2 rounded-md px-2 py-1.5">
			<span
				className="size-2.5 shrink-0 rounded-full"
				style={{ backgroundColor: `var(--folder-${color})` }}
				aria-hidden="true"
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
