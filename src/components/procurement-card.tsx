import {
	Archive,
	ArchiveRestore,
	Building2,
	Check,
	Ellipsis,
	FolderInput,
	Inbox,
	LoaderCircle,
	Pencil,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { TaskCountBadge } from "@/components/task-count-badge";
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
import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Folder, ProcurementItem, ProcurementStatus } from "@/data/types";
import { getAnnualCost, getDeviation, getOverpayment, STATUS_LABELS } from "@/data/types";
import { useMenuEditGuard } from "@/hooks/use-menu-edit-guard";
import { formatCurrency, formatDeviation, signClassName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InlineRenameInput } from "./inline-rename-input";
import { TruncatedName } from "./truncated-name";

export const STATUS_CONFIG: Record<ProcurementStatus, { label: string; className: string }> = {
	searching: { label: STATUS_LABELS.searching, className: "text-orange-600 dark:text-orange-400" },
	negotiating: { label: STATUS_LABELS.negotiating, className: "text-blue-600 dark:text-blue-400" },
	completed: { label: STATUS_LABELS.completed, className: "text-green-600 dark:text-green-400" },
};

export function ProcurementStatusIcon({
	status,
	searchCompleted,
	iconClassName = "size-3",
}: {
	status: ProcurementStatus;
	searchCompleted?: boolean;
	iconClassName?: string;
}) {
	if (status === "searching") {
		return searchCompleted ? (
			<Check className={iconClassName} aria-hidden="true" />
		) : (
			<LoaderCircle className={cn(iconClassName, "animate-spin")} aria-hidden="true" />
		);
	}
	if (status === "negotiating") {
		return <span className="size-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />;
	}
	if (status === "completed") {
		return <Check className={iconClassName} aria-hidden="true" />;
	}
	return null;
}

interface ProcurementCardProps {
	item: ProcurementItem;
	folder?: Folder;
	folders?: Folder[];
	index: number;
	onRowClick?: (item: ProcurementItem) => void;
	onDeleteItem?: (id: string) => void;
	onRenameItem?: (id: string, name: string) => void;
	onAssignFolder?: (itemId: string, folderId: string | null) => void;
	onArchiveItem?: (id: string, isArchived: boolean) => void;
	isArchiveView?: boolean;
	companyName?: string;
	showCompanyBadge?: boolean;
}

const FIELDS: { label: string; key: string }[] = [
	{ label: "Бюджет в\u00A0год", key: "annualCost" },
	{ label: "Текущая цена", key: "currentPrice" },
	{ label: "Лучшая цена", key: "bestPrice" },
];

export function ProcurementCard({
	item,
	folder,
	folders,
	index,
	onRowClick,
	onDeleteItem,
	onRenameItem,
	onAssignFolder,
	onArchiveItem,
	isArchiveView,
	companyName,
	showCompanyBadge,
}: ProcurementCardProps) {
	const deviation = getDeviation(item);
	const overpayment = getOverpayment(item);
	const dev = formatDeviation(deviation);
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [optimisticName, setOptimisticName] = useState<string>();
	const { willEditRef, onCloseAutoFocus } = useMenuEditGuard();

	const values: Record<string, string> = {
		annualCost: formatCurrency(getAnnualCost(item)),
		currentPrice: formatCurrency(item.currentPrice),
		bestPrice: formatCurrency(item.bestPrice),
	};

	const handleClick = onRowClick ? () => onRowClick(item) : undefined;
	const handleKeyDown = onRowClick
		? (e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onRowClick(item);
				}
			}
		: undefined;

	const hasActions = !!(onDeleteItem || onRenameItem || onAssignFolder || onArchiveItem);

	const displayName = optimisticName ?? item.name;

	const nameContent = isEditing ? (
		<InlineRenameInput
			defaultValue={item.name}
			onSave={(name) => {
				setOptimisticName(name);
				onRenameItem?.(item.id, name);
				setIsEditing(false);
			}}
			onCancel={() => setIsEditing(false)}
		/>
	) : (
		<TruncatedName name={displayName} className="font-medium text-sm" />
	);

	const card = (
		<article
			className={cn(
				"rounded-lg border bg-background p-4",
				onRowClick &&
					"cursor-pointer transition-[background-color,border-color,scale] duration-150 ease-out touch-manipulation hover:border-border/80 active:bg-muted/50 active:scale-[0.99] motion-reduce:active:scale-100",
			)}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			tabIndex={onRowClick ? 0 : undefined}
			role={onRowClick ? "button" : undefined}
			data-testid={`card-${item.id}`}
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-1.5">
					<span className="text-xs text-muted-foreground tabular-nums">{index + 1}</span>
					{showCompanyBadge && companyName && !isEditing && (
						<div
							className="flex items-center gap-1 rounded-md bg-[#ebebed] px-2 py-0.5 dark:bg-[#35353a]"
							data-testid={`company-badge-${item.id}`}
						>
							<Building2 className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
							<span className="text-xs text-muted-foreground">{companyName}</span>
						</div>
					)}
					{!showCompanyBadge && folder && !isEditing && !isArchiveView && (
						<div
							className="flex items-center gap-1 rounded-md bg-[#ebebed] px-2 py-0.5 dark:bg-[#35353a]"
							data-testid={`folder-badge-${item.id}`}
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
				{hasActions && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								aria-label="Действия"
								onClick={(e) => e.stopPropagation()}
							>
								<Ellipsis className="size-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="min-w-56" align="end" onCloseAutoFocus={onCloseAutoFocus}>
							{onRenameItem && (
								<DropdownMenuItem
									onSelect={() => {
										willEditRef.current = true;
										setIsEditing(true);
									}}
								>
									<Pencil className="size-3.5" />
									Переименовать
								</DropdownMenuItem>
							)}
							{onAssignFolder && folders && !isArchiveView && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuLabel className="flex items-center gap-1.5">
										<FolderInput className="size-3.5" />
										Переместить в категорию
									</DropdownMenuLabel>
									{folders.map((f) => (
										<DropdownMenuCheckboxItem
											key={f.id}
											checked={item.folderId === f.id}
											onCheckedChange={() => onAssignFolder(item.id, f.id)}
										>
											<span
												className="size-2 shrink-0 rounded-full"
												style={{ backgroundColor: `var(--folder-${f.color})` }}
												aria-hidden="true"
											/>
											{f.name}
										</DropdownMenuCheckboxItem>
									))}
									<DropdownMenuCheckboxItem
										checked={item.folderId == null}
										onCheckedChange={() => onAssignFolder(item.id, null)}
									>
										<Inbox className="size-3.5" />
										Без категории
									</DropdownMenuCheckboxItem>
									{onArchiveItem && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem onSelect={() => onArchiveItem(item.id, true)}>
												<Archive className="size-3.5" />
												Архив
											</DropdownMenuItem>
										</>
									)}
								</>
							)}
							{onArchiveItem && isArchiveView && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem onSelect={() => onArchiveItem(item.id, false)}>
										<ArchiveRestore className="size-3.5" />
										Восстановить из архива
									</DropdownMenuItem>
								</>
							)}
							{onDeleteItem && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem variant="destructive" onSelect={() => setIsDeleting(true)}>
										<Trash2 className="size-3.5" />
										Удалить
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
			<div className="mt-1">{nameContent}</div>
			<span className={cn("mt-0.5 inline-flex items-center gap-1.5 text-xs", STATUS_CONFIG[item.status].className)}>
				<ProcurementStatusIcon status={item.status} searchCompleted={item.searchCompleted} />
				{STATUS_CONFIG[item.status].label}
				{item.status === "negotiating" && item.taskCount != null && item.taskCount > 0 && (
					<TaskCountBadge count={item.taskCount} />
				)}
			</span>
			<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				{FIELDS.map((f) => (
					<div key={f.key}>
						<dt className="text-xs text-muted-foreground">{f.label}</dt>
						<dd className="tabular-nums">{values[f.key]}</dd>
					</div>
				))}
				<div>
					<dt className="text-xs text-muted-foreground">Откл.&nbsp;(%)</dt>
					<dd data-field="deviation" className={`tabular-nums ${dev.className}`}>
						{dev.text}
					</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Переплата&nbsp;(₽)</dt>
					<dd data-field="overpayment" className={`tabular-nums ${signClassName(overpayment)}`}>
						{formatCurrency(overpayment)}
					</dd>
				</div>
			</dl>

			{isDeleting && (
				<AlertDialog open onOpenChange={(open) => !open && setIsDeleting(false)}>
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
							<AlertDialogTitle>Удалить закупку?</AlertDialogTitle>
							<AlertDialogDescription>«{item.name}» будет удалена.</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setIsDeleting(false)}>Отмена</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={() => {
									onDeleteItem?.(item.id);
									setIsDeleting(false);
								}}
							>
								Удалить
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</article>
	);

	if (!hasActions) return card;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-56" onCloseAutoFocus={onCloseAutoFocus}>
				{onRenameItem && (
					<ContextMenuItem
						onSelect={() => {
							willEditRef.current = true;
							setIsEditing(true);
						}}
					>
						<Pencil className="size-3.5" />
						Переименовать
					</ContextMenuItem>
				)}
				{onAssignFolder && folders && !isArchiveView && (
					<ContextMenuSub>
						<ContextMenuSubTrigger>
							<FolderInput className="size-3.5" />
							Переместить в категорию
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							{folders.map((f) => (
								<ContextMenuCheckboxItem
									key={f.id}
									checked={item.folderId === f.id}
									onCheckedChange={() => onAssignFolder(item.id, f.id)}
								>
									<span
										className="size-2 shrink-0 rounded-full"
										style={{ backgroundColor: `var(--folder-${f.color})` }}
										aria-hidden="true"
									/>
									{f.name}
								</ContextMenuCheckboxItem>
							))}
							<ContextMenuSeparator />
							<ContextMenuCheckboxItem
								checked={item.folderId == null}
								onCheckedChange={() => onAssignFolder(item.id, null)}
							>
								<Inbox className="size-3.5" />
								Без категории
							</ContextMenuCheckboxItem>
							{onArchiveItem && (
								<>
									<ContextMenuSeparator />
									<ContextMenuItem onSelect={() => onArchiveItem(item.id, true)}>
										<Archive className="size-3.5" />
										Архив
									</ContextMenuItem>
								</>
							)}
						</ContextMenuSubContent>
					</ContextMenuSub>
				)}
				{onArchiveItem && isArchiveView && (
					<ContextMenuItem onSelect={() => onArchiveItem(item.id, false)}>
						<ArchiveRestore className="size-3.5" />
						Восстановить из архива
					</ContextMenuItem>
				)}
				{onDeleteItem && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem variant="destructive" onSelect={() => setIsDeleting(true)}>
							<Trash2 className="size-3.5" />
							Удалить
						</ContextMenuItem>
					</>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
