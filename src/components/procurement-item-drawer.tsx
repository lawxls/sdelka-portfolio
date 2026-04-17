import { Check, Clock, LoaderCircle, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { BestOfferCard } from "@/components/best-offer-card";
import { DetailsTabPanel } from "@/components/details-tab-panel";
import { STATUS_CONFIG } from "@/components/procurement-card";
import { SupplierDetailDrawer } from "@/components/supplier-detail-drawer";
import { SupplierResponseStatusCard } from "@/components/supplier-response-status-card";
import { SuppliersTable } from "@/components/suppliers-table";
import { TaskDrawer } from "@/components/task-drawer";
import { LoadMoreSentinel, TaskRow } from "@/components/task-table";
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
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { SupplierSortField, SupplierSortState, SupplierStatus } from "@/data/supplier-types";
import { STATUS_ICONS } from "@/data/task-types";
import type { ProcurementItem } from "@/data/types";
import { useItemDetail } from "@/data/use-item-detail";
import {
	useArchiveSuppliers,
	useInfiniteSuppliers,
	useSelectSupplier,
	useSupplier,
	useSuppliers,
} from "@/data/use-suppliers";
import { useTaskColumns } from "@/data/use-tasks";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

type ItemDrawerTab = "suppliers" | "details" | "tasks";

const TABS: { key: ItemDrawerTab; label: string }[] = [
	{ key: "suppliers", label: "Поставщики" },
	{ key: "tasks", label: "Задачи" },
	{ key: "details", label: "Информация" },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

function parseItemDrawerTab(param: string | null): ItemDrawerTab {
	if (param && VALID_TABS.has(param)) return param as ItemDrawerTab;
	return "suppliers";
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
				if (tab === "suppliers") {
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
					className={isMobile ? undefined : "!w-2/3 !max-w-none"}
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
	const suppliers = query.data?.pages.flatMap((p) => p.suppliers) ?? [];

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
		const ids = supplierIds ?? [...selectedIds];
		archiveMutation.mutate({ itemId, supplierIds: ids }, { onSuccess: () => setSelectedIds(new Set()) });
	}

	const { data: itemDetail } = useItemDetail(itemId);
	const currentSupplier = itemDetail?.currentSupplier;

	const { data: allSuppliersData } = useSuppliers(itemId);
	const allSuppliers = allSuppliersData?.suppliers ?? [];

	return (
		<div data-testid="tab-panel-suppliers">
			<div className="mb-3 grid grid-cols-1 gap-3 px-4 xl:grid-cols-2">
				<BestOfferCard
					suppliers={allSuppliers}
					item={{ quantityPerDelivery: itemDetail?.quantityPerDelivery }}
					currentSupplier={currentSupplier}
					onSupplierClick={onSupplierClick}
				/>
				<SupplierResponseStatusCard suppliers={allSuppliers} />
			</div>
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

function TasksTabPanel({ itemId, onTaskClick }: { itemId: string; onTaskClick: (id: string) => void }) {
	const [searchParams, setSearchParams] = useSearchParams();
	const [search, setSearch] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

	const statusParam = searchParams.get("task_status") as TasksFilter | null;
	const activeFilter: TasksFilter | null =
		statusParam === "completed" || statusParam === "archived" ? statusParam : null;

	const columns = useTaskColumns({ item: itemId, q: search || undefined });

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
	}

	function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => setSearch(value), 250);
	}

	const activeFilterTasks = activeFilter ? columns[activeFilter].tasks : null;

	const tasks = useMemo(() => {
		if (activeFilterTasks) return activeFilterTasks;
		return [...columns.assigned.tasks, ...columns.in_progress.tasks].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}, [activeFilterTasks, columns.assigned.tasks, columns.in_progress.tasks]);

	const isLoading = columns.assigned.isLoading;

	return (
		<div data-testid="tab-panel-tasks">
			<div className="mb-4 flex flex-wrap items-center gap-2">
				<div className="relative flex-1 max-w-56">
					<Search
						className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input
						type="search"
						placeholder="Поиск…"
						onChange={handleSearchInput}
						className="h-8 pl-8 text-sm"
						spellCheck={false}
						autoComplete="off"
					/>
				</div>
				{FILTER_BUTTONS.map(({ key, label }) => {
					const Icon = STATUS_ICONS[key];
					const count = columns[key].count;
					return (
						<button
							key={key}
							type="button"
							className={cn(
								"inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
								"hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								activeFilter === key ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
							)}
							onClick={() => handleFilterToggle(key)}
						>
							<Icon className="size-3.5" aria-hidden="true" />
							{label}
							{count > 0 && <span className="tabular-nums text-xs">{count}</span>}
						</button>
					);
				})}
			</div>

			{isLoading ? (
				<div className="space-y-px">
					<div className="h-10 animate-pulse bg-muted" />
					<div className="h-10 animate-pulse bg-muted" />
					<div className="h-10 animate-pulse bg-muted" />
				</div>
			) : tasks.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">Нет задач</p>
			) : (
				<div>
					{tasks.map((task) => (
						<TaskRow key={task.id} task={task} onTaskClick={onTaskClick} showQuestionCount showCreatedDate />
					))}
					{!activeFilter && columns.assigned.hasNextPage && <LoadMoreSentinel loadMore={columns.assigned.loadMore} />}
					{!activeFilter && columns.in_progress.hasNextPage && (
						<LoadMoreSentinel loadMore={columns.in_progress.loadMore} />
					)}
					{activeFilter && columns[activeFilter].hasNextPage && (
						<LoadMoreSentinel loadMore={columns[activeFilter].loadMore} />
					)}
				</div>
			)}
		</div>
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

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SheetHeader>
				<SheetTitle className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<span>{itemName ?? "Позиция"}</span>
					{itemStatus && (
						<span
							className={`inline-flex items-center gap-1.5 text-sm font-normal ${STATUS_CONFIG[itemStatus].className}`}
						>
							{itemStatus === "awaiting_analytics" && <Clock className="size-3.5" aria-hidden="true" />}
							{itemStatus === "searching" && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
							{itemStatus === "negotiating" && (
								<span className="size-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
							)}
							{itemStatus === "completed" && <Check className="size-3.5" aria-hidden="true" />}
							{STATUS_CONFIG[itemStatus].label}
						</span>
					)}
				</SheetTitle>
				<SheetDescription className="sr-only">Детали позиции закупки</SheetDescription>
			</SheetHeader>

			<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.key}
						className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
							activeTab === tab.key
								? "border-b-2 border-primary text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
						onClick={() => onTabChange(tab.key)}
					>
						{tab.label}
						{tab.key === "tasks" && activeTaskCount > 0 && (
							<span className="ml-1.5 tabular-nums text-xs text-muted-foreground">({activeTaskCount})</span>
						)}
					</button>
				))}
			</div>

			<div className={`min-h-0 flex-1 overflow-y-auto ${activeTab === "suppliers" ? "pt-3" : "p-4"}`}>
				{activeTab === "suppliers" && (
					<SuppliersTabPanel itemId={itemId} onSupplierClick={onSupplierClick} onSelectSupplier={onSelectSupplier} />
				)}
				{activeTab === "details" && <DetailsTabPanel itemId={itemId} />}
				{activeTab === "tasks" && <TasksTabPanel itemId={itemId} onTaskClick={onTaskClick} />}
			</div>
		</div>
	);
}
