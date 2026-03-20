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
import { useRef, useState } from "react";
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
import type { Folder } from "@/data/types";
import { FOLDER_COLORS } from "@/data/types";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

const LS_SIDEBAR_KEY = "sidebar-open";
const DESKTOP_QUERY = "(min-width: 1024px)";

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
	onFolderSelect: (folder: string | undefined) => void;
	onCreateFolder: (name: string) => Folder | null;
	onRenameFolder: (id: string, name: string) => boolean;
	onRecolorFolder: (id: string, color: string) => void;
	onDeleteFolder: (id: string) => void;
}

export function FolderSidebar({
	folders,
	counts,
	activeFolder,
	onFolderSelect,
	onCreateFolder,
	onRenameFolder,
	onRecolorFolder,
	onDeleteFolder,
}: FolderSidebarProps) {
	const isDesktop = useIsDesktop();
	const [isCreating, setIsCreating] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	const [open, setOpen] = useState(() => {
		if (!window.matchMedia(DESKTOP_QUERY).matches) return false;
		return localStorage.getItem(LS_SIDEBAR_KEY) !== "false";
	});

	function toggle() {
		setOpen((prev) => {
			const next = !prev;
			if (window.matchMedia(DESKTOP_QUERY).matches) {
				localStorage.setItem(LS_SIDEBAR_KEY, String(next));
			}
			return next;
		});
	}

	function selectFolder(folder: string | undefined) {
		onFolderSelect(folder);
		if (!isDesktop) setOpen(false);
	}

	function handleCreate(name: string) {
		const trimmed = name.trim();
		if (!trimmed) {
			setIsCreating(false);
			return;
		}
		const created = onCreateFolder(trimmed);
		setIsCreating(false);
		if (created) {
			onFolderSelect(created.id);
		}
	}

	function handleDelete(id: string) {
		if (activeFolder === id) {
			onFolderSelect(undefined);
		}
		onDeleteFolder(id);
	}

	if (!open) {
		return (
			<div className="flex shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar p-2">
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
				<h2 className="text-sm font-semibold">Папки</h2>
				<Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Закрыть боковую панель">
					<ChevronLeft className="size-4" />
				</Button>
			</div>

			{/* Scrollable nav */}
			<nav className="flex-1 overflow-y-auto p-2" aria-label="Папки">
				<div className="space-y-0.5">
					<NavItem
						icon={<Layers className="size-4" />}
						label="Все закупки"
						count={counts.all ?? 0}
						active={activeFolder === undefined}
						onClick={() => selectFolder(undefined)}
					/>
					<NavItem
						icon={<Inbox className="size-4" />}
						label="Без папки"
						count={counts.none ?? 0}
						active={activeFolder === "none"}
						onClick={() => selectFolder("none")}
					/>
				</div>

				{(folders.length > 0 || isCreating) && <div className="my-2 border-t border-sidebar-border" />}

				<div className="space-y-0.5">
					{folders.map((folder) =>
						editingId === folder.id ? (
							<InlineRenameRow
								key={folder.id}
								folder={folder}
								onSave={(name) => {
									const trimmed = name.trim();
									if (trimmed) onRenameFolder(folder.id, trimmed);
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
						<InlineCreateRow folders={folders} onSave={handleCreate} onCancel={() => setIsCreating(false)} />
					)}
				</div>
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
					Новая папка
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
		<button
			type="button"
			className={cn(
				"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
				active
					? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
					: "text-sidebar-foreground hover:bg-sidebar-accent/50",
			)}
			onClick={onClick}
		>
			<span className="shrink-0" aria-hidden="true">
				{icon}
			</span>
			<span className="flex-1 text-left">{label}</span>
			<span className="tabular-nums text-xs text-muted-foreground">{count}</span>
		</button>
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

	return (
		<div className="group relative">
			<button
				type="button"
				className={cn(
					"flex w-full items-center gap-2 rounded-md px-2 py-1.5 pr-7 text-sm transition-colors",
					active
						? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
						: "text-sidebar-foreground hover:bg-sidebar-accent/50",
				)}
				onClick={onClick}
			>
				<span
					className="size-2.5 shrink-0 rounded-full"
					style={{ backgroundColor: `var(--folder-${folder.color})` }}
					aria-hidden="true"
					data-testid={`folder-dot-${folder.id}`}
				/>
				<span className="flex-1 truncate text-left">{folder.name}</span>
				<span className="tabular-nums text-xs text-muted-foreground">{count}</span>
			</button>

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
						aria-label={`Меню папки ${folder.name}`}
					>
						<EllipsisVertical className="size-3.5" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" side="right">
					<DropdownMenuItem onClick={onRename}>
						<Pencil className="size-3.5" />
						Переименовать
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<div className="px-1.5 py-1" data-testid="color-picker">
						<div className="flex gap-1">
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
					<DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
						<Trash2 className="size-3.5" />
						Удалить
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить папку?</AlertDialogTitle>
						<AlertDialogDescription>
							Папка «{folder.name}» будет удалена. Закупки из этой папки не будут удалены.
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

function InlineCreateRow({
	folders,
	onSave,
	onCancel,
}: {
	folders: Folder[];
	onSave: (name: string) => void;
	onCancel: () => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const savedRef = useRef(false);

	// Auto-assign color for preview
	const usedColors = new Set(folders.map((f) => f.color));
	const nextColor = FOLDER_COLORS.find((c) => !usedColors.has(c)) ?? FOLDER_COLORS[0];

	useMountEffect(() => {
		inputRef.current?.focus();
		return undefined;
	});

	function save() {
		if (savedRef.current) return;
		savedRef.current = true;
		onSave(inputRef.current?.value ?? "");
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			save();
		} else if (e.key === "Escape") {
			e.preventDefault();
			savedRef.current = true;
			onCancel();
		}
	}

	return (
		<div className="flex items-center gap-2 rounded-md px-2 py-1.5">
			<span
				className="size-2.5 shrink-0 rounded-full"
				style={{ backgroundColor: `var(--folder-${nextColor})` }}
				aria-hidden="true"
				data-testid="creating-folder-dot"
			/>
			<input
				ref={inputRef}
				type="text"
				className="h-5 flex-1 bg-transparent text-sm outline-none"
				aria-label="Название папки"
				spellCheck={false}
				autoComplete="off"
				onKeyDown={handleKeyDown}
				onBlur={save}
			/>
		</div>
	);
}

function InlineRenameRow({
	folder,
	onSave,
	onCancel,
}: {
	folder: Folder;
	onSave: (name: string) => void;
	onCancel: () => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const savedRef = useRef(false);

	useMountEffect(() => {
		inputRef.current?.focus();
		inputRef.current?.select();
		return undefined;
	});

	function save() {
		if (savedRef.current) return;
		savedRef.current = true;
		onSave(inputRef.current?.value ?? "");
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			save();
		} else if (e.key === "Escape") {
			e.preventDefault();
			savedRef.current = true;
			onCancel();
		}
	}

	return (
		<div className="flex items-center gap-2 rounded-md px-2 py-1.5">
			<span
				className="size-2.5 shrink-0 rounded-full"
				style={{ backgroundColor: `var(--folder-${folder.color})` }}
				aria-hidden="true"
			/>
			<input
				ref={inputRef}
				type="text"
				className="h-5 flex-1 bg-transparent text-sm outline-none"
				defaultValue={folder.name}
				spellCheck={false}
				autoComplete="off"
				onKeyDown={handleKeyDown}
				onBlur={save}
			/>
		</div>
	);
}
