import { Archive, Download, ListFilter, LoaderCircle, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DeliveryValue } from "@/components/supplier-value-displays";
import { ToolbarSearch } from "@/components/toolbar-search";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Supplier, SupplierSortField, SupplierSortState } from "@/data/supplier-types";
import type { CurrentSupplier, PaymentType, ProcurementItem } from "@/data/types";
import { formatQuotePaymentType, PAYMENT_TYPE_LABELS, PAYMENT_TYPES } from "@/data/types";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
	formatCurrency,
	formatLeadTime,
	formatPercent,
	formatRussianPlural,
	formatShortDate,
	savingsClassName,
} from "@/lib/format";
import { batchCost, savingsPercent } from "@/lib/math";
import { cn } from "@/lib/utils";

export type DeliveryFilter = "pickup" | "free" | "paid";
const DELIVERY_FILTER_LABELS: Record<DeliveryFilter, string> = {
	pickup: "Самовывоз",
	free: "Бесплатная",
	paid: "Платная",
};
const DELIVERY_FILTERS: DeliveryFilter[] = ["pickup", "free", "paid"];

export function matchesDeliveryFilter(deliveryCost: number | null, filters: DeliveryFilter[]): boolean {
	if (filters.length === 0) return true;
	if (deliveryCost == null) return filters.includes("pickup");
	if (deliveryCost === 0) return filters.includes("free");
	return filters.includes("paid");
}

interface OffersTableProps {
	suppliers: Supplier[];
	/** Total count across all pages (matching current server-side filters). */
	totalCount: number;
	item: Pick<ProcurementItem, "quantityPerDelivery">;
	currentSupplier?: CurrentSupplier | null;
	isLoading: boolean;
	search: string;
	onSearchChange: (query: string) => void;
	sort: SupplierSortState;
	onSort: (field: SupplierSortField) => void;
	activePaymentTypes: PaymentType[];
	onPaymentTypeFilter: (t: PaymentType) => void;
	activeDeliveryFilters: DeliveryFilter[];
	onDeliveryFilter: (t: DeliveryFilter) => void;
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

function buildPinnedSupplier(currentSupplier: CurrentSupplier): Supplier {
	return {
		id: PINNED_ID,
		itemId: "",
		companyName: currentSupplier.companyName,
		status: "получено_кп",
		archived: false,
		inn: currentSupplier.inn ?? "",
		companyType: "производитель",
		region: "",
		foundedYear: 0,
		revenue: 0,
		employeeCount: 0,
		email: "",
		website: "",
		address: "",
		postalCode: "",
		pricePerUnit: currentSupplier.pricePerUnit,
		tco: null,
		rating: null,
		deliveryCost: null,
		paymentType: currentSupplier.paymentType ?? "prepayment",
		deferralDays: currentSupplier.deferralDays,
		prepaymentPercent: currentSupplier.prepaymentPercent,
		leadTimeDays: null,
		agentComment: "",
		documents: [],
		chatHistory: [],
	};
}

export function OffersTable({
	suppliers,
	totalCount,
	item,
	currentSupplier,
	isLoading,
	search,
	onSearchChange,
	sort,
	onSort,
	activePaymentTypes,
	onPaymentTypeFilter,
	activeDeliveryFilters,
	onDeliveryFilter,
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
}: OffersTableProps) {
	const isMobile = useIsMobile();
	const [searchUserExpanded, setSearchUserExpanded] = useState(false);
	const searchExpanded = search.length > 0 || searchUserExpanded;
	const sentinelRef = useIntersectionObserver(() => loadMore?.());

	const hasSelection = selectedIds.size > 0;
	const supplierNamesById = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of suppliers) map.set(s.id, s.companyName);
		return map;
	}, [suppliers]);

	const rowsCount = totalCount;

	const toolbar = hasSelection ? (
		<div className="mx-3 flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
			<span className="text-sm font-medium tabular-nums">Выбрано: {selectedIds.size}</span>
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
			{!(isMobile && searchExpanded) && (
				<span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
					{formatRussianPlural(rowsCount, ["предложение", "предложения", "предложений"])}
				</span>
			)}
			<div className={cn("ml-auto flex items-center gap-1", isMobile && searchExpanded && "flex-1")}>
				<ToolbarSearch
					value={search}
					onChange={onSearchChange}
					ariaLabel="Поиск предложений"
					expanded={searchUserExpanded}
					onExpandedChange={setSearchUserExpanded}
				/>
				{!(isMobile && searchExpanded) && (
					<>
						<Popover>
							<Tooltip>
								<TooltipTrigger asChild>
									<PopoverTrigger asChild>
										<Button type="button" variant="ghost" size="icon-sm" aria-label="Фильтры" className="relative">
											<ListFilter aria-hidden="true" />
											{(activePaymentTypes.length > 0 || activeDeliveryFilters.length > 0) && (
												<span
													className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary"
													data-testid="filter-indicator"
												/>
											)}
										</Button>
									</PopoverTrigger>
								</TooltipTrigger>
								<TooltipContent>Фильтры</TooltipContent>
							</Tooltip>
							<PopoverContent align="end" className="w-56">
								<div className="flex flex-col gap-1">
									<div className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground">Тип оплаты</div>
									{PAYMENT_TYPES.map((t) => (
										<button
											key={t}
											type="button"
											aria-label={PAYMENT_TYPE_LABELS[t]}
											aria-pressed={activePaymentTypes.includes(t)}
											className={cn(FILTER_BTN, activePaymentTypes.includes(t) && FILTER_BTN_ACTIVE)}
											onClick={() => onPaymentTypeFilter(t)}
										>
											{PAYMENT_TYPE_LABELS[t]}
										</button>
									))}
									<div className="my-1 border-t border-border" />
									<div className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground">Доставка</div>
									{DELIVERY_FILTERS.map((t) => (
										<button
											key={t}
											type="button"
											aria-label={DELIVERY_FILTER_LABELS[t]}
											aria-pressed={activeDeliveryFilters.includes(t)}
											className={cn(FILTER_BTN, activeDeliveryFilters.includes(t) && FILTER_BTN_ACTIVE)}
											onClick={() => onDeliveryFilter(t)}
										>
											{DELIVERY_FILTER_LABELS[t]}
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
					</>
				)}
			</div>
		</div>
	);

	const columns: DataTableColumn<Supplier>[] = [
		{
			id: "companyName",
			header: "КОМПАНИЯ",
			sortable: true,
			cell: (s, { isPinned }) => (
				<div className="flex flex-col gap-0.5">
					<span className="font-medium">{s.companyName}</span>
					{isPinned ? (
						<span className="inline-flex items-center gap-1.5 text-xs font-medium text-highlight-foreground">
							<UserCheck className="size-3" aria-hidden="true" />
							Ваш поставщик
						</span>
					) : s.quoteReceivedAt ? (
						<span className="text-xs text-muted-foreground tabular-nums">
							Получено:&nbsp;{formatShortDate(s.quoteReceivedAt)}
						</span>
					) : null}
				</div>
			),
		},
		{
			id: "paymentType",
			header: "ТИП ОПЛАТЫ",
			cell: (s) => formatQuotePaymentType(s.paymentType, s.deferralDays, s.prepaymentPercent),
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
					"w-full rounded-lg border p-4 text-left transition-[background-color,scale] duration-150 ease-out",
					ctx.isPinned
						? "bg-accent/60"
						: "bg-card hover:bg-muted/50 active:scale-[0.96] active:bg-muted motion-reduce:active:scale-100",
				)}
				onClick={ctx.isPinned ? undefined : () => onRowClick?.(s.id)}
			>
				<div className="mb-3 flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<div className="truncate font-medium">{s.companyName}</div>
						{!ctx.isPinned && s.quoteReceivedAt && (
							<div className="text-xs text-muted-foreground tabular-nums">
								Получено:&nbsp;{formatShortDate(s.quoteReceivedAt)}
							</div>
						)}
					</div>
					{ctx.isPinned && (
						<span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-highlight-foreground">
							<UserCheck className="size-3" aria-hidden="true" />
							Ваш поставщик
						</span>
					)}
				</div>
				<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<div>
						<div className="text-muted-foreground">Тип оплаты</div>
						<div>{formatQuotePaymentType(s.paymentType, s.deferralDays, s.prepaymentPercent)}</div>
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
			emptyMessage="Нет предложений"
			selection={{
				selectedIds,
				onChange: onSelectionChange,
				getRowLabel: (id) => `Выбрать ${supplierNamesById.get(id) ?? id}`,
			}}
			sort={sort}
			onSort={(field) => onSort(field as SupplierSortField)}
			rowActions={(s) => {
				const actions = [];
				if (onSelectSupplier) {
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
