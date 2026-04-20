import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
	id: string;
	header: ReactNode;
	cell: (row: T, ctx: { isPinned: boolean }) => ReactNode;
	sortable?: boolean;
	/** Sort key sent to onSort. Defaults to `id`. */
	sortField?: string;
	align?: "left" | "right";
	headerClassName?: string;
	cellClassName?: string;
}

export interface DataTableSort {
	field: string;
	direction: "asc" | "desc";
}

export interface DataTableSelection {
	selectedIds: Set<string>;
	onChange: (idOrAll: string) => void;
	getRowLabel?: (id: string) => string;
}

export interface DataTableAction {
	label: ReactNode;
	icon?: ReactNode;
	onSelect: () => void;
}

export interface DataTableProps<T> {
	columns: DataTableColumn<T>[];
	rows: T[];
	getRowId: (row: T) => string;
	pinnedRows?: T[];
	isLoading?: boolean;
	loadingRows?: number;
	emptyMessage?: string;
	emptyMessageWhenFiltered?: string;
	hasFilters?: boolean;
	selection?: DataTableSelection;
	sort?: DataTableSort | null;
	onSort?: (field: string) => void;
	rowActions?: (row: T) => DataTableAction[];
	toolbar?: ReactNode;
	mobileCardRender?: (row: T, ctx: { isPinned: boolean }) => ReactNode;
	onRowClick?: (id: string) => void;
	isMobile?: boolean;
	sentinel?: ReactNode;
}

function SortIcon({ sort, field }: { sort: DataTableSort | null | undefined; field: string }) {
	if (sort?.field !== field) return <ArrowUpDown className="ml-1 size-3.5" aria-hidden="true" />;
	if (sort.direction === "asc") return <ArrowUp className="ml-1 size-3.5" aria-hidden="true" data-testid="sort-asc" />;
	return <ArrowDown className="ml-1 size-3.5" aria-hidden="true" data-testid="sort-desc" />;
}

export function DataTable<T>({
	columns,
	rows,
	getRowId,
	pinnedRows,
	isLoading,
	loadingRows = 5,
	emptyMessage = "Ничего не найдено",
	emptyMessageWhenFiltered,
	hasFilters,
	selection,
	sort,
	onSort,
	rowActions,
	toolbar,
	mobileCardRender,
	onRowClick,
	isMobile,
	sentinel,
}: DataTableProps<T>) {
	const allSelected = !!selection && rows.length > 0 && rows.every((r) => selection.selectedIds.has(getRowId(r)));

	const emptyText = hasFilters && emptyMessageWhenFiltered ? emptyMessageWhenFiltered : emptyMessage;

	if (isMobile) {
		return (
			<div className="flex h-full flex-col gap-3" data-testid="data-table">
				{toolbar}
				{isLoading ? (
					<div className="flex flex-col gap-3 px-3">
						{Array.from({ length: loadingRows }, (_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cards
							<Skeleton key={i} data-testid="data-table-card-skeleton" className="h-24 w-full" />
						))}
					</div>
				) : rows.length === 0 && (!pinnedRows || pinnedRows.length === 0) ? (
					<div className="mx-3 flex flex-1 items-center justify-center rounded-md bg-muted/20 text-sm text-muted-foreground">
						{emptyText}
					</div>
				) : (
					<div className="flex flex-col gap-3 px-3">
						{pinnedRows?.map((row) => {
							const id = getRowId(row);
							return (
								<div key={`pinned-${id}`} data-testid="data-table-pinned-card">
									{mobileCardRender?.(row, { isPinned: true })}
								</div>
							);
						})}
						{rows.map((row) => {
							const id = getRowId(row);
							return <div key={id}>{mobileCardRender?.(row, { isPinned: false })}</div>;
						})}
					</div>
				)}
				{sentinel}
			</div>
		);
	}

	const isEmpty = !isLoading && rows.length === 0 && (!pinnedRows || pinnedRows.length === 0);

	return (
		<div className="flex h-full flex-col gap-3" data-testid="data-table">
			{toolbar}
			<div className="flex flex-1 flex-col">
				<Table>
					<TableHeader>
						<TableRow className="border-t bg-transparent hover:bg-transparent">
							{selection && (
								<TableHead className="w-10">
									<Checkbox
										checked={allSelected}
										onCheckedChange={() => selection.onChange("all")}
										aria-label="Выбрать все"
									/>
								</TableHead>
							)}
							{columns.map((col) => (
								<TableHead key={col.id} className={cn(col.align === "right" && "text-right", col.headerClassName)}>
									{col.sortable && onSort ? (
										<button
											type="button"
											className="inline-flex items-center font-medium hover:text-foreground"
											onClick={() => onSort(col.sortField ?? col.id)}
										>
											{col.header}
											<SortIcon sort={sort ?? null} field={col.sortField ?? col.id} />
										</button>
									) : (
										col.header
									)}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: loadingRows }, (_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
								<TableRow key={i}>
									{selection && (
										<TableCell>
											<Skeleton className="size-4" />
										</TableCell>
									)}
									{columns.map((col) => (
										<TableCell key={col.id}>
											<Skeleton className="h-4 w-20" />
										</TableCell>
									))}
								</TableRow>
							))
						) : isEmpty ? null : (
							<>
								{pinnedRows?.map((row) => (
									<DataTableRow
										key={`pinned-${getRowId(row)}`}
										row={row}
										rowId={getRowId(row)}
										columns={columns}
										isPinned
										selection={selection}
										className="bg-accent/60 hover:bg-accent/80"
									/>
								))}
								{rows.map((row) => (
									<DataTableRow
										key={getRowId(row)}
										row={row}
										rowId={getRowId(row)}
										columns={columns}
										isPinned={false}
										selection={selection}
										rowActions={rowActions}
										onRowClick={onRowClick}
									/>
								))}
							</>
						)}
					</TableBody>
				</Table>
				{isEmpty && (
					<div className="flex flex-1 items-center justify-center bg-muted/20 text-sm text-muted-foreground">
						{emptyText}
					</div>
				)}
			</div>
			{sentinel}
		</div>
	);
}

interface DataTableRowProps<T> {
	row: T;
	rowId: string;
	columns: DataTableColumn<T>[];
	isPinned: boolean;
	selection?: DataTableSelection;
	rowActions?: (row: T) => DataTableAction[];
	onRowClick?: (id: string) => void;
	className?: string;
}

function DataTableRow<T>({
	row,
	rowId,
	columns,
	isPinned,
	selection,
	rowActions,
	onRowClick,
	className,
}: DataTableRowProps<T>) {
	const actions = rowActions?.(row) ?? [];
	const interactive = onRowClick != null;

	const tableRow = (
		<TableRow
			className={cn(interactive && "cursor-pointer hover:bg-muted/50", className)}
			onClick={interactive ? () => onRowClick?.(rowId) : undefined}
			data-testid={isPinned ? "data-table-pinned-row" : undefined}
		>
			{selection &&
				(isPinned ? (
					<TableCell />
				) : (
					<TableCell onClick={(e) => e.stopPropagation()}>
						<Checkbox
							checked={selection.selectedIds.has(rowId)}
							onCheckedChange={() => selection.onChange(rowId)}
							aria-label={selection.getRowLabel?.(rowId) ?? `Выбрать ${rowId}`}
						/>
					</TableCell>
				))}
			{columns.map((col) => (
				<TableCell key={col.id} className={cn(col.align === "right" && "text-right tabular-nums", col.cellClassName)}>
					{col.cell(row, { isPinned })}
				</TableCell>
			))}
		</TableRow>
	);

	if (actions.length === 0) return tableRow;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{tableRow}</ContextMenuTrigger>
			<ContextMenuContent>
				{actions.map((action, idx) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: action list is small and stable per render
					<ContextMenuItem key={idx} onSelect={action.onSelect}>
						{action.icon}
						{action.label}
					</ContextMenuItem>
				))}
			</ContextMenuContent>
		</ContextMenu>
	);
}
