import {
	AlertTriangle,
	Archive,
	ArchiveRestore,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Building2,
	Inbox,
	LoaderCircle,
	Pencil,
	Trash2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
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
	{ label: "ОБЪЕМ\u00A0В\u00A0ГОД\u00A0₽", field: "annualCost" },
	{ label: "ТЕКУЩЕЕ\u00A0ТСО", field: "currentPrice", tooltip: TCO_TOOLTIP },
];

const ANALYSIS_COLUMNS: SortableColumn[] = [
	{ label: "ЛУЧШЕЕ\u00A0ТСО", field: "bestPrice", tooltip: TCO_TOOLTIP },
	{ label: "СРЕДНЕЕ\u00A0ТСО", field: "averagePrice", tooltip: TCO_TOOLTIP },
	{ label: "ОТКЛОНЕНИЕ\u00A0₽", field: "overpayment" },
	{ label: "ОТКЛ.\u00A0%", field: "deviation" },
];

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"] as const;
const SKELETON_COL_KEYS = ["sc-1", "sc-2", "sc-3", "sc-4", "sc-5", "sc-6"] as const;

const FIXED_COLUMN_COUNT = 3;
const COLUMN_COUNT = FIXED_COLUMN_COUNT + INPUT_COLUMNS.length + ANALYSIS_COLUMNS.length;

function ErrorState({ onRetry, className }: { onRetry?: () => void; className?: string }) {
	return (
		<div
			className={cn("flex flex-col items-center justify-center gap-3 text-muted-foreground", className)}
			data-testid="items-error"
		>
			<AlertTriangle className="size-8" aria-hidden="true" />
			<p className="text-sm">Не удалось загрузить данные</p>
			{onRetry && (
				<Button type="button" onClick={onRetry}>
					Повторить
				</Button>
			)}
		</div>
	);
}

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
			className="inline-flex items-center gap-1 hover:text-foreground transition-[color,transform] active:scale-[0.96]"
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
	/** Map of inquiry id → category + company derived from the parent inquiry.
	 * After the schema migration items reference only `procurementInquiryId`; the table
	 * looks up category badge / company name through this map. */
	procurementInquiryMap?: Record<string, { companyId: string; folderId: string | null }>;
	sort: SortState | null;
	hasNextPage: boolean;
	loadMore: () => void;
	onSort: (field: SortField) => void;
	onRowClick?: (item: ProcurementItem) => void;
	onDeleteItem?: (id: string) => void;
	onRenameItem?: (id: string, name: string) => void;
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
	procurementInquiryMap,
	sort,
	hasNextPage,
	loadMore,
	onSort,
	onRowClick,
	onDeleteItem,
	onRenameItem,
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
	const hasContextMenu = !!(onDeleteItem || onRenameItem || onArchiveItem);
	function procurementInquiryFolderId(item: ProcurementItem): string | null {
		if (!item.procurementInquiryId) return null;
		return procurementInquiryMap?.[item.procurementInquiryId]?.folderId ?? null;
	}
	function procurementInquiryCompanyId(item: ProcurementItem): string | undefined {
		if (!item.procurementInquiryId) return undefined;
		return procurementInquiryMap?.[item.procurementInquiryId]?.companyId;
	}
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
					{error && !isLoading && <ErrorState onRetry={onRetry} className="h-48" />}
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
							{items.map((item, index) => {
								const folderId = procurementInquiryFolderId(item);
								const companyId = procurementInquiryCompanyId(item);
								return (
									<ProcurementCard
										key={item.id}
										item={item}
										folder={folderId ? folderMap[folderId] : undefined}
										index={index}
										onRowClick={onRowClick}
										onDeleteItem={onDeleteItem}
										onRenameItem={onRenameItem}
										onArchiveItem={onArchiveItem}
										isArchiveView={isArchiveView}
										companyName={companyId ? companyMap?.[companyId] : undefined}
										showCompanyBadge={showCompanyBadge}
									/>
								);
							})}
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
	const stickyNameHead = `${stickyHead} w-full max-w-0`;
	const stickyNameCell = "transition-colors w-full max-w-0";
	const analysisHead = `${stickyHead} text-highlight-foreground`;
	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col">
			<div
				ref={scrollContainerRef}
				className="flex min-w-0 flex-1 flex-col overflow-auto touch-manipulation [&_tr>*:first-child]:pl-lg [&_tr>*:last-child]:pr-lg [&_tr>*:not(:last-child)]:border-r"
				data-testid="table-scroll-container"
			>
				<Table>
					<TableHeader>
						<TableRow className="border-b-0">
							<TableHead className={`w-14 pr-lg text-center ${stickyHead}`}>№</TableHead>
							<TableHead className={stickyNameHead}>НАИМЕНОВАНИЕ</TableHead>
							<TableHead className={stickyHead}>КАТЕГОРИЯ</TableHead>
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
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-20" />
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
								<TableCell colSpan={COLUMN_COUNT} className="h-48">
									<ErrorState onRetry={onRetry} />
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
								const folderId = procurementInquiryFolderId(item);
								const folder = folderId ? folderMap[folderId] : undefined;
								const companyId = procurementInquiryCompanyId(item);
								const companyName = companyId ? companyMap?.[companyId] : undefined;
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
										<div className="flex items-center gap-2 min-w-0">
											<TruncatedName name={displayName} className="block min-w-0 truncate" />
											<Tooltip>
												<TooltipTrigger asChild>
													<span
														role="img"
														className={cn("inline-flex shrink-0 items-center", status.className)}
														aria-label={status.label}
														data-testid={`status-icon-${item.id}`}
													>
														<ProcurementStatusIcon status={displayStatus} iconClassName="size-3.5" />
													</span>
												</TooltipTrigger>
												<TooltipContent>{status.label}</TooltipContent>
											</Tooltip>
											{showCompanyBadge && companyName && (
												<div
													className="flex shrink-0 items-center gap-1 rounded-md bg-[#ebebed] px-2 py-0.5 dark:bg-[#35353a]"
													data-testid={`company-badge-${item.id}`}
												>
													<Building2 className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
													<span className="text-xs text-muted-foreground">{companyName}</span>
												</div>
											)}
										</div>
									</TableCell>
								);
								const categoryCell = (
									<TableCell>
										{folder && !isArchiveView ? (
											<span className="inline-flex items-center gap-1.5" data-testid={`folder-badge-${item.id}`}>
												<span
													className="size-2 shrink-0 rounded-full"
													style={{ backgroundColor: `var(--folder-${folder.color})` }}
													aria-hidden="true"
												/>
												<span className="text-xs font-medium text-foreground">{folder.name}</span>
											</span>
										) : null}
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
										<TableCell className="pr-lg text-center tabular-nums text-muted-foreground">{index + 1}</TableCell>
										{nameCell}
										{categoryCell}
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
											{onArchiveItem && !isArchiveView && (
												<ContextMenuItem onSelect={() => onArchiveItem(item.id, true)}>
													<Archive className="size-3.5" />
													Архив
												</ContextMenuItem>
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
