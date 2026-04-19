import { Archive, Download, ListFilter, LoaderCircle, Search, UserCheck } from "lucide-react";
import { useMemo, useRef } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { SupplierStatusIndicator } from "@/components/supplier-status-indicator";
import { DeliveryValue } from "@/components/supplier-value-displays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Supplier, SupplierSortField, SupplierSortState, SupplierStatus } from "@/data/supplier-types";
import { SUPPLIER_STATUS_LABELS, SUPPLIER_STATUSES } from "@/data/supplier-types";
import type { CurrentSupplier, PaymentType, ProcurementItem } from "@/data/types";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { formatCurrency, formatPercent, formatRussianPlural, savingsClassName } from "@/lib/format";
import { batchCost, savingsPercent } from "@/lib/math";
import { cn } from "@/lib/utils";

interface SuppliersTableProps {
	suppliers: Supplier[];
	item: Pick<ProcurementItem, "quantityPerDelivery">;
	currentSupplier?: CurrentSupplier | null;
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
	onArchiveSupplier: (supplierId: string) => void;
	onSelectSupplier?: (supplierId: string, companyName: string) => void;
	showArchived: boolean;
	onToggleArchived: () => void;
	onRowClick?: (supplierId: string) => void;
	hasNextPage?: boolean;
	loadMore?: () => void;
	isFetchingNextPage?: boolean;
}

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FILTER_BTN_ACTIVE = "font-medium text-highlight-foreground";

const PINNED_ID = "__current__";

function formatPaymentType(paymentType: PaymentType, deferralDays: number): string {
	if (paymentType === "prepayment") return "Предоплата";
	if (paymentType === "prepayment_30_70") return "Предоплата 30/70";
	if (deferralDays > 0) return `Отсрочка ${formatRussianPlural(deferralDays, ["день", "дня", "дней"])}`;
	return "Отсрочка";
}

function formatLeadTime(days: number | null): string {
	if (days == null) return "\u2014";
	return formatRussianPlural(days, ["день", "дня", "дней"]);
}

function buildPinnedSupplier(currentSupplier: CurrentSupplier): Supplier {
	return {
		id: PINNED_ID,
		itemId: "",
		companyName: currentSupplier.companyName,
		status: "получено_кп",
		archived: false,
		email: "",
		website: "",
		address: "",
		pricePerUnit: currentSupplier.pricePerUnit,
		tco: null,
		rating: null,
		deliveryCost: null,
		paymentType: currentSupplier.paymentType ?? "prepayment",
		deferralDays: currentSupplier.deferralDays,
		leadTimeDays: null,
		aiDescription: "",
		aiRecommendations: "",
		documents: [],
		chatHistory: [],
		positionOffers: [],
	};
}

export function SuppliersTable({
	suppliers,
	item,
	currentSupplier,
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
	onArchiveSupplier,
	onSelectSupplier,
	showArchived,
	onToggleArchived,
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
	const supplierNamesById = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of suppliers) map.set(s.id, s.companyName);
		return map;
	}, [suppliers]);

	if (
		!isLoading &&
		suppliers.length === 0 &&
		!currentSupplier &&
		!search &&
		activeStatuses.length === 0 &&
		!showArchived
	) {
		return <p className="py-8 text-center text-sm text-muted-foreground">Нет поставщиков</p>;
	}

	const rowsCount = suppliers.length + (currentSupplier ? 1 : 0);

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
		</div>
	) : (
		<div className="flex items-center gap-2 px-3">
			<span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
				Всего: {rowsCount}
			</span>
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
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Фильтр по статусу"
								className="relative ml-auto"
							>
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
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Архив"
						aria-pressed={showArchived}
						onClick={onToggleArchived}
						className={showArchived ? "bg-muted" : ""}
					>
						<Archive aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Архив</TooltipContent>
			</Tooltip>
		</div>
	);

	const columns: DataTableColumn<Supplier>[] = [
		{
			id: "companyName",
			header: "КОМПАНИЯ",
			sortable: true,
			cell: (s, { isPinned }) => (
				<div className="flex flex-col gap-1">
					<span className="font-medium">{s.companyName}</span>
					{isPinned ? (
						<span className="inline-flex items-center gap-1.5 text-xs font-medium text-folder-orange">
							<UserCheck className="size-3" aria-hidden="true" />
							Ваш поставщик
						</span>
					) : (
						<SupplierStatusIndicator status={s.status} className="text-xs" />
					)}
				</div>
			),
		},
		{
			id: "paymentType",
			header: "ТИП ОПЛАТЫ",
			cell: (s) => formatPaymentType(s.paymentType, s.deferralDays),
		},
		{
			id: "deliveryCost",
			header: "ДОСТАВКА",
			cell: (s, { isPinned }) =>
				isPinned ? <span className="text-muted-foreground">{"\u2014"}</span> : <DeliveryValue cost={s.deliveryCost} />,
		},
		{
			id: "leadTimeDays",
			header: "СРОК ПОСТАВКИ",
			sortable: true,
			align: "right",
			cell: (s, { isPinned }) =>
				isPinned ? <span className="text-muted-foreground">{"\u2014"}</span> : formatLeadTime(s.leadTimeDays),
		},
		{
			id: "batchCost",
			header: "СТОИМОСТЬ",
			sortable: true,
			align: "right",
			cell: (s) => formatCurrency(batchCost(s, item)),
		},
		{
			id: "tco",
			header: "ТСО/ЕД.",
			sortable: true,
			align: "right",
			cell: (s) => formatCurrency(s.tco),
		},
		{
			id: "savings",
			header: "ЭКОНОМИЯ",
			sortable: true,
			align: "right",
			cell: (s, { isPinned }) => {
				if (isPinned) return <span className="text-muted-foreground">{"\u2014"}</span>;
				const value = savingsPercent(s, currentSupplier ?? null, item);
				return <span className={savingsClassName(value)}>{formatPercent(value)}</span>;
			},
		},
	];

	const pinnedRows = currentSupplier ? [buildPinnedSupplier(currentSupplier)] : undefined;

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

	function renderMobileCard(s: Supplier, ctx: { isPinned: boolean }) {
		const cost = batchCost(s, item);
		const savings = ctx.isPinned ? null : savingsPercent(s, currentSupplier ?? null, item);
		return (
			<button
				type="button"
				data-testid="supplier-card"
				className={cn(
					"rounded-lg border p-4 text-left transition-colors",
					ctx.isPinned ? "bg-accent/60" : "bg-card hover:bg-muted/50 active:bg-muted",
				)}
				onClick={ctx.isPinned ? undefined : () => onRowClick?.(s.id)}
			>
				<div className="mb-1 flex items-center justify-between gap-2">
					<span className="font-medium">{s.companyName}</span>
				</div>
				{ctx.isPinned ? (
					<span className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-folder-orange">
						<UserCheck className="size-3" aria-hidden="true" />
						Ваш поставщик
					</span>
				) : (
					<SupplierStatusIndicator status={s.status} className="mb-3 text-xs" />
				)}
				<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<div>
						<div className="text-muted-foreground">Тип оплаты</div>
						<div>{formatPaymentType(s.paymentType, s.deferralDays)}</div>
					</div>
					<div>
						<div className="text-muted-foreground">Доставка</div>
						{ctx.isPinned ? <div>{"\u2014"}</div> : <DeliveryValue cost={s.deliveryCost} />}
					</div>
					<div>
						<div className="text-muted-foreground">Срок поставки</div>
						<div className="tabular-nums">{ctx.isPinned ? "\u2014" : formatLeadTime(s.leadTimeDays)}</div>
					</div>
					<div>
						<div className="text-muted-foreground">Стоимость</div>
						<div className="tabular-nums">{formatCurrency(cost)}</div>
					</div>
					<div>
						<div className="text-muted-foreground">ТСО/ед.</div>
						<div className="tabular-nums">{formatCurrency(s.tco)}</div>
					</div>
					<div>
						<div className="text-muted-foreground">Экономия</div>
						<div className={cn("tabular-nums", !ctx.isPinned && savingsClassName(savings))}>
							{ctx.isPinned ? "\u2014" : formatPercent(savings)}
						</div>
					</div>
				</div>
			</button>
		);
	}

	if (isMobile && isLoading) {
		return (
			<div className="flex flex-col gap-3">
				{toolbar}
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
			</div>
		);
	}

	return (
		<DataTable<Supplier>
			columns={columns}
			rows={suppliers}
			pinnedRows={pinnedRows}
			getRowId={(s) => s.id}
			isLoading={isLoading}
			emptyMessage="Ничего не найдено"
			selection={{
				selectedIds,
				onChange: onSelectionChange,
				getRowLabel: (id) => `Выбрать ${supplierNamesById.get(id) ?? id}`,
			}}
			sort={sort}
			onSort={(field) => onSort(field as SupplierSortField)}
			rowActions={(s) => {
				const actions = [];
				if (s.status === "получено_кп" && onSelectSupplier) {
					actions.push({
						label: "Выбрать текущего поставщика",
						icon: <UserCheck className="size-3.5" />,
						onSelect: () => onSelectSupplier(s.id, s.companyName),
					});
				}
				actions.push({
					label: "Архивировать",
					icon: <Archive className="size-3.5" />,
					onSelect: () => onArchiveSupplier(s.id),
				});
				return actions;
			}}
			toolbar={toolbar}
			mobileCardRender={renderMobileCard}
			onRowClick={onRowClick}
			isMobile={isMobile}
			sentinel={sentinel}
		/>
	);
}
