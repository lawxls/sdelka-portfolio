import { Archive, ArchiveRestore, Download, ListFilter, LoaderCircle, Mails } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { STATUS_ICONS, SupplierStatusIndicator } from "@/components/supplier-status-indicator";
import { ToolbarSearch } from "@/components/toolbar-search";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
	Supplier,
	SupplierCompanyType,
	SupplierSortField,
	SupplierSortState,
	SupplierStatus,
} from "@/data/supplier-types";
import {
	PIPELINE_STATUSES,
	SUPPLIER_COMPANY_TYPE_LABELS,
	SUPPLIER_COMPANY_TYPES,
	SUPPLIER_STATUS_LABELS,
} from "@/data/supplier-types";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatCompactRuble, formatCompanyAge, formatRussianPlural, stripProtocol } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SuppliersTableProps {
	suppliers: Supplier[];
	totalCount: number;
	isLoading: boolean;
	search: string;
	onSearchChange: (query: string) => void;
	sort: SupplierSortState;
	onSort: (field: SupplierSortField) => void;
	activeCompanyTypes: SupplierCompanyType[];
	onCompanyTypeFilter: (type: SupplierCompanyType) => void;
	activeStatuses: SupplierStatus[];
	onStatusFilter: (status: SupplierStatus) => void;
	selectedIds: Set<string>;
	onSelectionChange: (idOrAll: string) => void;
	onArchive: () => void;
	isArchiving: boolean;
	onArchiveSupplier: (id: string) => void;
	onUnarchiveSupplier: (id: string) => void;
	onSendRequest: (id: string) => void;
	onSendRequestBatch: () => void;
	onSendRequestAll: () => void;
	showArchived: boolean;
	onToggleArchived: () => void;
	hasNextPage?: boolean;
	loadMore?: () => void;
	isFetchingNextPage?: boolean;
}

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FILTER_BTN_ACTIVE = "font-medium text-highlight-foreground";

export function SuppliersTable({
	suppliers,
	totalCount,
	isLoading,
	search,
	onSearchChange,
	sort,
	onSort,
	activeCompanyTypes,
	onCompanyTypeFilter,
	activeStatuses,
	onStatusFilter,
	selectedIds,
	onSelectionChange,
	onArchive,
	isArchiving,
	onArchiveSupplier,
	onUnarchiveSupplier,
	onSendRequest,
	onSendRequestBatch,
	onSendRequestAll,
	showArchived,
	onToggleArchived,
	hasNextPage,
	loadMore,
	isFetchingNextPage,
}: SuppliersTableProps) {
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

	const toolbar = hasSelection ? (
		<div className="mx-3 flex flex-wrap items-center gap-3 rounded-xl bg-muted px-3 py-2">
			<span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
			<Button type="button" variant="outline" size="sm" disabled={isArchiving} onClick={onArchive}>
				<Archive className="mr-1 size-4" aria-hidden="true" />
				Архивировать
			</Button>
			{!showArchived && (
				<Button type="button" variant="outline" size="sm" onClick={onSendRequestBatch}>
					Запросить КП
				</Button>
			)}
		</div>
	) : (
		<div className="flex items-center gap-2 px-3">
			{!(isMobile && searchExpanded) && (
				<span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
					{formatRussianPlural(totalCount, ["поставщик", "поставщика", "поставщиков"])}
				</span>
			)}
			<div className={cn("ml-auto flex items-center gap-1", isMobile && searchExpanded && "flex-1")}>
				<ToolbarSearch
					value={search}
					onChange={onSearchChange}
					ariaLabel="Поиск поставщиков"
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
											{(activeCompanyTypes.length > 0 || activeStatuses.length > 0) && (
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
									<div className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground">Тип</div>
									{SUPPLIER_COMPANY_TYPES.map((type) => (
										<button
											key={type}
											type="button"
											aria-label={SUPPLIER_COMPANY_TYPE_LABELS[type]}
											aria-pressed={activeCompanyTypes.includes(type)}
											className={cn(FILTER_BTN, activeCompanyTypes.includes(type) && FILTER_BTN_ACTIVE)}
											onClick={() => onCompanyTypeFilter(type)}
										>
											{SUPPLIER_COMPANY_TYPE_LABELS[type]}
										</button>
									))}
									<div className="my-1 border-t border-border" />
									<div className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground">Статус</div>
									{PIPELINE_STATUSES.map((status) => {
										const Icon = STATUS_ICONS[status];
										return (
											<button
												key={status}
												type="button"
												aria-label={SUPPLIER_STATUS_LABELS[status]}
												aria-pressed={activeStatuses.includes(status)}
												className={cn(
													FILTER_BTN,
													"inline-flex items-center gap-2",
													activeStatuses.includes(status) && FILTER_BTN_ACTIVE,
												)}
												onClick={() => onStatusFilter(status)}
											>
												<Icon
													className={cn(
														"size-3.5 text-muted-foreground",
														activeStatuses.includes(status) && "text-highlight-foreground",
													)}
												/>
												{SUPPLIER_STATUS_LABELS[status]}
											</button>
										);
									})}
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
						{!showArchived && (
							<Button
								type="button"
								size="sm"
								onClick={onSendRequestAll}
								aria-label="Отправить запросы"
								className="rounded-lg bg-status-highlight hover:bg-status-highlight/80"
							>
								<Mails data-icon="inline-start" aria-hidden="true" />
								<span className="hidden sm:inline">Отправить запросы</span>
								<span className="sm:hidden">Отправить</span>
							</Button>
						)}
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
			cellClassName: "max-w-0",
			cell: (s) => (
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate font-medium">{s.companyName}</span>
					<span className="truncate text-xs text-muted-foreground tabular-nums">ИНН:&nbsp;{s.inn}</span>
				</div>
			),
		},
		{
			id: "companyType",
			header: "ТИП",
			headerClassName: "w-[120px]",
			cellClassName: "w-[120px] whitespace-nowrap",
			cell: (s) => SUPPLIER_COMPANY_TYPE_LABELS[s.companyType],
		},
		{
			id: "website",
			header: "САЙТ",
			headerClassName: "w-[160px]",
			cellClassName: "w-[160px] max-w-[160px]",
			cell: (s) => (
				<a
					href={s.website}
					target="_blank"
					rel="noopener noreferrer"
					className="block truncate text-foreground underline decoration-muted-foreground/60 underline-offset-4 transition-colors hover:decoration-foreground"
					onClick={(ev) => ev.stopPropagation()}
				>
					{stripProtocol(s.website)}
				</a>
			),
		},
		{
			id: "region",
			header: "РЕГИОН",
			headerClassName: "w-[160px]",
			cellClassName: "w-[160px] max-w-[160px]",
			cell: (s) => <span className="block truncate">{s.region}</span>,
		},
		{
			id: "revenue",
			header: "ВЫРУЧКА",
			sortable: true,
			align: "right",
			headerClassName: "w-[110px]",
			cellClassName: "w-[110px] whitespace-nowrap",
			cell: (s) => formatCompactRuble(s.revenue),
		},
		{
			id: "foundedYear",
			header: "ВОЗРАСТ",
			sortable: true,
			align: "right",
			headerClassName: "w-[100px]",
			cellClassName: "w-[100px] whitespace-nowrap",
			cell: (s) => formatCompanyAge(s.foundedYear),
		},
		{
			id: "state",
			header: "СТАТУС",
			align: "right",
			headerClassName: "w-[160px]",
			cellClassName: "w-[160px] whitespace-nowrap",
			cell: (s) => renderStateCell(s, onSendRequest),
		},
	];

	function renderMobileCard(s: Supplier) {
		return (
			<div className="w-full rounded-lg border bg-card p-4 text-left">
				<div className="mb-1 flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<div className="truncate font-medium">{s.companyName}</div>
						<div className="text-xs text-muted-foreground tabular-nums">ИНН:&nbsp;{s.inn}</div>
					</div>
					<div className="shrink-0">{renderStateCell(s, onSendRequest)}</div>
				</div>
				<a
					href={s.website}
					target="_blank"
					rel="noopener noreferrer"
					className="mb-3 block text-sm text-foreground underline decoration-muted-foreground/60 underline-offset-4 hover:decoration-foreground"
				>
					{stripProtocol(s.website)}
				</a>
				<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<div>
						<div className="text-xs text-muted-foreground">Тип</div>
						<div>{SUPPLIER_COMPANY_TYPE_LABELS[s.companyType]}</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Регион</div>
						<div>{s.region}</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Возраст</div>
						<div className="tabular-nums">{formatCompanyAge(s.foundedYear)}</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Выручка</div>
						<div className="tabular-nums">{formatCompactRuble(s.revenue)}</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<DataTable<Supplier>
			columns={columns}
			rows={suppliers}
			getRowId={(s) => s.id}
			isLoading={isLoading}
			emptyMessage={showArchived ? "В архиве пусто" : "Ничего не найдено"}
			selection={{
				selectedIds,
				onChange: onSelectionChange,
				getRowLabel: (id) => `Выбрать ${supplierNamesById.get(id) ?? id}`,
			}}
			sort={sort}
			onSort={(field) => onSort(field as SupplierSortField)}
			rowActions={(s) => {
				if (showArchived) {
					return [
						{
							label: "Убрать из архива",
							icon: <ArchiveRestore className="size-3.5" />,
							onSelect: () => onUnarchiveSupplier(s.id),
						},
					];
				}
				return [
					{
						label: "Архивировать",
						icon: <Archive className="size-3.5" />,
						onSelect: () => onArchiveSupplier(s.id),
					},
				];
			}}
			toolbar={toolbar}
			mobileCardRender={renderMobileCard}
			isMobile={isMobile}
			sentinel={
				<>
					{hasNextPage && <div ref={sentinelRef} data-testid="scroll-sentinel" className="h-px" />}
					{isFetchingNextPage && (
						<div className="flex justify-center py-4" data-testid="loading-more-spinner">
							<LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Загрузка…" />
						</div>
					)}
				</>
			}
		/>
	);
}

function renderStateCell(s: Supplier, onSendRequest: (id: string) => void) {
	if (s.status === "new") {
		return (
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={(ev) => {
					ev.stopPropagation();
					onSendRequest(s.id);
				}}
				data-testid={`send-request-${s.id}`}
			>
				Запросить КП
			</Button>
		);
	}
	return (
		<span data-testid={`supplier-state-${s.id}`}>
			<SupplierStatusIndicator status={s.status} className="text-xs" />
		</span>
	);
}
