import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Search, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Supplier, SupplierSortField, SupplierSortState, SupplierStatus } from "@/data/supplier-types";
import { SUPPLIER_STATUS_LABELS, SUPPLIER_STATUSES } from "@/data/supplier-types";
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
	onDelete: () => void;
	isDeleting: boolean;
	onRowClick?: (supplierId: string) => void;
}

const SORTABLE_COLUMNS: { label: string; field: SupplierSortField }[] = [
	{ label: "Компания", field: "companyName" },
	{ label: "Цена/ед.", field: "pricePerUnit" },
	{ label: "TCO", field: "tco" },
	{ label: "Рейтинг", field: "rating" },
];

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FILTER_BTN_ACTIVE = "font-medium text-highlight-foreground";

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
	onDelete,
	isDeleting,
	onRowClick,
}: SuppliersTableProps) {
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onSearchChange(value), 300);
	}

	const hasSelection = selectedIds.size > 0;
	const allSelected = suppliers.length > 0 && selectedIds.size === suppliers.length;

	if (isLoading) {
		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-10" />
						<TableHead>Компания</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Сайт</TableHead>
						<TableHead>Цена/ед.</TableHead>
						<TableHead>TCO</TableHead>
						<TableHead>Рейтинг</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 5 }, (_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows never reorder
						<TableRow key={i}>
							{Array.from({ length: 7 }, (_, j) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
								<TableCell key={j}>
									<Skeleton className="h-4 w-20" />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}

	if (suppliers.length === 0 && !search && activeStatuses.length === 0) {
		return <p className="py-8 text-center text-sm text-muted-foreground">Нет поставщиков</p>;
	}

	return (
		<div className="flex flex-col gap-3">
			{/* Toolbar: selection actions or search/filter */}
			{hasSelection ? (
				<div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
					<span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onClick={onDelete}
						disabled={isDeleting}
						aria-label="Удалить"
					>
						<Trash2 className="mr-1 size-4" aria-hidden="true" />
						Удалить
					</Button>
				</div>
			) : (
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<Search
							className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<Input
							type="search"
							placeholder="Поиск…"
							defaultValue={search}
							onChange={handleSearchInput}
							className="pl-8"
							spellCheck={false}
							autoComplete="off"
						/>
					</div>
					<Popover>
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
				</div>
			)}

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
						{SORTABLE_COLUMNS.map((col) => (
							<TableHead key={col.field}>
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
						<TableHead>Email</TableHead>
						<TableHead>Сайт</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{suppliers.length === 0 ? (
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
										<Badge variant="outline" className="w-fit text-xs">
											{SUPPLIER_STATUS_LABELS[supplier.status]}
										</Badge>
									</div>
								</TableCell>
								<TableCell className="tabular-nums">{formatCurrency(supplier.pricePerUnit)}</TableCell>
								<TableCell className="tabular-nums">{formatCurrency(supplier.tco)}</TableCell>
								<TableCell className="tabular-nums">{formatRating(supplier.rating)}</TableCell>
								<TableCell>{supplier.email}</TableCell>
								<TableCell>{stripProtocol(supplier.website)}</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
