import { Check, Clock, LoaderCircle, MessageCircle, Search, Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { AnalyticsTabPanel } from "@/components/analytics-tab-panel";
import { DetailsTabPanel } from "@/components/details-tab-panel";
import { STATUS_CONFIG } from "@/components/procurement-card";
import { SupplierDetailDrawer } from "@/components/supplier-detail-drawer";
import { SuppliersTable } from "@/components/suppliers-table";
import { TaskCard } from "@/components/task-card";
import { TaskDrawer } from "@/components/task-drawer";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { seedItemDetail } from "@/data/item-detail-mock-data";
import type { SupplierSortField, SupplierSortState, SupplierStatus } from "@/data/supplier-types";
import { STATUS_ICONS, STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/data/task-types";
import type { ProcurementItem } from "@/data/types";
import { useDeleteSuppliers, useInfiniteSuppliers, useSupplier, useSuppliers } from "@/data/use-suppliers";
import { useTaskColumns } from "@/data/use-tasks";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

type ItemDrawerTab = "suppliers" | "analytics" | "details" | "tasks";

const TABS: { key: ItemDrawerTab; label: string }[] = [
	{ key: "suppliers", label: "Поставщики" },
	{ key: "tasks", label: "Задачи" },
	{ key: "analytics", label: "Аналитика" },
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
				next.delete("status");
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
						/>
					)}
				</SheetContent>
			</Sheet>
			<SupplierDetailDrawer supplier={supplier ?? null} open={supplierId != null} onClose={handleSupplierClose} />
			<TaskDrawer taskId={taskId} onClose={handleTaskClose} isMobile={isMobile} />
		</>
	);
}

function SuppliersTabPanel({ itemId, onSupplierClick }: { itemId: string; onSupplierClick: (id: string) => void }) {
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<SupplierSortState>(null);
	const [activeStatuses, setActiveStatuses] = useState<SupplierStatus[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const filterParams = useMemo(
		() => ({
			search: search || undefined,
			statuses: activeStatuses.length > 0 ? activeStatuses : undefined,
			sort: sort?.field,
			dir: sort?.direction,
		}),
		[search, activeStatuses, sort],
	);
	const query = useInfiniteSuppliers(itemId, filterParams);
	const deleteMutation = useDeleteSuppliers();
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

	function handleDelete() {
		const ids = [...selectedIds];
		deleteMutation.mutate(
			{ itemId, supplierIds: ids },
			{
				onSuccess: () => setSelectedIds(new Set()),
			},
		);
	}

	return (
		<div data-testid="tab-panel-suppliers">
			<SuppliersTable
				suppliers={suppliers}
				isLoading={query.isLoading}
				search={search}
				onSearchChange={setSearch}
				sort={sort}
				onSort={handleSort}
				activeStatuses={activeStatuses}
				onStatusFilter={handleStatusFilter}
				selectedIds={selectedIds}
				onSelectionChange={handleSelectionChange}
				onArchive={() => {}}
				isArchiving={false}
				onDelete={handleDelete}
				isDeleting={deleteMutation.isPending}
				onRowClick={onSupplierClick}
				hasNextPage={query.hasNextPage}
				loadMore={query.fetchNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
			/>
		</div>
	);
}

function TasksTabPanel({ itemId, onTaskClick }: { itemId: string; onTaskClick: (id: string) => void }) {
	const [searchParams, setSearchParams] = useSearchParams();
	const [search, setSearch] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

	const statusParam = searchParams.get("status");
	const activeStatus: TaskStatus = TASK_STATUSES.includes(statusParam as TaskStatus)
		? (statusParam as TaskStatus)
		: "assigned";

	const columns = useTaskColumns({ item: itemId, q: search || undefined });

	function handleStatusChange(status: TaskStatus) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (status === "assigned") {
					next.delete("status");
				} else {
					next.set("status", status);
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

	const activeColumn = columns[activeStatus];

	return (
		<div data-testid="tab-panel-tasks">
			<div className="mb-4 flex items-center gap-2">
				<div className="relative max-w-56">
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
				{TASK_STATUSES.map((status) => {
					const Icon = STATUS_ICONS[status];
					const isActive = activeStatus === status;
					return (
						<Tooltip key={status}>
							<TooltipTrigger asChild>
								<button
									type="button"
									aria-label={STATUS_LABELS[status]}
									data-testid={`task-status-${status}`}
									className={cn(
										"inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm tabular-nums transition-colors",
										"hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
									)}
									onClick={() => handleStatusChange(status)}
								>
									<Icon className="size-4" aria-hidden="true" />
									{columns[status].count}
								</button>
							</TooltipTrigger>
							<TooltipContent>{STATUS_LABELS[status]}</TooltipContent>
						</Tooltip>
					);
				})}
			</div>

			{activeColumn.isLoading ? (
				<div className="space-y-2 pr-[30%]">
					<div className="h-16 animate-pulse rounded-lg bg-muted" />
					<div className="h-16 animate-pulse rounded-lg bg-muted" />
					<div className="h-16 animate-pulse rounded-lg bg-muted" />
				</div>
			) : activeColumn.tasks.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">Нет задач</p>
			) : (
				<div className="space-y-2 pr-[30%]">
					{activeColumn.tasks.map((task) => (
						<TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} hideItemName showQuestionCount />
					))}
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
}: {
	itemId: string;
	item?: ProcurementItem;
	activeTab: ItemDrawerTab;
	onTabChange: (tab: ItemDrawerTab) => void;
	onSupplierClick: (id: string) => void;
	onTaskClick: (id: string) => void;
}) {
	// Idempotent — only seeds if item.id is missing from the mock store
	if (item) seedItemDetail(item);

	const itemName = item?.name;
	const itemStatus = item?.status;
	const { data: allSuppliersData } = useSuppliers(itemId);
	const allSuppliers = allSuppliersData?.suppliers ?? [];

	const totalCount = allSuppliers.length;
	const negotiatingCount = allSuppliers.filter((s) => s.status === "переговоры").length;
	const kpCount = allSuppliers.filter((s) => s.status === "получено_кп").length;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SheetHeader>
				<SheetTitle className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<span>{itemName ?? "Позиция"}</span>
					{itemStatus && (
						<>
							<span className="text-muted-foreground/40" aria-hidden="true">
								&bull;
							</span>
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
						</>
					)}
					{totalCount > 0 && (
						<>
							<span className="text-muted-foreground/40" aria-hidden="true">
								&bull;
							</span>
							<span className="inline-flex items-center gap-3 text-sm font-normal text-muted-foreground">
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="inline-flex items-center gap-1">
											<Users className="size-3.5" aria-hidden="true" />
											{totalCount}
										</span>
									</TooltipTrigger>
									<TooltipContent>Всего поставщиков</TooltipContent>
								</Tooltip>
								{negotiatingCount > 0 && (
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
												<MessageCircle className="size-3.5" aria-hidden="true" />
												{negotiatingCount}
											</span>
										</TooltipTrigger>
										<TooltipContent>Переговоры</TooltipContent>
									</Tooltip>
								)}
								{kpCount > 0 && (
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="inline-flex items-center gap-1 text-highlight-foreground">
												<Check className="size-3.5" aria-hidden="true" />
												{kpCount}
											</span>
										</TooltipTrigger>
										<TooltipContent>Получено КП</TooltipContent>
									</Tooltip>
								)}
							</span>
						</>
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
					</button>
				))}
			</div>

			<div className={`min-h-0 flex-1 overflow-y-auto ${activeTab === "suppliers" ? "pt-3" : "p-4"}`}>
				{activeTab === "suppliers" && <SuppliersTabPanel itemId={itemId} onSupplierClick={onSupplierClick} />}
				{activeTab === "analytics" && (
					<div data-testid="tab-panel-analytics">
						<AnalyticsTabPanel itemId={itemId} />
					</div>
				)}
				{activeTab === "details" && <DetailsTabPanel itemId={itemId} />}
				{activeTab === "tasks" && <TasksTabPanel itemId={itemId} onTaskClick={onTaskClick} />}
			</div>
		</div>
	);
}
