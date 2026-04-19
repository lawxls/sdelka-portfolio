import { Archive, ArchiveRestore, Download, ListFilter, Search, Send } from "lucide-react";
import { useMemo, useRef } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useMountEffect } from "@/hooks/use-mount-effect";
import { formatCompactRuble, stripProtocol } from "@/lib/format";
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
	showArchived: boolean;
	onToggleArchived: () => void;
}

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FILTER_BTN_ACTIVE = "font-medium text-highlight-foreground";

const REQUEST_STATUS_PRESETS: { value: SearchSupplierRequestStatus; label: string }[] = [
	{ value: "new", label: "Новый" },
	{ value: "requested", label: "Запрошен" },
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
	showArchived,
	onToggleArchived,
}: SearchSuppliersTableProps) {
	const isMobile = useIsMobile();
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onSearchChange(value), 300);
	}

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
				<Button type="button" variant="default" size="sm" onClick={onSendRequestBatch}>
					<Send className="mr-1 size-4" aria-hidden="true" />
					Отправить запрос
				</Button>
			)}
		</div>
	) : (
		<div className="flex items-center gap-2 px-3">
			<span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
				Всего: {entries.length}
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
							<Button type="button" variant="ghost" size="icon-sm" aria-label="Фильтры" className="relative ml-auto">
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
						<div className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground">Статус запроса</div>
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

	const columns: DataTableColumn<SearchSupplier>[] = [
		{
			id: "companyName",
			header: "КОМПАНИЯ",
			sortable: true,
			cell: (e) => (
				<div className="flex flex-col gap-0.5">
					<span className="font-medium">{e.companyName}</span>
					<span className="text-xs text-muted-foreground tabular-nums">ИНН {e.inn}</span>
				</div>
			),
		},
		{
			id: "website",
			header: "САЙТ",
			cell: (e) => (
				<a
					href={e.website}
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary hover:underline"
					onClick={(ev) => ev.stopPropagation()}
				>
					{stripProtocol(e.website)}
				</a>
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
			id: "foundedYear",
			header: "ГОД ОСНОВАНИЯ",
			sortable: true,
			align: "right",
			cell: (e) => e.foundedYear,
		},
		{
			id: "revenue",
			header: "ВЫРУЧКА",
			sortable: true,
			align: "right",
			cell: (e) => formatCompactRuble(e.revenue),
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
						<span className="text-xs text-muted-foreground tabular-nums">ИНН {e.inn}</span>
					</div>
					{e.requestStatus === "requested" && (
						<Badge variant="secondary" className="text-xs">
							Запрошен
						</Badge>
					)}
				</div>
				<a
					href={e.website}
					target="_blank"
					rel="noopener noreferrer"
					className="mb-3 block text-sm text-primary hover:underline"
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
			<Badge variant="secondary" className="text-xs" data-testid={`send-request-requested-${e.id}`}>
				Запрошен
			</Badge>
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
			<Send className="mr-1 size-3.5" aria-hidden="true" />
			Отправить запрос
		</Button>
	);
}
