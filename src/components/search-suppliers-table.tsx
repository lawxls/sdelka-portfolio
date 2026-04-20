import { Archive, ArchiveRestore, Check, Download, ListFilter, Mails } from "lucide-react";
import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { ExpandingSearch } from "@/components/expanding-search";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
	SearchSupplier,
	SearchSupplierCompanyType,
	SearchSupplierRequestStatus,
	SearchSupplierSortField,
	SearchSupplierSortState,
} from "@/data/search-supplier-types";
import { SEARCH_SUPPLIER_COMPANY_TYPE_LABELS, SEARCH_SUPPLIER_COMPANY_TYPES } from "@/data/search-supplier-types";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatCompactRuble, formatRussianPlural, stripProtocol } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SearchSuppliersTableProps {
	entries: SearchSupplier[];
	isLoading: boolean;
	search: string;
	onSearchChange: (query: string) => void;
	sort: SearchSupplierSortState;
	onSort: (field: SearchSupplierSortField) => void;
	activeCompanyTypes: SearchSupplierCompanyType[];
	onCompanyTypeFilter: (type: SearchSupplierCompanyType) => void;
	activeRequestStatuses: SearchSupplierRequestStatus[];
	onRequestStatusFilter: (status: SearchSupplierRequestStatus) => void;
	selectedIds: Set<string>;
	onSelectionChange: (idOrAll: string) => void;
	onArchive: () => void;
	isArchiving: boolean;
	onArchiveEntry: (id: string) => void;
	onUnarchiveEntry: (id: string) => void;
	onSendRequest: (id: string) => void;
	onSendRequestBatch: () => void;
	onSendRequestAll: () => void;
	showArchived: boolean;
	onToggleArchived: () => void;
}

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FILTER_BTN_ACTIVE = "font-medium text-highlight-foreground";

const REQUEST_STATUS_PRESETS: { value: SearchSupplierRequestStatus; label: string }[] = [
	{ value: "new", label: "Связаться" },
	{ value: "requested", label: "Связались" },
];

export function SearchSuppliersTable({
	entries,
	isLoading,
	search,
	onSearchChange,
	sort,
	onSort,
	activeCompanyTypes,
	onCompanyTypeFilter,
	activeRequestStatuses,
	onRequestStatusFilter,
	selectedIds,
	onSelectionChange,
	onArchive,
	isArchiving,
	onArchiveEntry,
	onUnarchiveEntry,
	onSendRequest,
	onSendRequestBatch,
	onSendRequestAll,
	showArchived,
	onToggleArchived,
}: SearchSuppliersTableProps) {
	const isMobile = useIsMobile();

	const hasSelection = selectedIds.size > 0;
	const entryNamesById = useMemo(() => {
		const map = new Map<string, string>();
		for (const e of entries) map.set(e.id, e.companyName);
		return map;
	}, [entries]);

	const toolbar = hasSelection ? (
		<div className="mx-3 flex flex-wrap items-center gap-3 rounded-md bg-muted px-3 py-2">
			<span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
			<Button type="button" variant="outline" size="sm" disabled={isArchiving} onClick={onArchive}>
				<Archive className="mr-1 size-4" aria-hidden="true" />
				Архивировать
			</Button>
			{!showArchived && (
				<Button type="button" variant="outline" size="sm" onClick={onSendRequestBatch}>
					Связаться
				</Button>
			)}
		</div>
	) : (
		<div className="flex items-center gap-2 px-3">
			<span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
				{formatRussianPlural(entries.length, ["поставщик", "поставщика", "поставщиков"])}
			</span>
			<div className="ml-auto flex items-center gap-1">
				<ExpandingSearch value={search} onChange={onSearchChange} ariaLabel="Поиск поставщиков" />
				<Popover>
					<Tooltip>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>
								<Button type="button" variant="ghost" size="icon-sm" aria-label="Фильтры" className="relative">
									<ListFilter aria-hidden="true" />
									{(activeCompanyTypes.length > 0 || activeRequestStatuses.length > 0) && (
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
							{SEARCH_SUPPLIER_COMPANY_TYPES.map((type) => (
								<button
									key={type}
									type="button"
									aria-label={SEARCH_SUPPLIER_COMPANY_TYPE_LABELS[type]}
									aria-pressed={activeCompanyTypes.includes(type)}
									className={cn(FILTER_BTN, activeCompanyTypes.includes(type) && FILTER_BTN_ACTIVE)}
									onClick={() => onCompanyTypeFilter(type)}
								>
									{SEARCH_SUPPLIER_COMPANY_TYPE_LABELS[type]}
								</button>
							))}
							<div className="my-1 border-t border-border" />
							<div className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground">Статус поставщика</div>
							{REQUEST_STATUS_PRESETS.map(({ value, label }) => (
								<button
									key={value}
									type="button"
									aria-label={label}
									aria-pressed={activeRequestStatuses.includes(value)}
									className={cn(FILTER_BTN, activeRequestStatuses.includes(value) && FILTER_BTN_ACTIVE)}
									onClick={() => onRequestStatusFilter(value)}
								>
									{label}
								</button>
							))}
						</div>
					</PopoverContent>
				</Popover>
				{!showArchived && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Связаться со всеми"
								onClick={onSendRequestAll}
							>
								<Mails aria-hidden="true" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Связаться со всеми</TooltipContent>
					</Tooltip>
				)}
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
		</div>
	);

	const columns: DataTableColumn<SearchSupplier>[] = [
		{
			id: "companyName",
			header: "КОМПАНИЯ",
			sortable: true,
			cell: (e) => (
				<div className="flex flex-col gap-0.5">
					<span className="font-medium">{e.companyName}</span>
					<span className="text-xs text-muted-foreground tabular-nums">ИНН:&nbsp;{e.inn}</span>
				</div>
			),
		},
		{
			id: "companyType",
			header: "ТИП",
			cell: (e) => SEARCH_SUPPLIER_COMPANY_TYPE_LABELS[e.companyType],
		},
		{
			id: "region",
			header: "РЕГИОН",
			cell: (e) => e.region,
		},
		{
			id: "website",
			header: "САЙТ",
			cellClassName: "max-w-[220px]",
			cell: (e) => (
				<a
					href={e.website}
					target="_blank"
					rel="noopener noreferrer"
					className="block truncate text-foreground underline decoration-muted-foreground/60 underline-offset-4 transition-colors hover:decoration-foreground"
					onClick={(ev) => ev.stopPropagation()}
				>
					{stripProtocol(e.website)}
				</a>
			),
		},
		{
			id: "revenue",
			header: "ВЫРУЧКА",
			sortable: true,
			align: "right",
			cell: (e) => formatCompactRuble(e.revenue),
		},
		{
			id: "foundedYear",
			header: "ГОД ОСНОВАНИЯ",
			sortable: true,
			align: "right",
			cell: (e) => e.foundedYear,
		},
		{
			id: "request",
			header: "",
			align: "right",
			cell: (e) => renderSendRequestCell(e, onSendRequest),
		},
	];

	function renderMobileCard(e: SearchSupplier) {
		return (
			<div data-testid="search-supplier-card" className="rounded-lg border bg-card p-4 text-left">
				<div className="mb-1 flex items-start justify-between gap-2">
					<div className="flex flex-col gap-0.5">
						<span className="font-medium">{e.companyName}</span>
						<span className="text-xs text-muted-foreground tabular-nums">ИНН:&nbsp;{e.inn}</span>
					</div>
					{e.requestStatus === "requested" && (
						<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
							<Check className="size-3" aria-hidden="true" />
							Связались
						</span>
					)}
				</div>
				<a
					href={e.website}
					target="_blank"
					rel="noopener noreferrer"
					className="mb-3 block text-sm text-foreground underline decoration-muted-foreground/60 underline-offset-4 hover:decoration-foreground"
				>
					{stripProtocol(e.website)}
				</a>
				<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<div>
						<div className="text-xs text-muted-foreground">Тип</div>
						<div>{SEARCH_SUPPLIER_COMPANY_TYPE_LABELS[e.companyType]}</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Регион</div>
						<div>{e.region}</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Год основания</div>
						<div className="tabular-nums">{e.foundedYear}</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Выручка</div>
						<div className="tabular-nums">{formatCompactRuble(e.revenue)}</div>
					</div>
				</div>
				<div className="mt-3">{renderSendRequestCell(e, onSendRequest)}</div>
			</div>
		);
	}

	return (
		<DataTable<SearchSupplier>
			columns={columns}
			rows={entries}
			getRowId={(e) => e.id}
			isLoading={isLoading}
			emptyMessage={showArchived ? "В архиве пусто" : "Ничего не найдено"}
			selection={{
				selectedIds,
				onChange: onSelectionChange,
				getRowLabel: (id) => `Выбрать ${entryNamesById.get(id) ?? id}`,
			}}
			sort={sort}
			onSort={(field) => onSort(field as SearchSupplierSortField)}
			rowActions={(e) => {
				if (showArchived) {
					return [
						{
							label: "Убрать из архива",
							icon: <ArchiveRestore className="size-3.5" />,
							onSelect: () => onUnarchiveEntry(e.id),
						},
					];
				}
				return [
					{
						label: "Архивировать",
						icon: <Archive className="size-3.5" />,
						onSelect: () => onArchiveEntry(e.id),
					},
				];
			}}
			toolbar={toolbar}
			mobileCardRender={renderMobileCard}
			isMobile={isMobile}
		/>
	);
}

function renderSendRequestCell(e: SearchSupplier, onSendRequest: (id: string) => void) {
	if (e.requestStatus === "requested") {
		return (
			<span
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
				data-testid={`send-request-requested-${e.id}`}
			>
				<Check className="size-3.5" aria-hidden="true" />
				Связались
			</span>
		);
	}
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={(ev) => {
				ev.stopPropagation();
				onSendRequest(e.id);
			}}
			data-testid={`send-request-${e.id}`}
		>
			Связаться
		</Button>
	);
}
