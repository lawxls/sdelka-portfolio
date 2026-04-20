import { Archive, Ban, Check, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/data-table";
import { DetailsTabPanel } from "@/components/details-tab-panel";
import { ExpandingSearch } from "@/components/expanding-search";
import { LoadMoreSentinel } from "@/components/load-more-sentinel";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import { SearchSuppliersTable } from "@/components/search-suppliers-table";
import { SupplierDetailDrawer } from "@/components/supplier-detail-drawer";
import { type DeliveryFilter, matchesDeliveryFilter, SuppliersTable } from "@/components/suppliers-table";
import { TaskDrawer } from "@/components/task-drawer";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
	SearchSupplierCompanyType,
	SearchSupplierRequestStatus,
	SearchSupplierSortField,
	SearchSupplierSortState,
} from "@/data/search-supplier-types";
import type { SupplierSortField, SupplierSortState, SupplierStatus } from "@/data/supplier-types";
import { STATUS_ICONS, type Task } from "@/data/task-types";
import type { PaymentType, ProcurementItem } from "@/data/types";
import { useItemDetail } from "@/data/use-item-detail";
import {
	useArchiveSearchSuppliers,
	usePromoteSearchSuppliers,
	useSearchSuppliers,
	useUnarchiveSearchSuppliers,
} from "@/data/use-search-suppliers";
import {
	useArchiveSuppliers,
	useInfiniteSuppliers,
	useSelectSupplier,
	useSupplier,
	useSuppliers,
} from "@/data/use-suppliers";
import { useTaskColumns, useUpdateTaskStatus } from "@/data/use-tasks";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatDayMonthShort, formatDayMonthShortTime, formatRussianPlural, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

type ItemDrawerTab = "search" | "suppliers" | "details" | "tasks";

const TABS: { key: ItemDrawerTab; label: string }[] = [
	{ key: "search", label: "Поиск" },
	{ key: "suppliers", label: "Поставщики" },
	{ key: "tasks", label: "Задачи" },
	{ key: "details", label: "Информация" },
];

const DEFAULT_TAB: ItemDrawerTab = "search";
const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

function parseItemDrawerTab(param: string | null): ItemDrawerTab {
	if (param && VALID_TABS.has(param)) return param as ItemDrawerTab;
	return DEFAULT_TAB;
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

	function handleSupplierOpen(id: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("supplier", id);
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
				onSelectSupplier={handleSelectSupplier}
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

function SearchTabPanel({ itemId }: { itemId: string }) {
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SearchSupplierSortState>(null);
	const [activeCompanyTypes, setActiveCompanyTypes] = useState<SearchSupplierCompanyType[]>([]);
	const [activeRequestStatuses, setActiveRequestStatuses] = useState<SearchSupplierRequestStatus[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showArchived, setShowArchived] = useState(false);

	const filterParams = useMemo(
		() => ({
			search: search || undefined,
			companyTypes: activeCompanyTypes.length > 0 ? activeCompanyTypes : undefined,
			requestStatuses: activeRequestStatuses.length > 0 ? activeRequestStatuses : undefined,
			showArchived,
			sort: sort?.field,
			dir: sort?.direction,
		}),
		[search, activeCompanyTypes, activeRequestStatuses, showArchived, sort],
	);

	const query = useSearchSuppliers(itemId, filterParams);
	const archiveMutation = useArchiveSearchSuppliers();
	const unarchiveMutation = useUnarchiveSearchSuppliers();
	const promoteMutation = usePromoteSearchSuppliers();
	const entries = query.data ?? [];

	function handleSort(field: SearchSupplierSortField) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	function handleCompanyTypeFilter(type: SearchSupplierCompanyType) {
		setActiveCompanyTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
	}

	function handleRequestStatusFilter(status: SearchSupplierRequestStatus) {
		setActiveRequestStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
	}

	function handleSelectionChange(idOrAll: string) {
		if (idOrAll === "all") {
			setSelectedIds((prev) => (prev.size === entries.length ? new Set() : new Set(entries.map((e) => e.id))));
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
		const visible = new Set(entries.map((e) => e.id));
		return [...selectedIds].filter((id) => visible.has(id));
	}

	function handleArchiveBatch() {
		archiveMutation.mutate({ itemId, ids: visibleSelectedIds() }, { onSuccess: () => setSelectedIds(new Set()) });
	}

	function handleArchiveEntry(id: string) {
		archiveMutation.mutate({ itemId, ids: [id] });
	}

	function handleUnarchiveEntry(id: string) {
		unarchiveMutation.mutate({ itemId, ids: [id] });
	}

	function handleSendRequest(id: string) {
		promoteMutation.mutate(
			{ itemId, ids: [id] },
			{
				onSuccess: (promoted) => {
					if (promoted.length > 0) toast.success("Запрос отправлен");
				},
			},
		);
	}

	function handleSendRequestBatch() {
		promoteMutation.mutate(
			{ itemId, ids: visibleSelectedIds() },
			{
				onSuccess: (promoted) => {
					setSelectedIds(new Set());
					if (promoted.length === 0) return;
					toast.success(promoted.length === 1 ? "Запрос отправлен" : `Запрос отправлен ${promoted.length} поставщикам`);
				},
			},
		);
	}

	function handleSendRequestAll() {
		const ids = entries.filter((e) => e.requestStatus === "new").map((e) => e.id);
		if (ids.length === 0) return;
		promoteMutation.mutate(
			{ itemId, ids },
			{
				onSuccess: (promoted) => {
					if (promoted.length === 0) return;
					toast.success(promoted.length === 1 ? "Запрос отправлен" : `Запрос отправлен ${promoted.length} поставщикам`);
				},
			},
		);
	}

	function handleToggleArchived() {
		setShowArchived((v) => !v);
		setSelectedIds(new Set());
	}

	return (
		<div data-testid="tab-panel-search">
			<SearchSuppliersTable
				entries={entries}
				isLoading={query.isLoading}
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSort={handleSort}
				activeCompanyTypes={activeCompanyTypes}
				onCompanyTypeFilter={handleCompanyTypeFilter}
				activeRequestStatuses={activeRequestStatuses}
				onRequestStatusFilter={handleRequestStatusFilter}
				selectedIds={selectedIds}
				onSelectionChange={handleSelectionChange}
				onArchive={handleArchiveBatch}
				isArchiving={archiveMutation.isPending}
				onArchiveEntry={handleArchiveEntry}
				onUnarchiveEntry={handleUnarchiveEntry}
				onSendRequest={handleSendRequest}
				onSendRequestBatch={handleSendRequestBatch}
				onSendRequestAll={handleSendRequestAll}
				showArchived={showArchived}
				onToggleArchived={handleToggleArchived}
			/>
		</div>
	);
}

function SuppliersTabPanel({
	itemId,
	onSupplierClick,
	onSelectSupplier,
}: {
	itemId: string;
	onSupplierClick: (id: string) => void;
	onSelectSupplier?: (supplierId: string, companyName: string) => void;
}) {
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SupplierSortState>(null);
	const [activeStatuses, setActiveStatuses] = useState<SupplierStatus[]>([]);
	const [activePaymentTypes, setActivePaymentTypes] = useState<PaymentType[]>([]);
	const [activeDeliveryFilters, setActiveDeliveryFilters] = useState<DeliveryFilter[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showArchived, setShowArchived] = useState(false);

	const filterParams = useMemo(
		() => ({
			search: search || undefined,
			statuses: activeStatuses.length > 0 ? activeStatuses : undefined,
			showArchived,
			sort: sort?.field,
			dir: sort?.direction,
		}),
		[search, activeStatuses, showArchived, sort],
	);
	const query = useInfiniteSuppliers(itemId, filterParams);
	const archiveMutation = useArchiveSuppliers();
	const suppliers = useMemo(() => {
		const raw = query.data?.pages.flatMap((p) => p.suppliers) ?? [];
		return raw.filter((s) => {
			if (activePaymentTypes.length > 0 && !activePaymentTypes.includes(s.paymentType)) return false;
			if (!matchesDeliveryFilter(s.deliveryCost, activeDeliveryFilters)) return false;
			return true;
		});
	}, [query.data, activePaymentTypes, activeDeliveryFilters]);

	function handleSort(field: SupplierSortField) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	function handleStatusFilter(status: SupplierStatus) {
		setActiveStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
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
		// Batch archive: clip selection to visible rows so filter changes can't leak onto hidden suppliers.
		const visible = new Set(suppliers.map((s) => s.id));
		const ids = [...selectedIds].filter((id) => visible.has(id));
		archiveMutation.mutate({ itemId, supplierIds: ids }, { onSuccess: () => setSelectedIds(new Set()) });
	}

	const { data: itemDetail } = useItemDetail(itemId);
	const currentSupplier = itemDetail?.currentSupplier;

	return (
		<div data-testid="tab-panel-suppliers">
			<SuppliersTable
				suppliers={suppliers}
				item={{ quantityPerDelivery: itemDetail?.quantityPerDelivery }}
				currentSupplier={currentSupplier}
				isLoading={query.isLoading}
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSort={handleSort}
				activeStatuses={activeStatuses}
				onStatusFilter={handleStatusFilter}
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
			<div className="mx-3 flex items-center gap-3 rounded-md bg-muted px-3 py-2">
				<span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
				<Button type="button" variant="outline" size="sm" onClick={handleArchiveSelected} aria-label="Архивировать">
					<Archive className="mr-1 size-4" aria-hidden="true" />
					Архивировать
				</Button>
			</div>
		) : (
			<div className="flex items-center gap-2 px-3">
				<span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
					{formatRussianPlural(tasks.length, ["задача", "задачи", "задач"])}
				</span>
				<div className="ml-auto flex items-center gap-1">
					<ExpandingSearch value={search} onChange={setSearch} ariaLabel="Поиск задач" debounceMs={250} />
					{FILTER_BUTTONS.map(({ key, label }) => {
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
		const overdue = isOverdue(t.deadlineAt);
		return (
			<button
				type="button"
				data-testid={`task-row-${t.id}`}
				className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
				onClick={() => onTaskClick(t.id)}
			>
				<div className="font-medium text-sm">{t.name}</div>
				<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<div>
						<div className="text-xs text-muted-foreground">Вопросы</div>
						<div className="tabular-nums">
							{t.questionCount > 0 ? formatRussianPlural(t.questionCount, ["вопрос", "вопроса", "вопросов"]) : "\u2014"}
						</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Дедлайн</div>
						<time dateTime={t.deadlineAt} className={cn("tabular-nums", overdue && "font-medium text-destructive")}>
							{formatDayMonthShort(t.deadlineAt)}
						</time>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Создано</div>
						<time dateTime={t.createdAt} className="tabular-nums">
							{formatDayMonthShortTime(t.createdAt)}
						</time>
					</div>
				</div>
			</button>
		);
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
	onSupplierClick: (id: string) => void;
	onTaskClick: (id: string) => void;
	onSelectSupplier?: (supplierId: string, companyName: string) => void;
}) {
	const itemName = item?.name;
	const itemStatus = item?.status;
	const taskColumns = useTaskColumns({ item: itemId });
	const activeTaskCount = taskColumns.assigned.count + taskColumns.in_progress.count;

	const { data: searchSuppliersData } = useSearchSuppliers(itemId);
	const searchTabCount = searchSuppliersData?.length ?? 0;
	const { data: allSuppliersData } = useSuppliers(itemId);
	const headerMetrics = useMemo(() => {
		const list = allSuppliersData?.suppliers;
		if (!list) return { total: 0, quotesReceived: 0, refusals: 0 };
		let quotesReceived = 0;
		let refusals = 0;
		for (const s of list) {
			if (s.status === "получено_кп") quotesReceived++;
			else if (s.status === "отказ") refusals++;
		}
		return { total: list.length, quotesReceived, refusals };
	}, [allSuppliersData?.suppliers]);

	const tabCounts: Record<ItemDrawerTab, number> = {
		tasks: activeTaskCount,
		search: searchTabCount,
		suppliers: headerMetrics.total,
		details: 0,
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SheetHeader>
				<SheetTitle>{itemName ?? "Позиция"}</SheetTitle>
				<SheetDescription className="sr-only">Детали позиции закупки</SheetDescription>
				{(itemStatus || headerMetrics.total > 0) && (
					<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
						{itemStatus && (
							<span className={`inline-flex items-center gap-1.5 font-normal ${STATUS_CONFIG[itemStatus].className}`}>
								<ProcurementStatusIcon
									status={itemStatus}
									searchCompleted={item?.searchCompleted}
									iconClassName="size-3.5"
								/>
								{STATUS_CONFIG[itemStatus].label}
							</span>
						)}
						{itemStatus && (
							<span className="select-none text-muted-foreground/50" aria-hidden="true">
								•
							</span>
						)}
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
							<HeaderMetric
								icon={Users}
								count={headerMetrics.total}
								label="Всего поставщиков"
								colorClass="text-muted-foreground"
								testId="header-metric-total"
							/>
							<HeaderMetric
								icon={Check}
								count={headerMetrics.quotesReceived}
								label="Получено КП"
								colorClass="text-green-600 dark:text-green-400"
								testId="header-metric-quotes"
							/>
							<HeaderMetric
								icon={Ban}
								count={headerMetrics.refusals}
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
					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={activeTab === tab.key}
							aria-label={tab.label}
							className={cn(
								"shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
								activeTab === tab.key
									? "border-b-2 border-primary text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
							onClick={() => onTabChange(tab.key)}
						>
							{tab.label}
							{count > 0 && (
								<span aria-hidden="true" className="ml-1.5 tabular-nums text-xs text-muted-foreground">
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
				{activeTab === "search" && <SearchTabPanel itemId={itemId} />}
				{activeTab === "suppliers" && (
					<SuppliersTabPanel itemId={itemId} onSupplierClick={onSupplierClick} onSelectSupplier={onSelectSupplier} />
				)}
				{activeTab === "details" && <DetailsTabPanel itemId={itemId} />}
				{activeTab === "tasks" && <TasksTabPanel itemId={itemId} onTaskClick={onTaskClick} />}
			</div>
		</div>
	);
}
