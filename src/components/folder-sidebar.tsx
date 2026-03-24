import { useDroppable } from "@dnd-kit/core";
import {
	Check,
	ChevronLeft,
	EllipsisVertical,
	FolderPlus,
	Inbox,
	Layers,
	PanelLeft,
	Pencil,
	Trash2,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { Folder } from "@/data/types";
import { FOLDER_COLORS, FOLDER_NAME_MAX_LENGTH } from "@/data/types";
import { nextUnusedColor } from "@/data/use-folders";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { useMenuEditGuard } from "@/hooks/use-menu-edit-guard";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

export const LS_SIDEBAR_KEY = "sidebar-open";
export const DESKTOP_QUERY = "(min-width: 1024px)";

function navItemClassName(active: boolean, isOver = false, extra?: string) {
	return cn(
		"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
		extra,
		isOver
			? "bg-sidebar-accent ring-2 ring-sidebar-accent-foreground/20"
			: active
				? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
				: "text-sidebar-foreground hover:bg-sidebar-accent/50",
	);
}

function useIsDesktop(): boolean {
	const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

	useMountEffect(() => {
		const mql = window.matchMedia(DESKTOP_QUERY);
		const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	});

	return isDesktop;
}

export interface FolderSidebarProps {
	folders: Folder[];
	counts: Record<string, number>;
	activeFolder: string | undefined;
	isLoading?: boolean;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onFolderSelect: (folder: string | undefined) => void;
	onCreateFolder: (name: string) => void;
	onRenameFolder: (id: string, name: string) => void;
	onRecolorFolder: (id: string, color: string) => void;
	onDeleteFolder: (id: string) => void;
}

export function FolderSidebar({
	folders,
	counts,
	activeFolder,
	isLoading,
	open,
	onOpenChange,
	onFolderSelect,
	onCreateFolder,
	onRenameFolder,
	onRecolorFolder,
	onDeleteFolder,
}: FolderSidebarProps) {
	const isDesktop = useIsDesktop();
	const [isCreating, setIsCreating] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	function toggle() {
		const next = !open;
		if (window.matchMedia(DESKTOP_QUERY).matches) {
			localStorage.setItem(LS_SIDEBAR_KEY, String(next));
		}
		onOpenChange(next);
	}

	function selectFolder(folder: string | undefined) {
		onFolderSelect(folder);
		if (!isDesktop) onOpenChange(false);
	}

	function handleCreate(name: string) {
		onCreateFolder(name);
		setIsCreating(false);
	}

	function handleDelete(id: string) {
		if (activeFolder === id) {
			onFolderSelect(undefined);
		}
		onDeleteFolder(id);
	}

	if (!open) {
		return (
			<div className="hidden shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar p-2 md:flex">
				<Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Открыть боковую панель">
					<PanelLeft className="size-4" />
				</Button>
			</div>
		);
	}

	const sidebarContent = (
		<aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground" data-testid="sidebar">
			{/* Header */}
			<div className="flex shrink-0 items-center justify-between border-b border-sidebar-border px-3 py-2">
				<h2 className="text-sm font-semibold">Разделы</h2>
				<Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Закрыть боковую панель">
					<ChevronLeft className="size-4" />
				</Button>
			</div>

			{/* Scrollable nav */}
			<nav className="flex-1 overflow-y-auto p-2" aria-label="Разделы">
				<div className="space-y-0.5">
					<NavItem
						icon={<Layers className="size-4" />}
						label="Все закупки"
						count={counts.all ?? 0}
						active={activeFolder === undefined}
						onClick={() => selectFolder(undefined)}
					/>
					<DroppableNavItem
						droppableId="none"
						icon={<Inbox className="size-4" />}
						label="Без раздела"
						count={counts.none ?? 0}
						active={activeFolder === "none"}
						onClick={() => selectFolder("none")}
					/>
				</div>

				{isLoading ? (
					<>
						<div className="my-2 border-t border-sidebar-border" />
						<div className="space-y-1 px-2" data-testid="folder-skeletons">
							{["skel-a", "skel-b", "skel-c"].map((id) => (
								<div key={id} className="flex items-center gap-2 py-1.5">
									<Skeleton className="size-2.5 rounded-full" />
									<Skeleton className="h-4 flex-1" />
								</div>
							))}
						</div>
					</>
				) : (
					<>
						{(folders.length > 0 || isCreating) && <div className="my-2 border-t border-sidebar-border" />}

						<div className="space-y-0.5">
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
									<FolderNavItem
										key={folder.id}
										folder={folder}
										count={counts[folder.id] ?? 0}
										active={activeFolder === folder.id}
										onClick={() => selectFolder(folder.id)}
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
						</div>
					</>
				)}
			</nav>

			{/* Footer */}
			<div className="shrink-0 border-t border-sidebar-border p-2">
				<Button
					variant="ghost"
					size="sm"
					className="w-full justify-start gap-2 text-muted-foreground"
					onClick={() => setIsCreating(true)}
				>
					<FolderPlus className="size-4" />
					Новый раздел
				</Button>
			</div>
		</aside>
	);

	if (isDesktop) {
		return <div className="shrink-0 border-r border-sidebar-border">{sidebarContent}</div>;
	}

	// Mobile: fixed overlay
	return (
		<div className="fixed inset-0 z-40" data-testid="sidebar-overlay">
			<div className="absolute inset-0 bg-black/50" onClick={toggle} aria-hidden="true" />
			<div className="relative z-10 h-full w-64 shadow-lg">{sidebarContent}</div>
		</div>
	);
}

function NavItem({
	icon,
	label,
	count,
	active,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	count: number;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button type="button" className={navItemClassName(active)} onClick={onClick}>
			<span className="shrink-0" aria-hidden="true">
				{icon}
			</span>
			<span className="flex-1 text-left">{label}</span>
			<span className="tabular-nums text-xs text-muted-foreground">{count}</span>
		</button>
	);
}

function DroppableNavItem({
	droppableId,
	icon,
	label,
	count,
	active,
	onClick,
}: {
	droppableId: string;
	icon: React.ReactNode;
	label: string;
	count: number;
	active: boolean;
	onClick: () => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: droppableId });
	return (
		<div ref={setNodeRef} data-testid={`droppable-${droppableId}`}>
			<button type="button" className={navItemClassName(active, isOver)} onClick={onClick}>
				<span className="shrink-0" aria-hidden="true">
					{icon}
				</span>
				<span className="flex-1 text-left">{label}</span>
				<span className="tabular-nums text-xs text-muted-foreground">{count}</span>
			</button>
		</div>
	);
}

function FolderNavItem({
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
	const { setNodeRef, isOver } = useDroppable({ id: `folder-drop-${folder.id}` });

	return (
		<div className="group relative" ref={setNodeRef} data-testid={`droppable-${folder.id}`}>
			<button type="button" className={navItemClassName(active, isOver, "pr-12 lg:pr-7")} onClick={onClick}>
				<span
					className="size-2.5 shrink-0 rounded-full"
					style={{ backgroundColor: `var(--folder-${folder.color})` }}
					aria-hidden="true"
					data-testid={`folder-dot-${folder.id}`}
				/>
				<span className="flex-1 truncate text-left">{folder.name}</span>
			</button>

			<span
				className={cn(
					"pointer-events-none absolute top-1/2 -translate-y-1/2",
					"right-7 tabular-nums text-xs text-muted-foreground lg:right-1",
					"lg:group-hover:invisible lg:group-focus-within:invisible",
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
							"lg:invisible lg:group-hover:visible lg:group-focus-within:visible",
						)}
						onClick={(e) => e.stopPropagation()}
						aria-label={`Меню раздела ${folder.name}`}
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
					<div className="px-1.5 py-1" data-testid="color-picker">
						<div className="flex flex-wrap gap-1 max-w-[92px]">
							{FOLDER_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									className="flex size-5 items-center justify-center rounded-full transition-transform hover:scale-110"
									style={{ backgroundColor: `var(--folder-${color})` }}
									onClick={() => onRecolor(color)}
									data-testid={`color-dot-${color}`}
									aria-label={`Цвет ${color}`}
								>
									{folder.color === color && <Check className="size-3 text-white" data-testid="color-check" />}
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
						<AlertDialogTitle>Удалить раздел?</AlertDialogTitle>
						<AlertDialogDescription>
							Раздел «{folder.name}» будет удалён. Закупки из этого раздела не будут удалены.
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
				aria-label="Название раздела"
				spellCheck={false}
				autoComplete="off"
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
			/>
		</div>
	);
}
