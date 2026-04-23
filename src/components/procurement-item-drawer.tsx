import { Archive, Ban, Check, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/data-table";
import { DetailsTabPanel } from "@/components/details-tab-panel";
import { LoadMoreSentinel } from "@/components/load-more-sentinel";
import { type DeliveryFilter, matchesDeliveryFilter, OffersTable } from "@/components/offers-table";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import {
	SUPPLIER_DRAWER_TABS,
	SupplierDetailDrawer,
	type SupplierDrawerTab,
} from "@/components/supplier-detail-drawer";
import { SuppliersTable } from "@/components/suppliers-table";
import { TaskCard } from "@/components/task-card";
import { TaskDrawer } from "@/components/task-drawer";
import { ToolbarSearch } from "@/components/toolbar-search";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
	SUPPLIER_STATUSES,
	type SupplierCompanyType,
	type SupplierSortField,
	type SupplierSortState,
	type SupplierStatus,
} from "@/data/supplier-types";
import { STATUS_ICONS, type Task } from "@/data/task-types";
import type { PaymentType, ProcurementItem } from "@/data/types";
import { getDisplayStatus } from "@/data/types";
import { useItemDetail } from "@/data/use-item-detail";
import {
	useArchiveSuppliers,
	useInfiniteSuppliers,
	useSelectSupplier,
	useSendSupplierRequest,
	useSupplier,
	useSuppliers,
	useUnarchiveSuppliers,
} from "@/data/use-suppliers";
import { useTaskColumns, useUpdateTaskStatus } from "@/data/use-tasks";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatDayMonthShort, formatDayMonthShortTime, formatRussianPlural, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

type ItemDrawerTab = "suppliers" | "offers" | "details" | "tasks";

const TABS: { key: ItemDrawerTab; label: string; mobileLabel?: string }[] = [
	{ key: "suppliers", label: "Поставщики" },
	{ key: "offers", label: "Предложения" },
	{ key: "tasks", label: "Задачи" },
	{ key: "details", label: "Информация", mobileLabel: "Инфо" },
];

const DEFAULT_TAB: ItemDrawerTab = "suppliers";
const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

function parseItemDrawerTab(param: string | null): ItemDrawerTab {
	if (param && VALID_TABS.has(param)) return param as ItemDrawerTab;
	return DEFAULT_TAB;
}

const VALID_SUPPLIER_TABS = new Set<string>(SUPPLIER_DRAWER_TABS);

function parseSupplierTab(param: string | null): SupplierDrawerTab {
	if (param && VALID_SUPPLIER_TABS.has(param)) return param as SupplierDrawerTab;
	return "info";
}

interface ProcurementItemDrawerProps {
	item?: ProcurementItem;
}

export function ProcurementItemDrawer({ item }: ProcurementItemDrawerProps) {
	const [searchParams, setSearchParams] = useSearchParams();
	const isMobile = useIsMobile();

	const itemId = searchParams.get("item");
	const activeTab = parseItemDrawerTab(searchParams.get("tab"));
	const supplierId = searchParams.get("supplier");
	const supplierTab = parseSupplierTab(searchParams.get("supplier_tab"));
	const taskId = searchParams.get("task");
	const open = itemId != null;

	const { data: supplier } = useSupplier(itemId ?? "", supplierId);
	const [selectingSupplier, setSelectingSupplier] = useState<{ id: string; companyName: string } | null>(null);
	const selectMutation = useSelectSupplier();

	function handleTabChange(tab: ItemDrawerTab) {
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

	function handleClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("item");
				next.delete("tab");
				next.delete("supplier");
				next.delete("task_status");
				next.delete("task");
				return next;
			},
			{ replace: false },
		);
	}

	function handleSupplierOpen(id: string, origin: SupplierDrawerTab = "info") {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("supplier", id);
				next.set("supplier_tab", origin);
				return next;
			},
			{ replace: false },
		);
	}

	function handleSupplierClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("supplier");
				next.delete("supplier_tab");
				return next;
			},
			{ replace: false },
		);
	}

	function handleSupplierTabChange(tab: SupplierDrawerTab) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("supplier_tab", tab);
				return next;
			},
			{ replace: true },
		);
	}

	function handleNavigateToItem(targetItemId: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("item", targetItemId);
				// Land on the «Информация» (details) tab — the buyer wants item specs,
				// not another suppliers table when they click a card title.
				next.set("tab", "details");
				next.delete("supplier");
				next.delete("supplier_tab");
				return next;
			},
			{ replace: false },
		);
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

	function handleSelectSupplier(supplierId: string, companyName: string) {
		setSelectingSupplier({ id: supplierId, companyName });
	}

	function handleConfirmSelect() {
		if (!selectingSupplier || !itemId) return;
		selectMutation.mutate(
			{ itemId, supplierId: selectingSupplier.id },
			{ onSuccess: () => setSelectingSupplier(null) },
		);
	}

	return (
		<>
			<Sheet
				open={open}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) handleClose();
				}}
			>
				<SheetContent
					side={isMobile ? "bottom" : "right"}
					size={isMobile ? "full" : undefined}
					className={isMobile ? undefined : "!w-4/5 !max-w-none"}
				>
					{itemId && (
						<ProcurementItemDrawerContent
							key={itemId}
							itemId={itemId}
							item={item}
							activeTab={activeTab}
							onTabChange={handleTabChange}
							onSupplierClick={handleSupplierOpen}
							onTaskClick={handleTaskOpen}
							onSelectSupplier={handleSelectSupplier}
						/>
					)}
				</SheetContent>
			</Sheet>
			<SupplierDetailDrawer
				supplier={supplier ?? null}
				open={supplierId != null}
				onClose={handleSupplierClose}
				activeTab={supplierTab}
				onTabChange={handleSupplierTabChange}
				onNavigateToItem={handleNavigateToItem}
			/>
			<TaskDrawer taskId={taskId} onClose={handleTaskClose} isMobile={isMobile} />
			<AlertDialog
				open={selectingSupplier != null}
				onOpenChange={(open) => {
					if (!open) setSelectingSupplier(null);
				}}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Выбрать поставщика</AlertDialogTitle>
						<AlertDialogDescription>
							Выбрать {selectingSupplier?.companyName} текущим поставщиком?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Отмена</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmSelect}>Подтвердить</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

const SEARCH_IN_PROGRESS_SINGLE = "Дождитесь завершения поиска поставщиков чтобы отправить запрос";
const SEARCH_IN_PROGRESS_BATCH = "Дождитесь завершения поиска поставщиков чтобы отправить запросы";

function SuppliersTabPanel({ itemId, onSupplierClick }: { itemId: string; onSupplierClick: (id: string) => void }) {
	const { data: itemDetail } = useItemDetail(itemId);
	const searchBlocked = itemDetail != null && getDisplayStatus(itemDetail) === "searching";
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SupplierSortState>({ field: "companyName", direction: "asc" });
	const [activeCompanyTypes, setActiveCompanyTypes] = useState<SupplierCompanyType[]>([]);
	const [activeStatuses, setActiveStatuses] = useState<SupplierStatus[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showArchived, setShowArchived] = useState(false);
	const [confirmingRequestAll, setConfirmingRequestAll] = useState(false);

	// Pipeline = all statuses except получено_кп. If the user has picked a subset via filter,
	// honor that; otherwise request the full pipeline set.
	const effectiveStatuses = useMemo(
		() => (activeStatuses.length > 0 ? activeStatuses : [...SUPPLIER_STATUSES]),
		[activeStatuses],
	);

	const filterParams = useMemo(
		() => ({
			search: search || undefined,
			statuses: effectiveStatuses,
			companyTypes: activeCompanyTypes.length > 0 ? activeCompanyTypes : undefined,
			showArchived,
			sort: sort?.field,
			dir: sort?.direction,
		}),
		[search, effectiveStatuses, activeCompanyTypes, showArchived, sort],
	);

	const query = useInfiniteSuppliers(itemId, filterParams);
	const archiveMutation = useArchiveSuppliers();
	const unarchiveMutation = useUnarchiveSuppliers();
	const sendRequestMutation = useSendSupplierRequest();
	const suppliers = useMemo(() => query.data?.pages.flatMap((p) => p.suppliers) ?? [], [query.data]);
	const totalCount = query.data?.pages[0]?.total ?? suppliers.length;
	const { data: allSuppliersData } = useSuppliers(itemId);
	const statusCounts = useMemo(() => {
		const counts: Partial<Record<SupplierStatus, number>> = {};
		for (const s of allSuppliersData?.suppliers ?? []) {
			if (s.archived) continue;
			counts[s.status] = (counts[s.status] ?? 0) + 1;
		}
		return counts;
	}, [allSuppliersData?.suppliers]);
	const candidateCount = statusCounts.new ?? 0;

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
			setSelectedIds((prev) => (prev.size === suppliers.length ? new Set() : new Set(suppliers.map((s) => s.id))));
		} else {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(idOrAll)) next.delete(idOrAll);
				else next.add(idOrAll);
				return next;
			});
		}
	}

	// Filter selection against the currently visible rows so changes to search/type/status
	// filters can't leak batch actions onto hidden entries.
	function visibleSelectedIds() {
		const visible = new Set(suppliers.map((s) => s.id));
		return [...selectedIds].filter((id) => visible.has(id));
	}

	function handleArchiveBatch() {
		archiveMutation.mutate(
			{ itemId, supplierIds: visibleSelectedIds() },
			{ onSuccess: () => setSelectedIds(new Set()) },
		);
	}

	function handleArchiveSupplier(id: string) {
		archiveMutation.mutate({ itemId, supplierIds: [id] });
	}

	function handleUnarchiveSupplier(id: string) {
		unarchiveMutation.mutate({ itemId, supplierIds: [id] });
	}

	function blockIfSearching(message: string): boolean {
		if (!searchBlocked) return false;
		toast.info(message);
		return true;
	}

	function handleSendRequest(id: string) {
		if (blockIfSearching(SEARCH_IN_PROGRESS_SINGLE)) return;
		sendRequestMutation.mutate(
			{ itemId, supplierIds: [id] },
			{
				onSuccess: (transitioned) => {
					if (transitioned.length > 0) toast.success("Запрашиваем КП");
				},
			},
		);
	}

	function handleSendRequestBatch() {
		if (blockIfSearching(SEARCH_IN_PROGRESS_BATCH)) return;
		sendRequestMutation.mutate(
			{ itemId, supplierIds: visibleSelectedIds() },
			{
				onSuccess: (transitioned) => {
					setSelectedIds(new Set());
					if (transitioned.length === 0) return;
					toast.success(transitioned.length === 1 ? "Запрашиваем КП" : "Запрашиваем КП у поставщиков");
				},
			},
		);
	}

	function handleSendRequestAll() {
		if (blockIfSearching(SEARCH_IN_PROGRESS_BATCH)) return;
		if (candidateCount === 0) {
			toast.info("Нет поставщиков со статусом «Кандидат»");
			return;
		}
		setConfirmingRequestAll(true);
	}

	function handleConfirmSendRequestAll() {
		// Source ids from the full supplier list so unscrolled candidates are included too.
		const ids = (allSuppliersData?.suppliers ?? []).filter((s) => s.status === "new" && !s.archived).map((s) => s.id);
		setConfirmingRequestAll(false);
		if (ids.length === 0) return;
		sendRequestMutation.mutate(
			{ itemId, supplierIds: ids },
			{
				onSuccess: (transitioned) => {
					if (transitioned.length === 0) return;
					toast.success(transitioned.length === 1 ? "Запрашиваем КП" : "Запрашиваем КП у поставщиков");
				},
			},
		);
	}

	function handleToggleArchived() {
		setShowArchived((v) => !v);
		setSelectedIds(new Set());
	}

	return (
		<div data-testid="tab-panel-suppliers">
			<SuppliersTable
				suppliers={suppliers}
				totalCount={totalCount}
				isLoading={query.isLoading}
				onRowClick={onSupplierClick}
				searchBlocked={searchBlocked}
				statusCounts={statusCounts}
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSort={handleSort}
				activeCompanyTypes={activeCompanyTypes}
				onCompanyTypeFilter={handleCompanyTypeFilter}
				activeStatuses={activeStatuses}
				onStatusFilter={handleStatusFilter}
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
				onToggleArchived={handleToggleArchived}
				hasNextPage={query.hasNextPage}
				loadMore={query.fetchNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
			/>
			<Dialog
				open={confirmingRequestAll}
				onOpenChange={(open) => {
					if (!open) setConfirmingRequestAll(false);
				}}
			>
				<DialogContent showCloseButton={false}>
					<DialogHeader className="gap-3">
						<DialogTitle>Запросить КП у поставщиков</DialogTitle>
						<DialogDescription className="leading-relaxed">
							Вы действительно хотите запросить КП у{"\u00A0"}
							{formatRussianPlural(candidateCount, ["поставщика", "поставщиков", "поставщиков"])}? Действие нельзя
							отменить.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="sm:justify-between">
						<Button variant="outline" onClick={() => setConfirmingRequestAll(false)}>
							Отмена
						</Button>
						<Button onClick={handleConfirmSendRequestAll}>Отправить</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function OffersTabPanel({
	itemId,
	onSupplierClick,
	onSelectSupplier,
}: {
	itemId: string;
	onSupplierClick: (id: string) => void;
	onSelectSupplier?: (supplierId: string, companyName: string) => void;
}) {
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SupplierSortState>({ field: "savings", direction: "desc" });
	const [activePaymentTypes, setActivePaymentTypes] = useState<PaymentType[]>([]);
	const [activeDeliveryFilters, setActiveDeliveryFilters] = useState<DeliveryFilter[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showArchived, setShowArchived] = useState(false);

	const filterParams = useMemo(
		() => ({
			search: search || undefined,
			statuses: ["получено_кп"] as SupplierStatus[],
			showArchived,
			sort: sort?.field,
			dir: sort?.direction,
		}),
		[search, showArchived, sort],
	);
	const query = useInfiniteSuppliers(itemId, filterParams);
	const archiveMutation = useArchiveSuppliers();
	// When no payment/delivery client-side filters are active, the server total matches.
	// Otherwise count the loaded rows that pass the client-side filter — the UX cost of fetching
	// all pages just to produce a total isn't worth it for these local filters.
	const suppliersRaw = useMemo(() => query.data?.pages.flatMap((p) => p.suppliers) ?? [], [query.data]);
	const suppliers = useMemo(() => {
		return suppliersRaw.filter((s) => {
			if (activePaymentTypes.length > 0 && !activePaymentTypes.includes(s.paymentType)) return false;
			if (!matchesDeliveryFilter(s.deliveryCost, activeDeliveryFilters)) return false;
			return true;
		});
	}, [suppliersRaw, activePaymentTypes, activeDeliveryFilters]);

	const serverTotal = query.data?.pages[0]?.total ?? suppliers.length;
	const hasClientFilters = activePaymentTypes.length > 0 || activeDeliveryFilters.length > 0;
	// With client-side filters active, the server total overstates the count; fall back to the loaded+filtered length.
	const totalCount = hasClientFilters ? suppliers.length : serverTotal;

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

	function handleSelectionChange(idOrAll: string) {
		if (idOrAll === "all") {
			setSelectedIds((prev) => (prev.size === suppliers.length ? new Set() : new Set(suppliers.map((s) => s.id))));
		} else {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(idOrAll)) next.delete(idOrAll);
				else next.add(idOrAll);
				return next;
			});
		}
	}

	function handleArchive(supplierIds?: string[]) {
		if (supplierIds) {
			archiveMutation.mutate({ itemId, supplierIds });
			return;
		}
		const visible = new Set(suppliers.map((s) => s.id));
		const ids = [...selectedIds].filter((id) => visible.has(id));
		archiveMutation.mutate({ itemId, supplierIds: ids }, { onSuccess: () => setSelectedIds(new Set()) });
	}

	const { data: itemDetail } = useItemDetail(itemId);
	const currentSupplier = itemDetail?.currentSupplier;

	return (
		<div data-testid="tab-panel-offers" className="h-full">
			<OffersTable
				suppliers={suppliers}
				totalCount={totalCount}
				item={{ quantityPerDelivery: itemDetail?.quantityPerDelivery }}
				currentSupplier={currentSupplier}
				isLoading={query.isLoading}
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
				onArchive={() => handleArchive()}
				isArchiving={archiveMutation.isPending}
				onArchiveSupplier={(id) => handleArchive([id])}
				onSelectSupplier={onSelectSupplier}
				showArchived={showArchived}
				onToggleArchived={() => setShowArchived((v) => !v)}
				onRowClick={onSupplierClick}
				hasNextPage={query.hasNextPage}
				loadMore={query.fetchNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
			/>
		</div>
	);
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
		cell: (t) =>
			t.questionCount > 0 ? formatRussianPlural(t.questionCount, ["вопрос", "вопроса", "вопросов"]) : "\u2014",
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

function TasksTabPanel({ itemId, onTaskClick }: { itemId: string; onTaskClick: (id: string) => void }) {
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

	const taskColumns = useTaskColumns({ item: itemId, q: search || undefined });

	function handleFilterToggle(filter: TasksFilter) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (activeFilter === filter) {
					next.delete("task_status");
				} else {
					next.set("task_status", filter);
				}
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

	// Toolbar count is the total matching the active filter across all pages, not just the loaded rows.
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
												active && "bg-muted",
											)}
											onClick={() => handleFilterToggle(key)}
										>
											<Icon className="size-4" aria-hidden="true" />
											{count > 0 && <span className="tabular-nums text-xs">{count}</span>}
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
		return <TaskCard task={t} onClick={onTaskClick} hideItemName />;
	}

	const sentinel = (
		<>
			{!activeFilter && taskColumns.assigned.hasNextPage && (
				<LoadMoreSentinel loadMore={taskColumns.assigned.loadMore} />
			)}
			{!activeFilter && taskColumns.in_progress.hasNextPage && (
				<LoadMoreSentinel loadMore={taskColumns.in_progress.loadMore} />
			)}
			{activeFilter && taskColumns[activeFilter].hasNextPage && (
				<LoadMoreSentinel loadMore={taskColumns[activeFilter].loadMore} />
			)}
		</>
	);

	return (
		<div data-testid="tab-panel-tasks" className="h-full">
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
				sentinel={sentinel}
			/>
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

function ProcurementItemDrawerContent({
	itemId,
	item,
	activeTab,
	onTabChange,
	onSupplierClick,
	onTaskClick,
	onSelectSupplier,
}: {
	itemId: string;
	item?: ProcurementItem;
	activeTab: ItemDrawerTab;
	onTabChange: (tab: ItemDrawerTab) => void;
	onSupplierClick: (id: string, origin?: SupplierDrawerTab) => void;
	onTaskClick: (id: string) => void;
	onSelectSupplier?: (supplierId: string, companyName: string) => void;
}) {
	const itemName = item?.name;
	const displayStatus = item ? getDisplayStatus(item) : null;

	const { data: allSuppliersData } = useSuppliers(itemId);
	const supplierCounts = useMemo(() => {
		const list = allSuppliersData?.suppliers;
		if (!list) return { total: 0, contacted: 0, quotesReceived: 0, refusals: 0 };
		let total = 0;
		let contacted = 0;
		let quotesReceived = 0;
		let refusals = 0;
		for (const s of list) {
			if (s.archived) continue;
			total++;
			if (s.status !== "new") contacted++;
			if (s.status === "получено_кп") quotesReceived++;
			else if (s.status === "отказ") refusals++;
		}
		return { total, contacted, quotesReceived, refusals };
	}, [allSuppliersData?.suppliers]);

	const taskColumns = useTaskColumns({ item: itemId });
	const activeTaskCount = taskColumns.assigned.count + taskColumns.in_progress.count;

	const tabCounts: Partial<Record<ItemDrawerTab, number>> = {
		suppliers: supplierCounts.total,
		offers: supplierCounts.quotesReceived,
		tasks: activeTaskCount,
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SheetHeader>
				<SheetTitle>{itemName ?? "Позиция"}</SheetTitle>
				<SheetDescription className="sr-only">Детали позиции закупки</SheetDescription>
				{(displayStatus || supplierCounts.contacted > 0) && (
					<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
						{displayStatus && (
							<span
								className={`inline-flex items-center gap-1.5 font-normal ${STATUS_CONFIG[displayStatus].className}`}
							>
								<ProcurementStatusIcon status={displayStatus} iconClassName="size-3.5" />
								{STATUS_CONFIG[displayStatus].label}
							</span>
						)}
						{displayStatus && (
							<span className="select-none text-muted-foreground/50" aria-hidden="true">
								•
							</span>
						)}
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
							<HeaderMetric
								icon={Mail}
								count={supplierCounts.contacted}
								label="Написали поставщикам"
								colorClass="text-muted-foreground"
								testId="header-metric-total"
							/>
							<HeaderMetric
								icon={Check}
								count={supplierCounts.quotesReceived}
								label="Получено КП"
								colorClass="text-green-600 dark:text-green-400"
								testId="header-metric-quotes"
							/>
							<HeaderMetric
								icon={Ban}
								count={supplierCounts.refusals}
								label="Отказ"
								colorClass="text-destructive"
								testId="header-metric-refusals"
							/>
						</div>
					</div>
				)}
			</SheetHeader>

			<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
				{TABS.map((tab) => {
					const count = tabCounts[tab.key];
					const isActive = activeTab === tab.key;
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
										"hidden min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs tabular-nums md:inline-flex",
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
				{activeTab === "suppliers" && (
					<SuppliersTabPanel itemId={itemId} onSupplierClick={(id) => onSupplierClick(id, "info")} />
				)}
				{activeTab === "offers" && (
					<OffersTabPanel
						itemId={itemId}
						onSupplierClick={(id) => onSupplierClick(id, "offers")}
						onSelectSupplier={onSelectSupplier}
					/>
				)}
				{activeTab === "details" && <DetailsTabPanel itemId={itemId} />}
				{activeTab === "tasks" && <TasksTabPanel itemId={itemId} onTaskClick={onTaskClick} />}
			</div>
		</div>
	);
}
