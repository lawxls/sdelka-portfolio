import {
	Archive,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Download,
	ListFilter,
	LoaderCircle,
	Search,
	Trash2,
} from "lucide-react";
import { useRef } from "react";
import { SupplierStatusIndicator } from "@/components/supplier-status-indicator";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Supplier, SupplierSortField, SupplierSortState, SupplierStatus } from "@/data/supplier-types";
import { SUPPLIER_STATUS_LABELS, SUPPLIER_STATUSES } from "@/data/supplier-types";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { formatCurrency, formatRating, stripProtocol } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SuppliersTableProps {
	suppliers: Supplier[];
	isLoading: boolean;
	search: string;
	onSearchChange: (query: string) => void;
	sort: SupplierSortState;
	onSort: (field: SupplierSortField) => void;
	activeStatuses: SupplierStatus[];
	onStatusFilter: (status: SupplierStatus) => void;
	selectedIds: Set<string>;
	onSelectionChange: (idOrAll: string) => void;
	onArchive: () => void;
	isArchiving: boolean;
	onDelete: () => void;
	isDeleting: boolean;
	onRowClick?: (supplierId: string) => void;
	hasNextPage?: boolean;
	loadMore?: () => void;
	isFetchingNextPage?: boolean;
}

const SORTABLE_COLUMNS: { label: string; field: SupplierSortField }[] = [
	{ label: "КОМПАНИЯ", field: "companyName" },
	{ label: "ЦЕНА/ЕД.", field: "pricePerUnit" },
	{ label: "TCO", field: "tco" },
	{ label: "РЕЙТИНГ", field: "rating" },
];

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FILTER_BTN_ACTIVE = "font-medium text-highlight-foreground";

function ratingColor(value: number): string {
	if (value >= 80) return "text-[oklch(0.50_0.18_142)]";
	if (value >= 60) return "text-[oklch(0.55_0.15_120)]";
	if (value >= 40) return "text-[oklch(0.60_0.15_85)]";
	if (value >= 20) return "text-[oklch(0.55_0.18_50)]";
	return "text-[oklch(0.55_0.20_25)]";
}

function SortIcon({ sort, field }: { sort: SupplierSortState; field: SupplierSortField }) {
	if (sort?.field !== field) return <ArrowUpDown className="ml-1 size-3.5" aria-hidden="true" />;
	if (sort.direction === "asc") return <ArrowUp className="ml-1 size-3.5" aria-hidden="true" data-testid="sort-asc" />;
	return <ArrowDown className="ml-1 size-3.5" aria-hidden="true" data-testid="sort-desc" />;
}

export function SuppliersTable({
	suppliers,
	isLoading,
	search,
	onSearchChange,
	sort,
	onSort,
	activeStatuses,
	onStatusFilter,
	selectedIds,
	onSelectionChange,
	onArchive,
	isArchiving,
	onDelete,
	isDeleting,
	onRowClick,
	hasNextPage,
	loadMore,
	isFetchingNextPage,
}: SuppliersTableProps) {
	const isMobile = useIsMobile();
	const sentinelRef = useIntersectionObserver(() => loadMore?.());
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onSearchChange(value), 300);
	}

	const hasSelection = selectedIds.size > 0;
	const allSelected = suppliers.length > 0 && selectedIds.size === suppliers.length;

	if (!isLoading && suppliers.length === 0 && !search && activeStatuses.length === 0) {
		return <p className="py-8 text-center text-sm text-muted-foreground">Нет поставщиков</p>;
	}

	const toolbar = hasSelection ? (
		<div className="mx-3 flex items-center gap-3 rounded-md bg-muted px-3 py-2">
			<span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={isArchiving}
				onClick={onArchive}
				aria-label="Архивировать"
			>
				<Archive className="mr-1 size-4" aria-hidden="true" />
				Архивировать
			</Button>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button type="button" variant="destructive" size="sm" disabled={isDeleting} aria-label="Удалить">
						<Trash2 className="mr-1 size-4" aria-hidden="true" />
						Удалить
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Удалить поставщиков?</AlertDialogTitle>
						<AlertDialogDescription>
							{selectedIds.size === 1
								? "Выбранный поставщик будет удалён. Это действие нельзя отменить."
								: `Выбранные поставщики (${selectedIds.size}) будут удалены. Это действие нельзя отменить.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={onDelete}>
							Удалить
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	) : (
		<div className="flex items-center gap-2 px-3">
			<div className="relative max-w-56">
				<Search
					className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden="true"
				/>
				<Input
					type="search"
					placeholder="Поиск…"
					defaultValue={search}
					onChange={handleSearchInput}
					className="h-8 pl-8 text-sm"
					spellCheck={false}
					autoComplete="off"
				/>
			</div>
			<Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button type="button" variant="ghost" size="icon-sm" aria-label="Фильтр по статусу" className="relative">
								<ListFilter aria-hidden="true" />
								{activeStatuses.length > 0 && (
									<span
										className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary"
										data-testid="filter-indicator"
									/>
								)}
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Фильтр по статусу</TooltipContent>
				</Tooltip>
				<PopoverContent align="end" className="w-56">
					<div className="flex flex-col gap-1">
						{SUPPLIER_STATUSES.map((status) => (
							<button
								key={status}
								type="button"
								aria-label={SUPPLIER_STATUS_LABELS[status]}
								className={cn(FILTER_BTN, activeStatuses.includes(status) && FILTER_BTN_ACTIVE)}
								onClick={() => onStatusFilter(status)}
							>
								{SUPPLIER_STATUS_LABELS[status]}
							</button>
						))}
					</div>
				</PopoverContent>
			</Popover>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button type="button" variant="ghost" size="icon-sm" aria-label="Скачать таблицу">
						<Download aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Скачать таблицу</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button type="button" variant="ghost" size="icon-sm" aria-label="Архив">
						<Archive aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Архив</TooltipContent>
			</Tooltip>
		</div>
	);

	const sentinel = (
		<>
			{hasNextPage && <div ref={sentinelRef} data-testid="scroll-sentinel" className="h-px" />}
			{isFetchingNextPage && (
				<div className="flex justify-center py-4" data-testid="loading-more-spinner">
					<LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Загрузка…" />
				</div>
			)}
		</>
	);

	if (isMobile) {
		return (
			<div className="flex flex-col gap-3">
				{toolbar}
				{isLoading ? (
					<div className="flex flex-col gap-3 px-3">
						{Array.from({ length: 4 }, (_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cards never reorder
							<div key={i} data-testid="supplier-card-skeleton" className="rounded-lg border p-4">
								<Skeleton className="mb-2 h-5 w-32" />
								<Skeleton className="mb-3 h-4 w-20" />
								<div className="grid grid-cols-3 gap-2">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-full" />
								</div>
							</div>
						))}
					</div>
				) : suppliers.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">Ничего не найдено</p>
				) : (
					<div className="flex flex-col gap-3 px-3">
						{suppliers.map((supplier) => (
							<button
								key={supplier.id}
								type="button"
								data-testid="supplier-card"
								className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
								onClick={() => onRowClick?.(supplier.id)}
							>
								<div className="mb-1 font-medium">{supplier.companyName}</div>
								<SupplierStatusIndicator status={supplier.status} className="mb-3 text-xs" />
								<div className="grid grid-cols-3 gap-x-4 text-sm">
									<div>
										<div className="text-muted-foreground">Цена/ед.</div>
										<div className="tabular-nums">{formatCurrency(supplier.pricePerUnit)}</div>
									</div>
									<div>
										<div className="text-muted-foreground">TCO</div>
										<div className="tabular-nums">{formatCurrency(supplier.tco)}</div>
									</div>
									<div>
										<div className="text-muted-foreground">Рейтинг</div>
										<div className={`tabular-nums ${supplier.rating != null ? ratingColor(supplier.rating) : ""}`}>
											{formatRating(supplier.rating)}
										</div>
									</div>
								</div>
							</button>
						))}
					</div>
				)}
				{sentinel}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{toolbar}

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-10">
							<Checkbox
								checked={allSelected}
								onCheckedChange={() => onSelectionChange("all")}
								aria-label="Выбрать все"
							/>
						</TableHead>
						<TableHead>
							<button
								type="button"
								className="inline-flex items-center font-medium hover:text-foreground"
								onClick={() => onSort("companyName")}
							>
								КОМПАНИЯ
								<SortIcon sort={sort} field="companyName" />
							</button>
						</TableHead>
						<TableHead>EMAIL</TableHead>
						<TableHead>САЙТ</TableHead>
						{SORTABLE_COLUMNS.filter((col) => col.field !== "companyName").map((col) => (
							<TableHead key={col.field} className="text-right">
								<button
									type="button"
									className="inline-flex items-center font-medium hover:text-foreground"
									onClick={() => onSort(col.field)}
								>
									{col.label}
									<SortIcon sort={sort} field={col.field} />
								</button>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						Array.from({ length: 5 }, (_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows never reorder
							<TableRow key={i}>
								{Array.from({ length: 7 }, (_, j) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
									<TableCell key={j}>
										<Skeleton className="h-4 w-20" />
									</TableCell>
								))}
							</TableRow>
						))
					) : suppliers.length === 0 ? (
						<TableRow>
							<TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
								Ничего не найдено
							</TableCell>
						</TableRow>
					) : (
						suppliers.map((supplier) => (
							<TableRow
								key={supplier.id}
								className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
								onClick={() => onRowClick?.(supplier.id)}
							>
								<TableCell onClick={(e) => e.stopPropagation()}>
									<Checkbox
										checked={selectedIds.has(supplier.id)}
										onCheckedChange={() => onSelectionChange(supplier.id)}
										aria-label={`Выбрать ${supplier.companyName}`}
									/>
								</TableCell>
								<TableCell>
									<div className="flex flex-col gap-1">
										<span className="font-medium">{supplier.companyName}</span>
										<SupplierStatusIndicator status={supplier.status} className="text-xs" />
									</div>
								</TableCell>
								<TableCell className="cursor-text select-text" onClick={(e) => e.stopPropagation()}>
									{supplier.email}
								</TableCell>
								<TableCell onClick={(e) => e.stopPropagation()}>
									<a
										href={supplier.website.startsWith("http") ? supplier.website : `https://${supplier.website}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
									>
										{stripProtocol(supplier.website)}
									</a>
								</TableCell>
								<TableCell className="text-right tabular-nums">{formatCurrency(supplier.pricePerUnit)}</TableCell>
								<TableCell className="text-right tabular-nums">{formatCurrency(supplier.tco)}</TableCell>
								<TableCell
									className={`text-right tabular-nums ${supplier.rating != null ? ratingColor(supplier.rating) : ""}`}
								>
									{formatRating(supplier.rating)}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
			{sentinel}
		</div>
	);
}
