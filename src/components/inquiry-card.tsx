import { Archive, ArchiveRestore, Ellipsis, FolderInput, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TenderSummary } from "@/data/domains/tenders";
import type { Folder } from "@/data/types";
import { useMenuEditGuard } from "@/hooks/use-menu-edit-guard";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { formatCurrency, formatDayMonthShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InlineRenameInput } from "./inline-rename-input";
import { TruncatedName } from "./truncated-name";

interface InquiryCardProps {
	tender: TenderSummary;
	folders: Folder[];
	folder?: Folder;
	index: number;
	isEditing: boolean;
	isArchiveView: boolean;
	onClick: (tender: TenderSummary) => void;
	onArchive: (id: string, isArchived: boolean) => void;
	onRename: (id: string) => void;
	onSaveRename: (id: string, name: string) => void;
	onCancelRename: () => void;
	onMoveToFolder: (id: string, folderId: string | null) => void;
	onDelete: (tender: TenderSummary) => void;
}

export function InquiryCard({
	tender,
	folders,
	folder,
	index,
	isEditing,
	isArchiveView,
	onClick,
	onArchive,
	onRename,
	onSaveRename,
	onCancelRename,
	onMoveToFolder,
	onDelete,
}: InquiryCardProps) {
	const status = STATUS_CONFIG[tender.status];
	const [menuOpen, setMenuOpen] = useState(false);
	const { willEditRef, onCloseAutoFocus } = useMenuEditGuard();

	const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressFiredRef = useRef(false);
	const touchStartRef = useRef<{ x: number; y: number } | null>(null);

	function clearLongPressTimer() {
		if (longPressTimerRef.current) {
			clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}
	}

	useMountEffect(() => () => {
		if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
	});

	function handleTouchStart(e: React.TouchEvent) {
		if (isEditing) return;
		const t = e.touches[0];
		touchStartRef.current = { x: t.clientX, y: t.clientY };
		longPressFiredRef.current = false;
		clearLongPressTimer();
		longPressTimerRef.current = setTimeout(() => {
			longPressFiredRef.current = true;
			setMenuOpen(true);
		}, 500);
	}

	function handleTouchMove(e: React.TouchEvent) {
		if (!touchStartRef.current) return;
		const t = e.touches[0];
		const dx = Math.abs(t.clientX - touchStartRef.current.x);
		const dy = Math.abs(t.clientY - touchStartRef.current.y);
		if (dx > 10 || dy > 10) clearLongPressTimer();
	}

	function handleTouchEnd() {
		clearLongPressTimer();
	}

	function handleContextMenu(e: React.MouseEvent) {
		if (isEditing) return;
		e.preventDefault();
		setMenuOpen(true);
	}

	function handleClick() {
		if (longPressFiredRef.current || isEditing) return;
		onClick(tender);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (isEditing) return;
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onClick(tender);
		}
	}

	const nameContent = isEditing ? (
		<InlineRenameInput
			defaultValue={tender.name}
			onSave={(name) => onSaveRename(tender.id, name)}
			onCancel={onCancelRename}
		/>
	) : (
		<TruncatedName name={tender.name} className="font-medium text-sm" />
	);

	return (
		<article
			className="select-none [-webkit-touch-callout:none] cursor-pointer rounded-lg border bg-background p-4 transition-[background-color,border-color,scale] duration-150 ease-out touch-manipulation hover:border-border/80 active:bg-muted/50 active:scale-[0.96] motion-reduce:active:scale-100"
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			onContextMenu={handleContextMenu}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			onTouchCancel={handleTouchEnd}
			tabIndex={isEditing ? undefined : 0}
			role={isEditing ? undefined : "button"}
			data-testid={`tender-card-${tender.id}`}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<span className="text-xs text-muted-foreground tabular-nums">{index + 1}</span>
					{folder && !isEditing && (
						<div
							className="flex items-center gap-1 rounded-md bg-[#ebebed] px-2 py-0.5 dark:bg-[#35353a]"
							data-testid={`folder-badge-${tender.id}`}
						>
							<span
								className="size-2 shrink-0 rounded-full"
								style={{ backgroundColor: `var(--folder-${folder.color})` }}
								aria-hidden="true"
							/>
							<span className="text-xs text-muted-foreground">{folder.name}</span>
						</div>
					)}
				</div>
				<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="relative flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:inset-[-6px] after:content-['']"
							aria-label="Действия"
							onClick={(e) => e.stopPropagation()}
						>
							<Ellipsis className="size-4" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="min-w-56" align="end" onCloseAutoFocus={onCloseAutoFocus}>
						<DropdownMenuItem
							onSelect={() => {
								willEditRef.current = true;
								onRename(tender.id);
							}}
						>
							<Pencil className="size-3.5" />
							Переименовать
						</DropdownMenuItem>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<FolderInput className="size-3.5" />
								Переместить в категорию
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuItem onSelect={() => onMoveToFolder(tender.id, null)} disabled={tender.folderId === null}>
									Без категории
								</DropdownMenuItem>
								{folders.length > 0 && <DropdownMenuSeparator />}
								{folders.map((f) => (
									<DropdownMenuItem
										key={f.id}
										onSelect={() => onMoveToFolder(tender.id, f.id)}
										disabled={tender.folderId === f.id}
									>
										<span
											className="size-2 rounded-full"
											style={{ backgroundColor: `var(--folder-${f.color})` }}
											aria-hidden="true"
										/>
										{f.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuSeparator />
						{isArchiveView ? (
							<DropdownMenuItem onSelect={() => onArchive(tender.id, false)}>
								<ArchiveRestore className="size-3.5" />
								Восстановить из архива
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem onSelect={() => onArchive(tender.id, true)}>
								<Archive className="size-3.5" />
								Архив
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive" onSelect={() => onDelete(tender)}>
							<Trash2 className="size-3.5" />
							Удалить
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<div className="mt-1 flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">{nameContent}</div>
				<span className={cn("shrink-0 inline-flex items-center gap-1.5 text-xs", status.className)}>
					<ProcurementStatusIcon status={tender.status} />
					{status.label}
				</span>
			</div>
			<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				<div>
					<dt className="text-xs text-muted-foreground">Бюджет</dt>
					<dd className="tabular-nums">{formatCurrency(tender.budget)}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Дедлайн</dt>
					<dd className="tabular-nums">{formatDayMonthShort(tender.deadline)}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Поставщики</dt>
					<dd className="tabular-nums">{tender.suppliersCount}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Получено&nbsp;КП</dt>
					<dd className="tabular-nums">{tender.kpCount}</dd>
				</div>
			</dl>
		</article>
	);
}
