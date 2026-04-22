import {
	AlertTriangle,
	Archive,
	ArchiveRestore,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Building2,
	FolderInput,
	Inbox,
	LoaderCircle,
	Pencil,
	Trash2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Folder, ProcurementItem, SortField, SortState } from "@/data/types";
import { getAnnualCost, getDeviation, getDisplayStatus, getOverpayment } from "@/data/types";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useMenuEditGuard } from "@/hooks/use-menu-edit-guard";
import { formatCurrency, formatDeviation, signClassName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InlineRenameInput } from "./inline-rename-input";
import { ProcurementCard, ProcurementStatusIcon, STATUS_CONFIG } from "./procurement-card";
import { TruncatedName } from "./truncated-name";

interface SortableColumn {
	label: string;
	field: SortField;
	tooltip?: string;
}

const TCO_TOOLTIP = "ТСО (Total Cost of Ownership)\u00A0— совокупная стоимость владения: цена и стоимость доставки";

const INPUT_COLUMNS: SortableColumn[] = [
	{ label: "ОБЪЕМ\u00A0₽", field: "annualCost" },
	{ label: "ТЕКУЩЕЕ\u00A0ТСО", field: "currentPrice", tooltip: TCO_TOOLTIP },
];

const ANALYSIS_COLUMNS: SortableColumn[] = [
	{ label: "ЛУЧШЕЕ\u00A0ТСО", field: "bestPrice", tooltip: TCO_TOOLTIP },
	{ label: "СРЕДНЕЕ\u00A0ТСО", field: "averagePrice", tooltip: TCO_TOOLTIP },
	{ label: "ПЕРЕПЛАТА\u00A0₽", field: "overpayment" },
	{ label: "ПЕРЕПЛАТА\u00A0%", field: "deviation" },
];

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"] as const;
const SKELETON_COL_KEYS = ["sc-1", "sc-2", "sc-3", "sc-4", "sc-5", "sc-6"] as const;

function SortIcon({ field, sort }: { field: SortField; sort: SortState | null }) {
	if (sort?.field !== field) return <ArrowUpDown className="size-3.5 text-muted-foreground/50" aria-hidden="true" />;
	return sort.direction === "asc" ? (
		<ArrowUp className="size-3.5" aria-hidden="true" />
	) : (
		<ArrowDown className="size-3.5" aria-hidden="true" />
	);
}

function SortableHeaderButton({
	col,
	sort,
	onSort,
}: {
	col: SortableColumn;
	sort: SortState | null;
	onSort: (field: SortField) => void;
}) {
	const button = (
		<button
			type="button"
			className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
			onClick={() => onSort(col.field)}
			aria-label={`Сортировать по ${col.label}`}
		>
			{col.label}
			<SortIcon field={col.field} sort={sort} />
		</button>
	);
	if (!col.tooltip) return button;
	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent>{col.tooltip}</TooltipContent>
		</Tooltip>
	);
}

interface ProcurementTableProps {
	items: ProcurementItem[];
	folders?: Folder[];
	sort: SortState | null;
	hasNextPage: boolean;
	loadMore: () => void;
	onSort: (field: SortField) => void;
	onRowClick?: (item: ProcurementItem) => void;
	onDeleteItem?: (id: string) => void;
	onRenameItem?: (id: string, name: string) => void;
	onAssignFolder?: (itemId: string, folderId: string | null) => void;
	onArchiveItem?: (id: string, isArchived: boolean) => void;
	isArchiveView?: boolean;
	isLoading?: boolean;
	isFetchingNextPage?: boolean;
	error?: Error | null;
	onRetry?: () => void;
	isMobile?: boolean;
	companyMap?: Record<string, string>;
	showCompanyBadge?: boolean;
}

export function ProcurementTable({
	items,
	folders,
	sort,
	hasNextPage,
	loadMore,
	onSort,
	onRowClick,
	onDeleteItem,
	onRenameItem,
	onAssignFolder,
	onArchiveItem,
	isArchiveView,
	isLoading,
	isFetchingNextPage,
	error,
	onRetry,
	isMobile,
	companyMap,
	showCompanyBadge,
}: ProcurementTableProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const sentinelRef = useIntersectionObserver(loadMore, {
		root: scrollContainerRef.current,
	});

	const folderMap = useMemo(() => {
		const map: Record<string, Folder> = {};
		if (folders) {
			for (const f of folders) map[f.id] = f;
		}
		return map;
	}, [folders]);
	const hasContextMenu = !!(onDeleteItem || onRenameItem || onAssignFolder || onArchiveItem);
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const { willEditRef, onCloseAutoFocus } = useMenuEditGuard();
	const [optimisticNames, setOptimisticNames] = useState<Record<string, string>>({});
	const [deletingItem, setDeletingItem] = useState<ProcurementItem | null>(null);

	if (isMobile) {
		return (
			<div className="flex min-h-0 flex-1 flex-col">
				<div
					ref={scrollContainerRef}
					className="flex-1 overflow-auto touch-manipulation"
					data-testid="card-scroll-container"
				>
					{isLoading && (
						<div className="flex flex-col gap-3 p-4">
							{SKELETON_KEYS.map((key) => (
								<div key={key} data-testid="skeleton-card" className="rounded-lg border bg-background p-4">
									<div className="flex items-start justify-between">
										<Skeleton className="h-3 w-6" />
									</div>
									<Skeleton className="mt-2 h-4 w-48" />
									<Skeleton className="mt-1 h-3 w-24" />
									<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
									</div>
								</div>
							))}
						</div>
					)}
					{error && !isLoading && (
						<div
							className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground"
							data-testid="items-error"
						>
							<AlertTriangle className="size-8" aria-hidden="true" />
							<p className="text-sm">Не удалось загрузить данные</p>
							{onRetry && (
								<button
									type="button"
									className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
									onClick={onRetry}
								>
									Повторить
								</button>
							)}
						</div>
					)}
					{!isLoading && !error && items.length === 0 && (
						<div
							className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground"
							data-testid="items-empty"
						>
							<Inbox className="size-8" aria-hidden="true" />
							<p className="text-sm">Позиций нет</p>
						</div>
					)}
					{!isLoading && !error && items.length > 0 && (
						<div className="flex flex-col gap-3 p-4">
							{items.map((item, index) => (
								<ProcurementCard
									key={item.id}
									item={item}
									folder={item.folderId ? folderMap[item.folderId] : undefined}
									folders={folders}
									index={index}
									onRowClick={onRowClick}
									onDeleteItem={onDeleteItem}
									onRenameItem={onRenameItem}
									onAssignFolder={onAssignFolder}
									onArchiveItem={onArchiveItem}
									isArchiveView={isArchiveView}
									companyName={companyMap?.[item.companyId]}
									showCompanyBadge={showCompanyBadge}
								/>
							))}
						</div>
					)}
					{hasNextPage && <div ref={sentinelRef} data-testid="scroll-sentinel" className="h-px" />}
					{isFetchingNextPage && (
						<div className="flex justify-center py-4" data-testid="loading-more-spinner">
							<LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Загрузка…" />
						</div>
					)}
				</div>
			</div>
		);
	}

	const stickyHead = "sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_var(--color-border)]";
	const stickyNameHead = "sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_var(--color-border)] w-[1%]";
	const stickyNameCell = "transition-colors w-[1%]";
	const analysisHead =
		"sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_var(--color-border)] text-highlight-foreground";
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div
				ref={scrollContainerRef}
				className="flex flex-1 flex-col overflow-auto touch-manipulation [&_tr>*:last-child]:pr-lg"
				data-testid="table-scroll-container"
			>
				<Table>
					<TableHeader>
						<TableRow className="border-b-0">
							<TableHead className={`w-12 text-center ${stickyHead}`}>№</TableHead>
							<TableHead className={stickyNameHead}>НАИМЕНОВАНИЕ</TableHead>
							{INPUT_COLUMNS.map((col) => (
								<TableHead key={col.field} className={`text-right ${stickyHead}`}>
									<SortableHeaderButton col={col} sort={sort} onSort={onSort} />
								</TableHead>
							))}
							{ANALYSIS_COLUMNS.map((col) => (
								<TableHead key={col.field} className={`text-right ${analysisHead}`}>
									<SortableHeaderButton col={col} sort={sort} onSort={onSort} />
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading &&
							SKELETON_KEYS.map((key) => (
								<TableRow key={key} data-testid="skeleton-row">
									<TableCell className="text-center">
										<Skeleton className="mx-auto h-4 w-6" />
									</TableCell>
									<TableCell className={stickyNameCell}>
										<Skeleton className="h-4 w-48" />
										<Skeleton className="mt-1 h-3 w-24" />
									</TableCell>
									{SKELETON_COL_KEYS.map((ck) => (
										<TableCell key={ck} className="text-right">
											<Skeleton className="ml-auto h-4 w-16" />
										</TableCell>
									))}
								</TableRow>
							))}
						{error && !isLoading && (
							<TableRow>
								<TableCell colSpan={8} className="h-48">
									<div
										className="flex flex-col items-center justify-center gap-3 text-muted-foreground"
										data-testid="items-error"
									>
										<AlertTriangle className="size-8" aria-hidden="true" />
										<p className="text-sm">Не удалось загрузить данные</p>
										{onRetry && (
											<button
												type="button"
												className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
												onClick={onRetry}
											>
												Повторить
											</button>
										)}
									</div>
								</TableCell>
							</TableRow>
						)}
						{!isLoading &&
							!error &&
							items.map((item, index) => {
								const deviation = getDeviation(item);
								const overpayment = getOverpayment(item);
								const dev = formatDeviation(deviation);
								const displayStatus = getDisplayStatus(item);
								const status = STATUS_CONFIG[displayStatus];
								const folder = item.folderId ? folderMap[item.folderId] : undefined;
								const isEditing = editingItemId === item.id;
								const rowCls = onRowClick && !isEditing ? "cursor-pointer group" : "group";
								const displayName = optimisticNames[item.id] ?? item.name;
								const nameCell = isEditing ? (
									<TableCell className={`font-medium ${stickyNameCell}`}>
										<InlineRenameInput
											defaultValue={item.name}
											onSave={(name) => {
												setOptimisticNames((prev) => ({ ...prev, [item.id]: name }));
												onRenameItem?.(item.id, name);
												setEditingItemId(null);
											}}
											onCancel={() => setEditingItemId(null)}
										/>
									</TableCell>
								) : (
									<TableCell className={`font-medium ${stickyNameCell}`}>
										<div className="max-w-[350px]">
											<div className="flex items-center gap-2 min-w-0">
												<TruncatedName name={displayName} className="truncate" />
												{showCompanyBadge && companyMap?.[item.companyId] && (
													<div
														className="flex shrink-0 items-center gap-1 rounded-md bg-[#ebebed] px-2 py-0.5 dark:bg-[#35353a]"
														data-testid={`company-badge-${item.id}`}
													>
														<Building2 className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
														<span className="text-xs text-muted-foreground">{companyMap[item.companyId]}</span>
													</div>
												)}
												{!showCompanyBadge && folder && !isArchiveView && (
													<div
														className="flex shrink-0 items-center gap-1 rounded-md bg-[#ebebed] px-2 py-0.5 dark:bg-[#35353a]"
														data-testid={`folder-badge-${item.id}`}
													>
														<span
															className="size-2 shrink-0 rounded-full"
															style={{
																backgroundColor: `var(--folder-${folder.color})`,
															}}
															aria-hidden="true"
														/>
														<span className="text-xs text-muted-foreground">{folder.name}</span>
													</div>
												)}
											</div>
											<div className="mt-0.5">
												<span
													className={`relative z-10 inline-flex items-center gap-1.5 py-0.5 text-xs ${status.className}`}
												>
													<ProcurementStatusIcon status={displayStatus} />
													{status.label}
													{displayStatus === "negotiating" && item.taskCount != null && item.taskCount > 0 && (
														<TaskCountBadge count={item.taskCount} />
													)}
												</span>
											</div>
										</div>
									</TableCell>
								);

								const rowClassName = cn(rowCls, item.status === "searching" && "negotiating-stripe");
								const rowProps = {
									className: rowClassName,
									onClick: onRowClick && !isEditing ? () => onRowClick(item) : undefined,
									"data-testid": hasContextMenu ? `row-${item.id}` : undefined,
								};
								const rowChildren = (
									<>
										<TableCell className="text-center tabular-nums text-muted-foreground">{index + 1}</TableCell>
										{nameCell}
										<TableCell className="text-right tabular-nums">{formatCurrency(getAnnualCost(item))}</TableCell>
										<TableCell className="text-right tabular-nums">{formatCurrency(item.currentPrice)}</TableCell>
										<TableCell className="text-right tabular-nums">{formatCurrency(item.bestPrice)}</TableCell>
										<TableCell className="text-right tabular-nums">{formatCurrency(item.averagePrice)}</TableCell>
										<TableCell className={`text-right tabular-nums ${signClassName(overpayment)}`}>
											{formatCurrency(overpayment)}
										</TableCell>
										<TableCell className={`text-right tabular-nums ${dev.className}`}>{dev.text}</TableCell>
									</>
								);

								const row = (
									<TableRow key={item.id} {...rowProps}>
										{rowChildren}
									</TableRow>
								);

								if (!hasContextMenu) return row;

								return (
									<ContextMenu key={item.id}>
										<ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
										<ContextMenuContent onCloseAutoFocus={onCloseAutoFocus}>
											{onRenameItem && (
												<ContextMenuItem
													onSelect={() => {
														willEditRef.current = true;
														setEditingItemId(item.id);
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
																	style={{
																		backgroundColor: `var(--folder-${f.color})`,
																	}}
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
													<ContextMenuItem variant="destructive" onSelect={() => setDeletingItem(item)}>
														<Trash2 className="size-3.5" />
														Удалить
													</ContextMenuItem>
												</>
											)}
										</ContextMenuContent>
									</ContextMenu>
								);
							})}
					</TableBody>
				</Table>
				{!isLoading && !error && items.length === 0 && (
					<div
						className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"
						data-testid="items-empty"
					>
						<Inbox className="size-8" aria-hidden="true" />
						<p className="text-sm">Позиций нет</p>
					</div>
				)}
				{hasNextPage && <div ref={sentinelRef} data-testid="scroll-sentinel" className="h-px" />}
				{isFetchingNextPage && (
					<div className="flex justify-center py-4" data-testid="loading-more-spinner">
						<LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Загрузка…" />
					</div>
				)}
			</div>

			{deletingItem && (
				<AlertDialog open onOpenChange={(open) => !open && setDeletingItem(null)}>
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
							<AlertDialogTitle>Удалить закупку?</AlertDialogTitle>
							<AlertDialogDescription>«{deletingItem.name}» будет удалена из таблицы.</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setDeletingItem(null)}>Отмена</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={() => {
									onDeleteItem?.(deletingItem.id);
									setDeletingItem(null);
								}}
							>
								Удалить
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
}
