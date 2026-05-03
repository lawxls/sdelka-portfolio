import { Archive, Ban, Check, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/data-table";
import { CardGrid, FieldCard, DetailSection as Section, ValueText } from "@/components/detail-section";
import { type DeliveryFilter, matchesDeliveryFilter, OffersTable } from "@/components/offers-table";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import { SuppliersTable } from "@/components/suppliers-table";
import { TaskCard } from "@/components/task-card";
import { TaskDrawer } from "@/components/task-drawer";
import { ToolbarSearch } from "@/components/toolbar-search";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
	SUPPLIER_STATUSES,
	type Supplier,
	type SupplierCompanyType,
	type SupplierSortField,
	type SupplierSortState,
	type SupplierStatus,
	supplierIdentity,
} from "@/data/supplier-types";
import { STATUS_ICONS, type Task } from "@/data/task-types";
import { getTenderStatus } from "@/data/tenders/get-tender-status";
import type { Folder, PaymentType, ProcurementInquiry, ProcurementItem } from "@/data/types";
import { formatPaymentType, PAYMENT_METHOD_LABELS, UNLOADING_LABELS } from "@/data/types";
import { useCompanyDetail } from "@/data/use-company-detail";
import { useFolders } from "@/data/use-folders";
import { useTenderItems } from "@/data/use-items";
import {
	useAllSuppliers,
	useArchiveSuppliers,
	useSendSupplierRequest,
	useUnarchiveSuppliers,
} from "@/data/use-suppliers";
import { useTaskColumns, useUpdateTaskStatus } from "@/data/use-tasks";
import { useTender } from "@/data/use-tenders";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
	formatCurrency,
	formatDayMonthShort,
	formatDayMonthShortTime,
	formatRussianPlural,
	isOverdue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type TenderDetailTab = "suppliers" | "offers" | "tasks" | "details";

const TABS: { key: TenderDetailTab; label: string; mobileLabel?: string }[] = [
	{ key: "suppliers", label: "Поставщики" },
	{ key: "offers", label: "Предложения" },
	{ key: "tasks", label: "Задачи" },
	{ key: "details", label: "Информация", mobileLabel: "Инфо" },
];

const DEFAULT_TAB: TenderDetailTab = "suppliers";
const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

const CONSOLIDATED_PAGE_SIZE = 30;

/** Pipeline-priority rank used when collapsing duplicate supplier rows: the
 * row with the most-advanced status wins so a received-КП entry isn't shadowed
 * by a still-«Кандидат» row for the same company. */
const SUPPLIER_PIPELINE_RANK: Record<SupplierStatus, number> = {
	получено_кп: 5,
	переговоры: 4,
	кп_запрошено: 3,
	ошибка: 2,
	отказ: 2,
	new: 1,
};

/** The consolidated tabs render a flat list of suppliers but mutations dispatch
 * per-item (Supplier.itemId carries the source). Group selected ids by their
 * source item before firing one mutation per item. */
function groupSupplierIdsByItem(rows: readonly Supplier[], ids: readonly string[]): Map<string, string[]> {
	const byId = new Map(rows.map((s) => [s.id, s]));
	const byItem = new Map<string, string[]>();
	for (const id of ids) {
		const sup = byId.get(id);
		if (!sup) continue;
		const arr = byItem.get(sup.itemId) ?? [];
		arr.push(id);
		byItem.set(sup.itemId, arr);
	}
	return byItem;
}

function parseTenderTab(param: string | null): TenderDetailTab {
	if (param && VALID_TABS.has(param)) return param as TenderDetailTab;
	return DEFAULT_TAB;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

function formatDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return dateFormatter.format(d);
}

function formatInquiryNumber(id: string): string {
	const match = id.match(/\d+/);
	return match ? String(Number(match[0])) : id;
}

export function TenderDetailPage() {
	const { slug = "" } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const isMobile = useIsMobile();
	const activeTab = parseTenderTab(searchParams.get("tab"));
	const taskId = searchParams.get("task");

	const { data: tender, isLoading, isError } = useTender(slug);
	const { data: folders = [] } = useFolders();
	const { data: items = [] } = useTenderItems(slug || undefined);

	function handleClose() {
		navigate({ pathname: "/inquiries", search: searchParams.toString() });
	}

	function handleTaskOpen(id: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("task", id);
				return next;
			},
			{ replace: false },
		);
	}

	function handleTaskClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("task");
				return next;
			},
			{ replace: false },
		);
	}

	function handleTabChange(tab: TenderDetailTab) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (tab === DEFAULT_TAB) {
					next.delete("tab");
				} else {
					next.set("tab", tab);
				}
				return next;
			},
			{ replace: true },
		);
	}

	return (
		<>
			<Sheet
				open
				onOpenChange={(nextOpen) => {
					if (!nextOpen) handleClose();
				}}
			>
				<SheetContent
					side={isMobile ? "bottom" : "right"}
					size={isMobile ? "full" : undefined}
					className={isMobile ? undefined : "!w-4/5 !max-w-none"}
				>
					{isLoading && (
						<div className="flex h-full flex-col gap-4 p-6">
							<SheetHeader className="sr-only">
								<SheetTitle>Загрузка запроса</SheetTitle>
							</SheetHeader>
							<Skeleton className="h-6 w-64" data-testid="tender-detail-skeleton" />
							<Skeleton className="h-4 w-40" />
						</div>
					)}
					{!isLoading && (isError || !tender) && (
						<div className="flex h-full flex-col p-6">
							<SheetHeader className="sr-only">
								<SheetTitle>Запрос недоступен</SheetTitle>
							</SheetHeader>
							<div
								className="flex flex-1 flex-col items-center justify-center gap-3 text-center"
								data-testid="tender-not-found"
							>
								<p className="text-sm font-medium">Запрос не найден</p>
								<p className="max-w-[20rem] text-pretty text-sm text-muted-foreground">
									Возможно, ссылка устарела или запрос был удалён.
								</p>
							</div>
						</div>
					)}
					{!isLoading && tender && (
						<TenderDrawerBody
							tender={tender}
							items={items}
							folders={folders}
							activeTab={activeTab}
							onTabChange={handleTabChange}
							onTaskOpen={handleTaskOpen}
						/>
					)}
				</SheetContent>
			</Sheet>
			<TaskDrawer taskId={taskId} onClose={handleTaskClose} isMobile={isMobile} />
		</>
	);
}

interface TenderDrawerBodyProps {
	tender: ProcurementInquiry;
	items: readonly ProcurementItem[];
	folders: Folder[];
	activeTab: TenderDetailTab;
	onTabChange: (tab: TenderDetailTab) => void;
	onTaskOpen: (id: string) => void;
}

function TenderDrawerBody({ tender, items, folders, activeTab, onTabChange, onTaskOpen }: TenderDrawerBodyProps) {
	const folder = folders.find((f) => f.id === tender.folderId);
	const status = getTenderStatus(items);
	const statusCfg = STATUS_CONFIG[status];

	const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
	const { data: allSuppliers = [] } = useAllSuppliers();
	// Identity-deduped so one supplier counts once across all tender positions.
	const metrics = useMemo(() => {
		const total = new Set<string>();
		const contacted = new Set<string>();
		const quotesReceived = new Set<string>();
		const refusals = new Set<string>();
		for (const s of allSuppliers) {
			if (s.archived) continue;
			if (!itemIds.has(s.itemId)) continue;
			const identity = supplierIdentity(s);
			total.add(identity);
			if (s.status !== "new") contacted.add(identity);
			if (s.status === "получено_кп") quotesReceived.add(identity);
			else if (s.status === "отказ") refusals.add(identity);
		}
		return {
			total: total.size,
			contacted: contacted.size,
			quotesReceived: quotesReceived.size,
			refusals: refusals.size,
		};
	}, [allSuppliers, itemIds]);
	const taskColumnsForCounts = useTaskColumns({ tender: tender.id });
	const tabCounts: Partial<Record<TenderDetailTab, number>> = {
		suppliers: metrics.total,
		offers: metrics.quotesReceived,
		tasks: taskColumnsForCounts.assigned.count + taskColumnsForCounts.in_progress.count,
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SheetHeader>
				<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
					<span className="font-heading text-base font-medium text-foreground tabular-nums">
						№{formatInquiryNumber(tender.id)}
					</span>
					<span aria-hidden="true" className="font-heading text-base font-medium text-foreground">
						•
					</span>
					<SheetTitle className="leading-snug">{tender.name}</SheetTitle>
				</div>
				<SheetDescription className="sr-only">Детали запроса</SheetDescription>
				<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
					<span className={cn("inline-flex items-center gap-1.5 font-normal", statusCfg.className)}>
						<ProcurementStatusIcon status={status} iconClassName="size-3.5" />
						{statusCfg.label}
					</span>
					<span className="select-none text-muted-foreground/50" aria-hidden="true">
						•
					</span>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<HeaderMetric
							icon={Mail}
							count={metrics.contacted}
							label="Написали поставщикам"
							colorClass="text-muted-foreground"
							testId="tender-metric-contacted"
						/>
						<HeaderMetric
							icon={Check}
							count={metrics.quotesReceived}
							label="Получено КП"
							colorClass="text-green-600 dark:text-green-400"
							testId="tender-metric-quotes"
						/>
						<HeaderMetric
							icon={Ban}
							count={metrics.refusals}
							label="Отказ"
							colorClass="text-destructive"
							testId="tender-metric-refusals"
						/>
					</div>
				</div>
			</SheetHeader>

			<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
				{TABS.map((tab) => {
					const isActive = activeTab === tab.key;
					const count = tabCounts[tab.key];
					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={isActive}
							aria-label={tab.label}
							className={cn(
								"inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
								isActive ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
							)}
							onClick={() => onTabChange(tab.key)}
						>
							{tab.mobileLabel ? (
								<>
									<span className="md:hidden">{tab.mobileLabel}</span>
									<span className="hidden md:inline">{tab.label}</span>
								</>
							) : (
								tab.label
							)}
							{count != null && count > 0 && (
								<span
									className={cn(
										"hidden min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs tabular-nums transition-colors md:inline-flex",
										isActive ? "text-foreground" : "text-muted-foreground",
									)}
									aria-hidden="true"
								>
									{count}
								</span>
							)}
						</button>
					);
				})}
			</div>

			<div
				className={cn(
					"min-h-0 flex-1 overflow-y-auto overflow-x-hidden [&_tr>*:last-child]:pr-lg",
					activeTab === "details" ? "p-4" : "pt-3",
				)}
			>
				{activeTab === "suppliers" && <TenderSuppliersTab items={items} />}
				{activeTab === "offers" && <TenderOffersTab tenderId={tender.id} items={items} />}
				{activeTab === "tasks" && <TenderTasksTab tenderId={tender.id} onTaskClick={onTaskOpen} />}
				{activeTab === "details" && <TenderDetailsTab tender={tender} items={items} folder={folder} />}
			</div>
		</div>
	);
}

function HeaderMetric({
	icon: Icon,
	count,
	label,
	colorClass,
	testId,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	count: number;
	label: string;
	colorClass: string;
	testId: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className={cn("inline-flex items-center gap-1 text-sm font-normal", colorClass)} data-testid={testId}>
					<Icon className="size-4" aria-hidden={true} />
					<span className="tabular-nums">{count}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function NoItemsHint({ tab }: { tab: "suppliers" | "offers" }) {
	const message =
		tab === "suppliers"
			? "В этом запросе пока нет позиций — поставщиков нет."
			: "В этом запросе пока нет позиций — предложений нет.";
	return <p className="text-pretty py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

type TasksFilter = "completed" | "archived";

const FILTER_BUTTONS: { key: TasksFilter; label: string }[] = [
	{ key: "completed", label: "Завершённые" },
	{ key: "archived", label: "Архив" },
];

const TASK_TABLE_COLUMNS: DataTableColumn<Task>[] = [
	{
		id: "name",
		header: "ЗАДАЧА",
		sortable: true,
		cell: (t) => <span className="font-medium">{t.name}</span>,
	},
	{
		id: "questionCount",
		header: "ВОПРОСЫ",
		sortable: true,
		align: "right",
		cell: (t) => (t.questionCount > 0 ? formatRussianPlural(t.questionCount, ["вопрос", "вопроса", "вопросов"]) : "—"),
	},
	{
		id: "deadlineAt",
		header: "ДЕДЛАЙН",
		sortable: true,
		align: "right",
		cell: (t) => (
			<time
				dateTime={t.deadlineAt}
				className={cn("tabular-nums", isOverdue(t.deadlineAt) && "font-medium text-destructive")}
			>
				{formatDayMonthShort(t.deadlineAt)}
			</time>
		),
	},
	{
		id: "createdAt",
		header: "ДАТА И ВРЕМЯ СОЗДАНИЯ",
		sortable: true,
		align: "right",
		cell: (t) => (
			<time dateTime={t.createdAt} className="tabular-nums">
				{formatDayMonthShortTime(t.createdAt)}
			</time>
		),
	},
];

type TaskSortField = "name" | "questionCount" | "deadlineAt" | "createdAt";

function compareTasks(a: Task, b: Task, field: TaskSortField, dir: "asc" | "desc"): number {
	const sign = dir === "asc" ? 1 : -1;
	if (field === "name") return a.name.localeCompare(b.name, "ru") * sign;
	if (field === "questionCount") return (a.questionCount - b.questionCount) * sign;
	const av = new Date(field === "deadlineAt" ? a.deadlineAt : a.createdAt).getTime();
	const bv = new Date(field === "deadlineAt" ? b.deadlineAt : b.createdAt).getTime();
	return (av - bv) * sign;
}

function TenderSuppliersTab({ items }: { items: readonly ProcurementItem[] }) {
	if (items.length === 0) return <NoItemsHint tab="suppliers" />;
	return <TenderConsolidatedSuppliersPanel items={items} />;
}

function TenderConsolidatedSuppliersPanel({ items }: { items: readonly ProcurementItem[] }) {
	const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
	const { data: allSuppliers = [], isLoading } = useAllSuppliers();
	const archiveMutation = useArchiveSuppliers();
	const unarchiveMutation = useUnarchiveSuppliers();
	const sendRequestMutation = useSendSupplierRequest();

	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SupplierSortState>({ field: "companyName", direction: "asc" });
	const [activeCompanyTypes, setActiveCompanyTypes] = useState<SupplierCompanyType[]>([]);
	const [activeStatuses, setActiveStatuses] = useState<SupplierStatus[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showArchived, setShowArchived] = useState(false);

	const tenderSuppliers = useMemo(
		() => allSuppliers.filter((s) => itemIds.has(s.itemId) && s.archived === showArchived),
		[allSuppliers, itemIds, showArchived],
	);

	const dedupedSuppliers = useMemo(() => {
		const byIdentity = new Map<string, Supplier>();
		for (const s of tenderSuppliers) {
			const identity = supplierIdentity(s);
			const existing = byIdentity.get(identity);
			if (!existing) {
				byIdentity.set(identity, s);
				continue;
			}
			if ((SUPPLIER_PIPELINE_RANK[s.status] ?? 0) > (SUPPLIER_PIPELINE_RANK[existing.status] ?? 0)) {
				byIdentity.set(identity, s);
			}
		}
		return [...byIdentity.values()];
	}, [tenderSuppliers]);

	const statusCounts = useMemo(() => {
		const counts: Partial<Record<SupplierStatus, number>> = {};
		for (const s of dedupedSuppliers) {
			if (s.archived) continue;
			counts[s.status] = (counts[s.status] ?? 0) + 1;
		}
		return counts;
	}, [dedupedSuppliers]);

	const filteredSuppliers = useMemo(() => {
		const q = search.trim().toLowerCase();
		const effectiveStatuses = activeStatuses.length > 0 ? activeStatuses : SUPPLIER_STATUSES;
		return dedupedSuppliers.filter((s) => {
			if (q && !s.companyName.toLowerCase().includes(q) && !s.inn.includes(search)) return false;
			if (activeCompanyTypes.length > 0 && !activeCompanyTypes.includes(s.companyType)) return false;
			if (!effectiveStatuses.includes(s.status)) return false;
			return true;
		});
	}, [dedupedSuppliers, search, activeCompanyTypes, activeStatuses]);

	const sortedSuppliers = useMemo(() => sortConsolidatedSuppliers(filteredSuppliers, sort), [filteredSuppliers, sort]);
	const {
		visible: visibleSuppliers,
		hasNextPage,
		loadMore,
	} = useClientPagination(sortedSuppliers, CONSOLIDATED_PAGE_SIZE);

	function handleSort(field: SupplierSortField) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	function handleCompanyTypeFilter(type: SupplierCompanyType) {
		setActiveCompanyTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
	}

	function handleStatusFilter(status: SupplierStatus) {
		setActiveStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
	}

	function handleSelectionChange(idOrAll: string) {
		if (idOrAll === "all") {
			setSelectedIds((prev) =>
				prev.size === visibleSuppliers.length ? new Set() : new Set(visibleSuppliers.map((s) => s.id)),
			);
			return;
		}
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(idOrAll)) next.delete(idOrAll);
			else next.add(idOrAll);
			return next;
		});
	}

	function dispatchByItem(ids: string[], action: (itemId: string, supplierIds: string[]) => void) {
		const byItem = groupSupplierIdsByItem(sortedSuppliers, ids);
		for (const [itemId, supplierIds] of byItem) action(itemId, supplierIds);
	}

	function handleArchiveBatch() {
		dispatchByItem([...selectedIds], (itemId, supplierIds) =>
			archiveMutation.mutate({ itemId, supplierIds }, { onSuccess: () => setSelectedIds(new Set()) }),
		);
	}

	function handleArchiveSupplier(id: string) {
		dispatchByItem([id], (itemId, supplierIds) => archiveMutation.mutate({ itemId, supplierIds }));
	}

	function handleUnarchiveSupplier(id: string) {
		dispatchByItem([id], (itemId, supplierIds) => unarchiveMutation.mutate({ itemId, supplierIds }));
	}

	function handleSendRequest(id: string) {
		dispatchByItem([id], (itemId, supplierIds) =>
			sendRequestMutation.mutate(
				{ itemId, supplierIds },
				{
					onSuccess: (transitioned) => {
						if (transitioned.length > 0) toast.success("Запрашиваем КП");
					},
				},
			),
		);
	}

	function handleSendRequestBatch() {
		dispatchByItem([...selectedIds], (itemId, supplierIds) =>
			sendRequestMutation.mutate(
				{ itemId, supplierIds },
				{
					onSuccess: (transitioned) => {
						if (transitioned.length > 0) toast.success("Запрашиваем КП у поставщиков");
					},
				},
			),
		);
		setSelectedIds(new Set());
	}

	function handleSendRequestAll() {
		const candidateIds = sortedSuppliers.filter((s) => s.status === "new" && !s.archived).map((s) => s.id);
		if (candidateIds.length === 0) {
			toast.info("Нет поставщиков со статусом «Кандидат»");
			return;
		}
		dispatchByItem(candidateIds, (itemId, supplierIds) =>
			sendRequestMutation.mutate(
				{ itemId, supplierIds },
				{
					onSuccess: (transitioned) => {
						if (transitioned.length > 0) toast.success("Запрашиваем КП у поставщиков");
					},
				},
			),
		);
	}

	return (
		<div data-testid="tender-tab-suppliers" className="h-full">
			<SuppliersTable
				suppliers={visibleSuppliers}
				totalCount={sortedSuppliers.length}
				isLoading={isLoading}
				hasNextPage={hasNextPage}
				loadMore={loadMore}
				isFetchingNextPage={false}
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSort={handleSort}
				activeCompanyTypes={activeCompanyTypes}
				onCompanyTypeFilter={handleCompanyTypeFilter}
				activeStatuses={activeStatuses}
				onStatusFilter={handleStatusFilter}
				statusCounts={statusCounts}
				selectedIds={selectedIds}
				onSelectionChange={handleSelectionChange}
				onArchive={handleArchiveBatch}
				isArchiving={archiveMutation.isPending}
				onArchiveSupplier={handleArchiveSupplier}
				onUnarchiveSupplier={handleUnarchiveSupplier}
				onSendRequest={handleSendRequest}
				onSendRequestBatch={handleSendRequestBatch}
				onSendRequestAll={handleSendRequestAll}
				showArchived={showArchived}
				onToggleArchived={() => {
					setShowArchived((v) => !v);
					setSelectedIds(new Set());
				}}
			/>
		</div>
	);
}

function TenderOffersTab({ tenderId, items }: { tenderId: string; items: readonly ProcurementItem[] }) {
	if (items.length === 0) return <NoItemsHint tab="offers" />;
	return <TenderConsolidatedOffersPanel tenderId={tenderId} items={items} />;
}

function TenderConsolidatedOffersPanel({ tenderId, items }: { tenderId: string; items: readonly ProcurementItem[] }) {
	const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
	const { data: tender } = useTender(tenderId);
	const currentSupplier = tender?.currentSupplier;
	const { data: allSuppliers = [], isLoading } = useAllSuppliers();
	const archiveMutation = useArchiveSuppliers();

	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SupplierSortState>({ field: "tco", direction: "asc" });
	const [activePaymentTypes, setActivePaymentTypes] = useState<PaymentType[]>([]);
	const [activeDeliveryFilters, setActiveDeliveryFilters] = useState<DeliveryFilter[]>([]);
	const [activeItemIds, setActiveItemIds] = useState<string[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showArchived, setShowArchived] = useState(false);

	const tenderQuotesByIdentity = useMemo(() => {
		const map = new Map<string, Map<string, number>>();
		for (const s of allSuppliers) {
			if (s.archived) continue;
			if (!itemIds.has(s.itemId)) continue;
			if (s.status !== "получено_кп") continue;
			if (s.tco == null) continue;
			const identity = supplierIdentity(s);
			let perItem = map.get(identity);
			if (!perItem) {
				perItem = new Map();
				map.set(identity, perItem);
			}
			perItem.set(s.itemId, s.tco);
		}
		return map;
	}, [allSuppliers, itemIds]);

	const activeItemIdsSet = useMemo(() => new Set(activeItemIds), [activeItemIds]);
	// One row per identity; lowest-ТСО quote wins when a supplier covers multiple positions.
	const dedupedSuppliers = useMemo(() => {
		const byIdentity = new Map<string, Supplier>();
		for (const s of allSuppliers) {
			if (s.archived !== showArchived) continue;
			if (!itemIds.has(s.itemId)) continue;
			if (s.status !== "получено_кп") continue;
			if (activeItemIdsSet.size > 0 && !activeItemIdsSet.has(s.itemId)) continue;
			const identity = supplierIdentity(s);
			const existing = byIdentity.get(identity);
			if (!existing) {
				byIdentity.set(identity, s);
				continue;
			}
			if (s.tco != null && (existing.tco == null || s.tco < existing.tco)) {
				byIdentity.set(identity, s);
			}
		}
		return [...byIdentity.values()];
	}, [allSuppliers, itemIds, showArchived, activeItemIdsSet]);

	const currentSupplierInn = currentSupplier?.inn;
	const currentSupplierName = currentSupplier?.companyName;

	const { suppliers: filteredSuppliers, currentSupplierRowId } = useMemo(() => {
		const isCurrent = (s: { inn: string; companyName: string }) => {
			if (currentSupplierInn) return s.inn === currentSupplierInn;
			if (currentSupplierName) return s.companyName === currentSupplierName;
			return false;
		};
		let foundId: string | undefined;
		const remaining: Supplier[] = [];
		for (const s of dedupedSuppliers) {
			if (isCurrent(s)) {
				foundId = s.id;
				continue;
			}
			if (search) {
				const q = search.toLowerCase();
				if (!s.companyName.toLowerCase().includes(q) && !s.inn.includes(search)) continue;
			}
			if (activePaymentTypes.length > 0 && !activePaymentTypes.includes(s.paymentType)) continue;
			if (!matchesDeliveryFilter(s.deliveryCost, activeDeliveryFilters)) continue;
			remaining.push(s);
		}
		return { suppliers: remaining, currentSupplierRowId: foundId };
	}, [dedupedSuppliers, search, activePaymentTypes, activeDeliveryFilters, currentSupplierInn, currentSupplierName]);

	const sortedSuppliers = useMemo(() => sortConsolidatedSuppliers(filteredSuppliers, sort), [filteredSuppliers, sort]);
	const {
		visible: visibleSuppliers,
		hasNextPage,
		loadMore,
	} = useClientPagination(sortedSuppliers, CONSOLIDATED_PAGE_SIZE);
	const totalCount = sortedSuppliers.length + (currentSupplierRowId ? 1 : 0);

	function handleSort(field: SupplierSortField) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	function handlePaymentTypeFilter(t: PaymentType) {
		setActivePaymentTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
	}

	function handleDeliveryFilter(t: DeliveryFilter) {
		setActiveDeliveryFilters((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
	}

	function handleItemFilter(itemId: string) {
		setActiveItemIds((prev) => (prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]));
	}

	function handleSelectionChange(idOrAll: string) {
		if (idOrAll === "all") {
			setSelectedIds((prev) =>
				prev.size === visibleSuppliers.length ? new Set() : new Set(visibleSuppliers.map((s) => s.id)),
			);
			return;
		}
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(idOrAll)) next.delete(idOrAll);
			else next.add(idOrAll);
			return next;
		});
	}

	function archiveByIds(ids: string[]) {
		const byItem = groupSupplierIdsByItem(sortedSuppliers, ids);
		for (const [itemId, supplierIds] of byItem) {
			archiveMutation.mutate({ itemId, supplierIds });
		}
	}

	function handleArchive() {
		archiveByIds([...selectedIds]);
		setSelectedIds(new Set());
	}

	function handleArchiveSupplier(id: string) {
		archiveByIds([id]);
	}

	return (
		<div data-testid="tender-tab-offers" className="h-full">
			<OffersTable
				suppliers={visibleSuppliers}
				totalCount={totalCount}
				// Multi-item: no single batch quantity, so СТОИМОСТЬ renders «—».
				item={{ quantityPerDelivery: undefined }}
				currentSupplier={currentSupplier}
				currentSupplierRowId={currentSupplierRowId}
				isLoading={isLoading}
				hasNextPage={hasNextPage}
				loadMore={loadMore}
				isFetchingNextPage={false}
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSort={handleSort}
				activePaymentTypes={activePaymentTypes}
				onPaymentTypeFilter={handlePaymentTypeFilter}
				activeDeliveryFilters={activeDeliveryFilters}
				onDeliveryFilter={handleDeliveryFilter}
				selectedIds={selectedIds}
				onSelectionChange={handleSelectionChange}
				onArchive={handleArchive}
				isArchiving={archiveMutation.isPending}
				onArchiveSupplier={handleArchiveSupplier}
				showArchived={showArchived}
				onToggleArchived={() => setShowArchived((v) => !v)}
				tenderItems={items}
				tenderQuotesByIdentity={tenderQuotesByIdentity}
				activeItemIds={activeItemIds}
				onItemFilter={handleItemFilter}
			/>
		</div>
	);
}

function sortConsolidatedSuppliers(suppliers: Supplier[], sort: SupplierSortState): Supplier[] {
	if (!sort) return suppliers;
	const sign = sort.direction === "asc" ? 1 : -1;
	const accessor = (s: Supplier): number | string | null => {
		switch (sort.field) {
			case "companyName":
				return s.companyName;
			case "tco":
				return s.tco;
			case "leadTimeDays":
				return s.leadTimeDays;
			case "foundedYear":
				return s.foundedYear;
			case "revenue":
				return s.revenue;
			default:
				return null;
		}
	};
	return [...suppliers].sort((a, b) => {
		const av = accessor(a);
		const bv = accessor(b);
		if (av == null && bv == null) return 0;
		if (av == null) return 1;
		if (bv == null) return -1;
		if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "ru") * sign;
		return ((av as number) - (bv as number)) * sign;
	});
}

function TenderTasksTab({ tenderId, onTaskClick }: { tenderId: string; onTaskClick: (id: string) => void }) {
	const [searchParams, setSearchParams] = useSearchParams();
	const [search, setSearch] = useState("");
	const [searchUserExpanded, setSearchUserExpanded] = useState(false);
	const searchExpanded = search.length > 0 || searchUserExpanded;
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [sort, setSort] = useState<DataTableSort | null>({ field: "createdAt", direction: "desc" });
	const isMobile = useIsMobile();
	const updateStatus = useUpdateTaskStatus();

	const statusParam = searchParams.get("task_status") as TasksFilter | null;
	const activeFilter: TasksFilter | null =
		statusParam === "completed" || statusParam === "archived" ? statusParam : null;

	const taskColumns = useTaskColumns({ tender: tenderId, q: search || undefined });

	function handleFilterToggle(filter: TasksFilter) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (activeFilter === filter) next.delete("task_status");
				else next.set("task_status", filter);
				return next;
			},
			{ replace: true },
		);
		setSelectedIds(new Set());
	}

	function handleSort(field: string) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	const activeFilterTasks = activeFilter ? taskColumns[activeFilter].tasks : null;

	const tasks = useMemo(() => {
		const base = activeFilterTasks ?? [...taskColumns.assigned.tasks, ...taskColumns.in_progress.tasks];
		if (!sort) {
			return [...base].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		}
		return [...base].sort((a, b) => compareTasks(a, b, sort.field as TaskSortField, sort.direction));
	}, [activeFilterTasks, taskColumns.assigned.tasks, taskColumns.in_progress.tasks, sort]);

	const isLoading = taskColumns.assigned.isLoading;

	const tasksTotalCount = activeFilter
		? taskColumns[activeFilter].count
		: taskColumns.assigned.count + taskColumns.in_progress.count;

	function handleSelectionChange(idOrAll: string) {
		if (idOrAll === "all") {
			setSelectedIds((prev) => {
				const allSelected = tasks.length > 0 && tasks.every((t) => prev.has(t.id));
				if (allSelected) {
					const next = new Set(prev);
					for (const t of tasks) next.delete(t.id);
					return next;
				}
				const next = new Set(prev);
				for (const t of tasks) next.add(t.id);
				return next;
			});
		} else {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(idOrAll)) next.delete(idOrAll);
				else next.add(idOrAll);
				return next;
			});
		}
	}

	function handleArchiveTask(id: string) {
		updateStatus.mutate({ id, status: "archived" });
	}

	function handleArchiveSelected() {
		for (const id of selectedIds) {
			updateStatus.mutate({ id, status: "archived" });
		}
		setSelectedIds(new Set());
	}

	const toolbar =
		selectedIds.size > 0 ? (
			<div className="mx-3 flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
				<span className="text-sm font-medium tabular-nums">Выбрано: {selectedIds.size}</span>
				<Button type="button" variant="outline" size="sm" onClick={handleArchiveSelected} aria-label="Архивировать">
					<Archive className="mr-1 size-4" aria-hidden="true" />
					Архивировать
				</Button>
			</div>
		) : (
			<div className="flex items-center gap-2 px-3">
				{!(isMobile && searchExpanded) && (
					<span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
						{formatRussianPlural(tasksTotalCount, ["задача", "задачи", "задач"])}
					</span>
				)}
				<div className={cn("ml-auto flex items-center gap-1", isMobile && searchExpanded && "flex-1")}>
					<ToolbarSearch
						value={search}
						onChange={setSearch}
						ariaLabel="Поиск задач"
						debounceMs={250}
						expanded={searchUserExpanded}
						onExpandedChange={setSearchUserExpanded}
					/>
					{!(isMobile && searchExpanded) &&
						FILTER_BUTTONS.map(({ key, label }) => {
							const Icon = STATUS_ICONS[key];
							const count = taskColumns[key].count;
							const active = activeFilter === key;
							return (
								<Tooltip key={key}>
									<TooltipTrigger asChild>
										<button
											type="button"
											aria-label={label}
											aria-pressed={active}
											className={cn(
												"inline-flex items-center gap-1 rounded-[min(var(--radius-md),12px)] px-2 py-1 text-sm transition-colors",
												"hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
											)}
											onClick={() => handleFilterToggle(key)}
										>
											<Icon className={cn("size-4", active && "text-highlight-foreground")} aria-hidden="true" />
											{count > 0 && (
												<span className={cn("tabular-nums text-xs", active && "text-highlight-foreground")}>
													{count}
												</span>
											)}
										</button>
									</TooltipTrigger>
									<TooltipContent>{label}</TooltipContent>
								</Tooltip>
							);
						})}
				</div>
			</div>
		);

	function renderMobileCard(t: Task) {
		return <TaskCard task={t} onClick={onTaskClick} hideTenderName />;
	}

	return (
		<div data-testid="tender-tab-tasks" className="h-full">
			<DataTable<Task>
				columns={TASK_TABLE_COLUMNS}
				rows={tasks}
				getRowId={(t) => t.id}
				isLoading={isLoading}
				emptyMessage="Нет задач"
				selection={{
					selectedIds,
					onChange: handleSelectionChange,
					getRowLabel: (id) => `Выбрать ${tasks.find((t) => t.id === id)?.name ?? id}`,
				}}
				sort={sort}
				onSort={handleSort}
				rowActions={(t) => [
					{
						label: "Архивировать",
						icon: <Archive className="size-3.5" />,
						onSelect: () => handleArchiveTask(t.id),
					},
				]}
				toolbar={toolbar}
				mobileCardRender={renderMobileCard}
				onRowClick={onTaskClick}
				isMobile={isMobile}
			/>
		</div>
	);
}

function TenderDetailsTab({
	tender,
	items,
	folder,
}: {
	tender: ProcurementInquiry;
	items: readonly ProcurementItem[];
	folder?: Folder;
}) {
	const { data: company } = useCompanyDetail(tender.companyId ?? null);
	const addressesText = useMemo(() => {
		if (!tender.addressIds || !company?.addresses) return "";
		const set = new Set(tender.addressIds);
		return company.addresses
			.filter((a) => set.has(a.id))
			.map((a) => a.address)
			.join("; ");
	}, [tender.addressIds, company?.addresses]);
	const yesNo = (v: boolean | undefined) => (v ? "Да" : "Нет");
	const currentSupplier = tender.currentSupplier;

	return (
		<div data-testid="tender-tab-details" className="flex flex-col gap-6">
			<Section title="Основное">
				<CardGrid>
					<FieldCard label="Компания">
						<ValueText value={company?.name ?? ""} />
					</FieldCard>
					<FieldCard label="Категория">
						<ValueText value={folder?.name ?? ""} />
					</FieldCard>
					<FieldCard label="Название" span="full">
						<ValueText value={tender.name} />
					</FieldCard>
					<FieldCard label="Бюджет">
						<ValueText value={formatCurrency(tender.budget)} />
					</FieldCard>
					<FieldCard label="Дедлайн">
						<ValueText value={formatDate(tender.deadline)} />
					</FieldCard>
					<FieldCard label="Дата создания">
						<ValueText value={formatDate(tender.createdAt)} />
					</FieldCard>
				</CardGrid>
			</Section>

			<Section title={`Позиции (${items.length})`}>
				{items.length === 0 ? (
					<p className="py-2 text-sm text-muted-foreground">Позиций пока нет.</p>
				) : (
					<div className="flex flex-col gap-3" data-testid="tender-items-list">
						{items.map((item, index) => (
							<TenderPositionCard key={item.id} item={item} index={index} />
						))}
					</div>
				)}
			</Section>

			<Section title="Логистика и финансы">
				<CardGrid>
					<FieldCard label="Разгрузка">
						<ValueText value={tender.unloading ? UNLOADING_LABELS[tender.unloading] : ""} />
					</FieldCard>
					<FieldCard label="Способ оплаты">
						<ValueText value={tender.paymentMethod ? PAYMENT_METHOD_LABELS[tender.paymentMethod] : ""} />
					</FieldCard>
					<FieldCard label="Адрес доставки" span="full">
						<ValueText value={addressesText} />
					</FieldCard>
				</CardGrid>
			</Section>

			<Section title="Дополнительно">
				<CardGrid>
					<FieldCard label="Требования" span="half">
						<ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
							<li>
								<span className="text-muted-foreground">Отсрочка:</span> {yesNo(tender.deferralRequired)}
							</li>
							<li>
								<span className="text-muted-foreground">Образец:</span> {yesNo(tender.sampleRequired)}
							</li>
							<li>
								<span className="text-muted-foreground">Аналоги:</span> {yesNo(tender.analoguesAllowed)}
							</li>
						</ul>
					</FieldCard>
					<FieldCard label="Комментарий" span="full">
						<ValueText value={tender.additionalInfo ?? ""} />
					</FieldCard>
				</CardGrid>
			</Section>

			<Section title="Ваш поставщик">
				<CardGrid>
					<FieldCard label="Название">
						<ValueText value={currentSupplier?.companyName ?? ""} />
					</FieldCard>
					<FieldCard label="ИНН">
						<ValueText value={currentSupplier?.inn ?? ""} />
					</FieldCard>
					<FieldCard label="Цена">
						<ValueText
							value={currentSupplier?.pricePerUnit != null ? formatCurrency(currentSupplier.pricePerUnit) : ""}
						/>
					</FieldCard>
					<FieldCard label="Оплата">
						<ValueText
							value={
								currentSupplier
									? formatPaymentType(currentSupplier.paymentType ?? "prepayment", {
											deferralDays: currentSupplier.deferralDays ?? 0,
											prepaymentPercent: currentSupplier.prepaymentPercent,
										})
									: ""
							}
						/>
					</FieldCard>
				</CardGrid>
			</Section>
		</div>
	);
}

function TenderPositionCard({ item, index }: { item: ProcurementItem; index: number }) {
	return (
		<section
			aria-label={`Позиция ${index + 1}`}
			data-testid={`tender-item-${item.id}`}
			className="relative flex flex-col gap-4 rounded-xl border border-border/60 bg-card/40 p-4"
		>
			<FieldCardLine label="Название" value={item.name} />
			<FieldCardLine label="Спецификация" value={item.description ?? ""} />
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<FieldCardLine label="Ед. изм." value={item.unit ?? ""} />
				<FieldCardLine
					label="Кол-во в поставке"
					value={item.quantityPerDelivery != null ? String(item.quantityPerDelivery) : ""}
				/>
				<FieldCardLine label="Объём в год" value={String(item.annualQuantity)} />
			</div>
			<FieldCardLine label="Текущая цена без НДС" value={formatCurrency(item.currentPrice)} />
		</section>
	);
}

function FieldCardLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
			<ValueText value={value} />
		</div>
	);
}
