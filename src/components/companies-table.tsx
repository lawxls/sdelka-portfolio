import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Building2, LoaderCircle } from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AddressSummary, CompanySortField, CompanySortState, CompanySummary } from "@/data/types";
import { ADDRESS_TYPE_LABELS } from "@/data/types";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

interface SortableColumn {
	label: string;
	field: CompanySortField;
}

const SORTABLE_COLUMNS: SortableColumn[] = [
	{ label: "НАЗВАНИЕ", field: "name" },
	{ label: "СОТРУДНИКИ", field: "employeeCount" },
	{ label: "ЗАКУПКИ", field: "procurementItemCount" },
];

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"] as const;

function SortIcon({ field, sort }: { field: CompanySortField; sort: CompanySortState | null }) {
	if (sort?.field !== field) return <ArrowUpDown className="size-3.5 text-muted-foreground/50" aria-hidden="true" />;
	return sort.direction === "asc" ? (
		<ArrowUp className="size-3.5" aria-hidden="true" />
	) : (
		<ArrowDown className="size-3.5" aria-hidden="true" />
	);
}

function AddressTypeBadge({ type }: { type: AddressSummary["type"] }) {
	return (
		<Badge variant="secondary" className="text-[10px]">
			{ADDRESS_TYPE_LABELS[type]}
		</Badge>
	);
}

function ExtraAddressesPopover({ addresses }: { addresses: AddressSummary[] }) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="inline-flex h-5 items-center rounded-4xl bg-muted px-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
				>
					+{addresses.length}
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64">
				<div className="flex flex-col gap-2">
					{addresses.map((addr) => (
						<div key={addr.id} className="flex items-center justify-between gap-2 text-sm">
							<span className="truncate">{addr.name}</span>
							<AddressTypeBadge type={addr.type} />
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

interface CompaniesTableProps {
	companies: CompanySummary[];
	sort: CompanySortState | null;
	hasNextPage: boolean;
	loadMore: () => void;
	onSort: (field: CompanySortField) => void;
	onRowClick?: (company: CompanySummary) => void;
	isLoading?: boolean;
	isFetchingNextPage?: boolean;
	error?: Error | null;
	onRetry?: () => void;
	isMobile?: boolean;
}

export function CompaniesTable({
	companies,
	sort,
	hasNextPage,
	loadMore,
	onSort,
	onRowClick,
	isLoading,
	isFetchingNextPage,
	error,
	onRetry,
	isMobile,
}: CompaniesTableProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const sentinelRef = useIntersectionObserver(loadMore, {
		root: scrollContainerRef.current,
	});

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
									<Skeleton className="h-4 w-32" />
									<Skeleton className="mt-1 h-3 w-24" />
									<div className="mt-3 grid grid-cols-2 gap-2">
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
							data-testid="companies-error"
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
					{!isLoading && !error && companies.length === 0 && (
						<div
							className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground"
							data-testid="companies-empty"
						>
							<Building2 className="size-8" aria-hidden="true" />
							<p className="text-sm">Компании не найдены</p>
						</div>
					)}
					{!isLoading && !error && companies.length > 0 && (
						<div className="flex flex-col gap-3 p-4">
							{companies.map((company) => (
								<CompanyCard key={company.id} company={company} onClick={onRowClick} />
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

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div
				ref={scrollContainerRef}
				className="flex flex-1 flex-col overflow-auto touch-manipulation"
				data-testid="table-scroll-container"
			>
				<Table>
					<TableHeader>
						<TableRow>
							{SORTABLE_COLUMNS.map((col) => (
								<TableHead key={col.field} className={col.field === "name" ? stickyHead : `text-right ${stickyHead}`}>
									<button
										type="button"
										className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
										onClick={() => onSort(col.field)}
										aria-label={`Сортировать по ${col.label}`}
									>
										{col.label}
										<SortIcon field={col.field} sort={sort} />
									</button>
								</TableHead>
							))}
							<TableHead className={stickyHead}>АДРЕСА</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading &&
							SKELETON_KEYS.map((key) => (
								<TableRow key={key} data-testid="skeleton-row">
									<TableCell>
										<Skeleton className="h-4 w-32" />
										<Skeleton className="mt-1 h-3 w-24" />
									</TableCell>
									<TableCell className="text-right">
										<Skeleton className="ml-auto h-4 w-8" />
									</TableCell>
									<TableCell className="text-right">
										<Skeleton className="ml-auto h-4 w-8" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-28" />
									</TableCell>
								</TableRow>
							))}
						{error && !isLoading && (
							<TableRow>
								<TableCell colSpan={4} className="h-48">
									<div
										className="flex flex-col items-center justify-center gap-3 text-muted-foreground"
										data-testid="companies-error"
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
							companies.map((company) => {
								const firstAddress = company.addresses[0];
								const extraAddresses = company.addresses.slice(1);

								return (
									<TableRow
										key={company.id}
										className={onRowClick ? "cursor-pointer" : undefined}
										onClick={onRowClick ? () => onRowClick(company) : undefined}
										data-testid={`row-${company.id}`}
									>
										<TableCell className="font-medium">
											<div>
												<span>{company.name}</span>
												{company.isMain && (
													<Badge variant="outline" className="ml-2 text-[10px]">
														Основная
													</Badge>
												)}
											</div>
											<div className="mt-0.5 text-xs text-muted-foreground">{company.responsibleEmployeeName}</div>
										</TableCell>
										<TableCell className="text-right tabular-nums">{company.employeeCount}</TableCell>
										<TableCell className="text-right tabular-nums">{company.procurementItemCount}</TableCell>
										<TableCell>
											{firstAddress && (
												<div className="flex items-center gap-2">
													<span className="text-sm truncate">{firstAddress.name}</span>
													<AddressTypeBadge type={firstAddress.type} />
													{extraAddresses.length > 0 && <ExtraAddressesPopover addresses={extraAddresses} />}
												</div>
											)}
										</TableCell>
									</TableRow>
								);
							})}
					</TableBody>
				</Table>
				{!isLoading && !error && companies.length === 0 && (
					<div
						className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"
						data-testid="companies-empty"
					>
						<Building2 className="size-8" aria-hidden="true" />
						<p className="text-sm">Компании не найдены</p>
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

function CompanyCard({ company, onClick }: { company: CompanySummary; onClick?: (c: CompanySummary) => void }) {
	const firstAddress = company.addresses[0];
	const extraAddresses = company.addresses.slice(1);

	return (
		<article
			className={`rounded-lg border bg-background p-4 ${onClick ? "cursor-pointer active:bg-muted/50 transition-colors" : ""}`}
			onClick={onClick ? () => onClick(company) : undefined}
			onKeyDown={
				onClick
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick(company);
							}
						}
					: undefined
			}
			tabIndex={onClick ? 0 : undefined}
			role={onClick ? "button" : undefined}
			data-testid={`card-${company.id}`}
		>
			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium text-sm">{company.name}</span>
						{company.isMain && (
							<Badge variant="outline" className="text-[10px]">
								Основная
							</Badge>
						)}
					</div>
					<div className="mt-0.5 text-xs text-muted-foreground">{company.responsibleEmployeeName}</div>
				</div>
			</div>

			{firstAddress && (
				<div className="mt-2 flex items-center gap-2">
					<span className="text-xs text-muted-foreground truncate">{firstAddress.name}</span>
					<AddressTypeBadge type={firstAddress.type} />
					{extraAddresses.length > 0 && <ExtraAddressesPopover addresses={extraAddresses} />}
				</div>
			)}

			<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				<div>
					<dt className="text-xs text-muted-foreground">Сотрудники</dt>
					<dd className="tabular-nums">{company.employeeCount}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Закупки</dt>
					<dd className="tabular-nums">{company.procurementItemCount}</dd>
				</div>
			</dl>
		</article>
	);
}
