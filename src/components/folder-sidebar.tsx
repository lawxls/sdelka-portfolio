import { ChevronLeft, EllipsisVertical, FolderPlus, Inbox, Layers, PanelLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Folder } from "@/data/types";
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
}

export function FolderSidebar({ folders, counts, activeFolder, onFolderSelect }: FolderSidebarProps) {
	const isDesktop = useIsDesktop();

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

				{folders.length > 0 && <div className="my-2 border-t border-sidebar-border" />}

				<div className="space-y-0.5">
					{folders.map((folder) => (
						<FolderNavItem
							key={folder.id}
							folder={folder}
							count={counts[folder.id] ?? 0}
							active={activeFolder === folder.id}
							onClick={() => selectFolder(folder.id)}
						/>
					))}
				</div>
			</nav>

			{/* Footer */}
			<div className="shrink-0 border-t border-sidebar-border p-2">
				<Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" disabled>
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
}: {
	folder: Folder;
	count: number;
	active: boolean;
	onClick: () => void;
}) {
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
		</div>
	);
}
