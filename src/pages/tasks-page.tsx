import { useInfiniteQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Archive, ArrowDown, ArrowUp, ArrowUpDown, Download, Inbox, ListFilter, LoaderCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { PageToolbar } from "@/components/page-toolbar";
import { TaskCard } from "@/components/task-card";
import { TaskDrawer } from "@/components/task-drawer";
import { ToolbarSearch } from "@/components/toolbar-search";
import { TotalCount } from "@/components/total-count";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchItemsMock } from "@/data/items-mock-data";
import { STATUS_ICONS, type Task, type TaskFilterParams, type TaskStatus } from "@/data/task-types";
import { useTasksCount, useTasksList, useUpdateTaskStatus } from "@/data/use-tasks";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { getAvatarColor } from "@/lib/avatar-colors";
import {
	formatAssigneeName,
	formatDayMonthShort,
	formatDayMonthShortTime,
	formatRussianPlural,
	getInitials,
	isOverdue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = "active" | "completed" | "archived";

const STATUS_FILTER_TO_STATUSES: Record<StatusFilter, TaskStatus[]> = {
	active: ["assigned", "in_progress"],
	completed: ["completed"],
	archived: ["archived"],
};

function parseStatusFilter(param: string | null): StatusFilter {
	return param === "completed" || param === "archived" ? param : "active";
}

type SortField = "name" | "assignee" | "questionCount" | "deadlineAt" | "createdAt";

const SORT_FIELDS = new Set<SortField>(["name", "assignee", "questionCount", "deadlineAt", "createdAt"]);

type SortState = { field: SortField; direction: "asc" | "desc" } | null;

interface SortableColumn {
	label: string;
	field: SortField;
	align?: "left" | "right";
}

const COLUMNS: SortableColumn[] = [
	{ label: "ЗАДАЧА", field: "name" },
	{ label: "НАЗНАЧЕНА", field: "assignee" },
	{ label: "ВОПРОСЫ", field: "questionCount", align: "right" },
	{ label: "ДЕДЛАЙН", field: "deadlineAt", align: "right" },
	{ label: "ДАТА И ВРЕМЯ СОЗДАНИЯ", field: "createdAt", align: "right" },
];

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"] as const;

const STICKY_HEAD = "sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_var(--color-border)]";

function SortIcon({ field, sort }: { field: SortField; sort: SortState }) {
	if (sort?.field !== field) return <ArrowUpDown className="size-3.5 text-muted-foreground/50" aria-hidden="true" />;
	return sort.direction === "asc" ? (
		<ArrowUp className="size-3.5" aria-hidden="true" />
	) : (
		<ArrowDown className="size-3.5" aria-hidden="true" />
	);
}

function SortableHeaderButton({
	col,
	sort,
	onSort,
}: {
	col: SortableColumn;
	sort: SortState;
	onSort: (field: SortField) => void;
}) {
	return (
		<button
			type="button"
			className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
			onClick={() => onSort(col.field)}
			aria-label={`Сортировать по ${col.label}`}
		>
			{col.label}
			<SortIcon field={col.field} sort={sort} />
		</button>
	);
}

interface FilterChipProps {
	icon: LucideIcon;
	label: string;
	count?: number;
	active: boolean;
	onClick: () => void;
}

function FilterChip({ icon: Icon, label, count, active, onClick }: FilterChipProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					aria-pressed={active}
					onClick={onClick}
					className={cn(
						"inline-flex h-8 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-sm transition-colors",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted",
					)}
				>
					<Icon className="size-4" aria-hidden="true" />
					{typeof count === "number" && count > 0 && <span className="tabular-nums text-xs font-medium">{count}</span>}
				</button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function AssigneeCell({ task }: { task: Task }) {
	const name = formatAssigneeName(task.assignee);
	if (!task.assignee) {
		return <span className="text-muted-foreground">—</span>;
	}
	return (
		<div className="flex items-center gap-2">
			<span
				role="img"
				aria-label={name}
				className={cn(
					"flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white",
					getAvatarColor(task.assignee.avatarIcon),
				)}
			>
				{getInitials(task.assignee.firstName, task.assignee.lastName)}
			</span>
			<span className="truncate">{name}</span>
		</div>
	);
}

function csvEscape(value: string): string {
	if (value.includes(",") || value.includes("\n") || value.includes('"')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function downloadTasksCsv(tasks: Task[]) {
	const header = ["Задача", "Позиция", "Назначена", "Вопросы", "Дедлайн", "Дата и время создания"];
	const rows = tasks.map((t) => [
		csvEscape(t.name),
		csvEscape(t.item.name),
		csvEscape(formatAssigneeName(t.assignee)),
		String(t.questionCount),
		formatDayMonthShort(t.deadlineAt),
		formatDayMonthShortTime(t.createdAt),
	]);
	const content = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
	const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

interface ItemFilterPopoverProps {
	activeItem?: string;
	onSelect: (itemId: string | undefined) => void;
}

function ItemFilterPopover({ activeItem, onSelect }: ItemFilterPopoverProps) {
	const [searchInput, setSearchInput] = useState("");
	const [effectiveSearch, setEffectiveSearch] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function handleSearchChange(next: string) {
		setSearchInput(next);
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => setEffectiveSearch(next), 200);
	}

	const query = useInfiniteQuery({
		queryKey: ["items-filter", effectiveSearch],
		queryFn: ({ pageParam }) => fetchItemsMock({ q: effectiveSearch || undefined, cursor: pageParam, limit: 25 }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
	const activeItemName = useMemo(() => items.find((i) => i.id === activeItem)?.name, [items, activeItem]);

	const sentinelRef = useIntersectionObserver(() => {
		if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
	});

	return (
		<Popover>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<button
							type="button"
							aria-label={activeItemName ? `Фильтр: ${activeItemName}` : "Фильтр по позиции"}
							className={cn(
								"relative inline-flex h-8 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-sm transition-colors",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								activeItem ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted",
							)}
						>
							<ListFilter className="size-4" aria-hidden="true" />
							{activeItem && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
						</button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>{activeItemName ? `Позиция: ${activeItemName}` : "Фильтр по позиции"}</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" className="w-72 p-0">
				<div className="border-b p-2">
					<Input
						type="search"
						placeholder="Поиск позиции…"
						value={searchInput}
						onChange={(e) => handleSearchChange(e.target.value)}
						spellCheck={false}
						autoComplete="off"
						className="h-8"
					/>
				</div>
				<div className="flex max-h-72 flex-col overflow-y-auto p-1" data-testid="item-filter-list">
					{activeItem && (
						<>
							<button
								type="button"
								className="rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
								onClick={() => onSelect(undefined)}
							>
								Сбросить фильтр
							</button>
							<div className="my-1 h-px bg-border" />
						</>
					)}
					{query.isLoading && (
						<div className="space-y-1 p-1">
							<Skeleton className="h-7 w-full" />
							<Skeleton className="h-7 w-full" />
							<Skeleton className="h-7 w-5/6" />
						</div>
					)}
					{!query.isLoading && items.length === 0 && (
						<div className="px-2 py-3 text-sm text-muted-foreground">Ничего не найдено</div>
					)}
					{items.map((item) => {
						const isActive = activeItem === item.id;
						return (
							<button
								key={item.id}
								type="button"
								aria-pressed={isActive}
								onClick={() => onSelect(isActive ? undefined : item.id)}
								className={cn(
									"truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors",
									"hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
									isActive && "bg-accent font-medium text-accent-foreground",
								)}
							>
								{item.name}
							</button>
						);
					})}
					{query.hasNextPage && <div ref={sentinelRef} className="h-px" />}
					{query.isFetchingNextPage && <div className="py-2 text-center text-xs text-muted-foreground">Загрузка…</div>}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function parseSort(params: URLSearchParams): SortState {
	const field = params.get("sort");
	const dir = params.get("dir");
	if (!field || !SORT_FIELDS.has(field as SortField) || (dir !== "asc" && dir !== "desc")) return null;
	return { field: field as SortField, direction: dir };
}

function compareTasksByField(a: Task, b: Task, field: SortField): number {
	switch (field) {
		case "name":
			return a.name.localeCompare(b.name, "ru");
		case "assignee":
			return formatAssigneeName(a.assignee).localeCompare(formatAssigneeName(b.assignee), "ru");
		case "questionCount":
			return a.questionCount - b.questionCount;
		case "deadlineAt":
			return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
		case "createdAt":
			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	}
}

interface TaskRowProps {
	task: Task;
	isSelected: boolean;
	onToggleSelect: () => void;
	onRowClick: () => void;
	onArchive: () => void;
}

function TaskTableRow({ task, isSelected, onToggleSelect, onRowClick, onArchive }: TaskRowProps) {
	const overdue = isOverdue(task.deadlineAt);
	const row = (
		<TableRow
			className="group cursor-pointer"
			onClick={onRowClick}
			data-testid={`task-row-${task.id}`}
			data-state={isSelected ? "selected" : undefined}
		>
			<TableCell onClick={(e) => e.stopPropagation()} className="w-10 pr-0">
				<Checkbox checked={isSelected} onCheckedChange={onToggleSelect} aria-label={`Выбрать ${task.name}`} />
			</TableCell>
			<TableCell className="w-[1%] font-medium">
				<div className="max-w-[440px]">
					<div className="truncate">{task.name}</div>
					<div className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{task.item.name}</div>
				</div>
			</TableCell>
			<TableCell>
				<AssigneeCell task={task} />
			</TableCell>
			<TableCell className="text-right tabular-nums">
				{task.questionCount > 0 ? task.questionCount : <span className="text-muted-foreground">—</span>}
			</TableCell>
			<TableCell className="text-right">
				<time dateTime={task.deadlineAt} className={cn("tabular-nums", overdue && "font-medium text-destructive")}>
					{formatDayMonthShort(task.deadlineAt)}
				</time>
			</TableCell>
			<TableCell className="text-right tabular-nums text-muted-foreground">
				{formatDayMonthShortTime(task.createdAt)}
			</TableCell>
		</TableRow>
	);

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onSelect={onArchive}>
					<Archive className="size-3.5" />
					Архивировать
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export function TasksPage() {
	const isMobile = useIsMobile();
	const [searchParams, setSearchParams] = useSearchParams();

	const taskId = searchParams.get("task");
	const search = searchParams.get("q") ?? "";
	const activeItem = searchParams.get("item") ?? undefined;
	const statusFilter = parseStatusFilter(searchParams.get("status"));
	const sort = parseSort(searchParams);

	const [searchUserExpanded, setSearchUserExpanded] = useState(false);
	const searchExpanded = search.length > 0 || searchUserExpanded;
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const updateStatus = useUpdateTaskStatus();
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	function updateParams(modifier: (p: URLSearchParams) => void, replace = true) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				modifier(next);
				return next;
			},
			{ replace },
		);
	}

	function setSearch(value: string) {
		updateParams((p) => (value ? p.set("q", value) : p.delete("q")));
		setSelectedIds(new Set());
	}

	function setStatusFilter(next: StatusFilter) {
		updateParams((p) => (next === "active" ? p.delete("status") : p.set("status", next)));
		setSelectedIds(new Set());
	}

	function setItemFilter(item: string | undefined) {
		updateParams((p) => (item ? p.set("item", item) : p.delete("item")));
		setSelectedIds(new Set());
	}

	function openTask(id: string) {
		updateParams((p) => p.set("task", id));
	}

	function closeTask() {
		updateParams((p) => p.delete("task"));
	}

	function handleSort(field: SortField) {
		updateParams((p) => {
			const currentField = p.get("sort");
			const currentDir = p.get("dir");
			if (currentField === field) {
				if (currentDir === "asc") {
					p.set("dir", "desc");
				} else {
					p.delete("sort");
					p.delete("dir");
				}
			} else {
				p.set("sort", field);
				p.set("dir", "asc");
			}
		}, false);
	}

	const listParams: TaskFilterParams = {
		...(search && { q: search }),
		...(activeItem && { item: activeItem }),
	};

	const activeStatuses = STATUS_FILTER_TO_STATUSES[statusFilter];

	const query = useTasksList({
		q: listParams.q,
		item: listParams.item,
		statuses: activeStatuses,
	});

	const rawTasks = query.tasks;

	const tasks = useMemo(() => {
		if (!sort) return rawTasks;
		const sign = sort.direction === "asc" ? 1 : -1;
		return [...rawTasks].sort((a, b) => compareTasksByField(a, b, sort.field) * sign);
	}, [rawTasks, sort]);

	const sentinelRef = useIntersectionObserver(query.loadMore, { root: scrollContainerRef.current });

	const completedCount = useTasksCount({ q: listParams.q, item: listParams.item, statuses: ["completed"] });
	const archivedCount = useTasksCount({ q: listParams.q, item: listParams.item, statuses: ["archived"] });

	const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id));

	function toggleRow(id: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAll() {
		if (allSelected) {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				for (const t of tasks) next.delete(t.id);
				return next;
			});
		} else {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				for (const t of tasks) next.add(t.id);
				return next;
			});
		}
	}

	function handleArchiveSelected() {
		const ids = [...selectedIds];
		for (const id of ids) updateStatus.mutate({ id, status: "archived" });
		setSelectedIds(new Set());
		toast.success(`Архивировано ${formatRussianPlural(ids.length, ["задача", "задачи", "задач"])}`);
	}

	function handleArchiveRow(id: string) {
		updateStatus.mutate({ id, status: "archived" });
		setSelectedIds((prev) => {
			if (!prev.has(id)) return prev;
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
	}

	function handleDownload() {
		if (tasks.length === 0) {
			toast.info("Нет задач для экспорта");
			return;
		}
		downloadTasksCsv(tasks);
	}

	const searchFullRow = isMobile && searchExpanded;

	const toolbar =
		selectedIds.size > 0 ? (
			<div className="flex items-center gap-3" data-testid="selection-bar">
				<span className="text-sm font-medium tabular-nums">Выбрано: {selectedIds.size}</span>
				<Button variant="outline" size="sm" onClick={handleArchiveSelected}>
					<Archive className="size-4" aria-hidden="true" />
					Архивировать
				</Button>
				<Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
					Отмена
				</Button>
			</div>
		) : (
			<div className={cn("flex items-center gap-1", searchFullRow && "flex-1")}>
				<ToolbarSearch
					value={search}
					onChange={setSearch}
					ariaLabel="Поиск задач"
					debounceMs={250}
					expanded={searchUserExpanded}
					onExpandedChange={setSearchUserExpanded}
				/>
				{!searchFullRow && (
					<>
						<FilterChip
							icon={STATUS_ICONS.completed}
							label="Завершённые"
							count={completedCount}
							active={statusFilter === "completed"}
							onClick={() => setStatusFilter(statusFilter === "completed" ? "active" : "completed")}
						/>
						<FilterChip
							icon={STATUS_ICONS.archived}
							label="Архив"
							count={archivedCount}
							active={statusFilter === "archived"}
							onClick={() => setStatusFilter(statusFilter === "archived" ? "active" : "archived")}
						/>
						<ItemFilterPopover activeItem={activeItem} onSelect={setItemFilter} />
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon-sm" aria-label="Скачать таблицу" onClick={handleDownload}>
									<Download aria-hidden="true" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Скачать таблицу</TooltipContent>
						</Tooltip>
					</>
				)}
			</div>
		);

	const emptyMessage =
		statusFilter === "archived" ? "Архив пуст" : statusFilter === "completed" ? "Нет завершённых задач" : "Нет задач";

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<PageToolbar
				left={
					<>
						<h1 className="text-sm font-semibold text-foreground leading-none">Задачи</h1>
						<span aria-hidden="true" className="text-sm text-border leading-none">
							/
						</span>
						<TotalCount
							value={query.totalCount}
							isLoading={query.isLoading && query.totalCount === undefined}
							forms={["задача", "задачи", "задач"]}
							className="text-sm font-normal text-muted-foreground leading-none"
						/>
					</>
				}
				middle={<div className="flex flex-1 items-center justify-end">{toolbar}</div>}
			/>

			<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50">
				{isMobile ? (
					<MobileTaskList
						tasks={tasks}
						isLoading={query.isLoading}
						isFetchingNextPage={query.isFetchingNextPage}
						hasNextPage={query.hasNextPage}
						sentinelRef={sentinelRef}
						scrollContainerRef={scrollContainerRef}
						emptyMessage={emptyMessage}
						onRowClick={openTask}
					/>
				) : (
					<div
						ref={scrollContainerRef}
						className="flex flex-1 flex-col overflow-auto touch-manipulation [&_tr>*:last-child]:pr-lg"
						data-testid="table-scroll-container"
					>
						<Table>
							<TableHeader>
								<TableRow className="border-b-0">
									<TableHead className={cn("w-10 pr-0", STICKY_HEAD)}>
										<Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Выбрать все" />
									</TableHead>
									{COLUMNS.map((col) => (
										<TableHead key={col.field} className={cn(col.align === "right" && "text-right", STICKY_HEAD)}>
											<SortableHeaderButton col={col} sort={sort} onSort={handleSort} />
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{query.isLoading &&
									SKELETON_KEYS.map((key) => (
										<TableRow key={key} data-testid="skeleton-row">
											<TableCell className="w-10 pr-0">
												<Skeleton className="size-4" />
											</TableCell>
											<TableCell>
												<Skeleton className="h-4 w-64" />
												<Skeleton className="mt-1 h-3 w-40" />
											</TableCell>
											<TableCell>
												<Skeleton className="h-4 w-32" />
											</TableCell>
											<TableCell className="text-right">
												<Skeleton className="ml-auto h-4 w-6" />
											</TableCell>
											<TableCell className="text-right">
												<Skeleton className="ml-auto h-4 w-12" />
											</TableCell>
											<TableCell className="text-right">
												<Skeleton className="ml-auto h-4 w-12" />
											</TableCell>
										</TableRow>
									))}
								{!query.isLoading &&
									tasks.map((task) => (
										<TaskTableRow
											key={task.id}
											task={task}
											isSelected={selectedIds.has(task.id)}
											onToggleSelect={() => toggleRow(task.id)}
											onRowClick={() => openTask(task.id)}
											onArchive={() => handleArchiveRow(task.id)}
										/>
									))}
							</TableBody>
						</Table>
						{!query.isLoading && tasks.length === 0 && (
							<div
								className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"
								data-testid="tasks-empty"
							>
								<Inbox className="size-8" aria-hidden="true" />
								<p className="text-sm">{emptyMessage}</p>
							</div>
						)}
						{query.hasNextPage && <div ref={sentinelRef} data-testid="scroll-sentinel" className="h-px" />}
						{query.isFetchingNextPage && (
							<div className="flex justify-center py-4" data-testid="loading-more-spinner">
								<LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Загрузка…" />
							</div>
						)}
					</div>
				)}
			</main>

			<TaskDrawer taskId={taskId} onClose={closeTask} isMobile={isMobile} />
		</div>
	);
}

function MobileTaskList({
	tasks,
	isLoading,
	isFetchingNextPage,
	hasNextPage,
	sentinelRef,
	scrollContainerRef,
	emptyMessage,
	onRowClick,
}: {
	tasks: Task[];
	isLoading: boolean;
	isFetchingNextPage: boolean;
	hasNextPage: boolean;
	sentinelRef: React.RefCallback<Element>;
	scrollContainerRef: React.RefObject<HTMLDivElement | null>;
	emptyMessage: string;
	onRowClick: (id: string) => void;
}) {
	return (
		<div
			ref={scrollContainerRef}
			className="flex-1 overflow-auto touch-manipulation"
			data-testid="card-scroll-container"
		>
			{isLoading && (
				<div className="flex flex-col gap-3 p-4">
					{SKELETON_KEYS.map((key) => (
						<div key={key} data-testid="skeleton-card" className="rounded-lg border bg-background p-4">
							<Skeleton className="h-4 w-48" />
							<Skeleton className="mt-1 h-3 w-24" />
							<div className="mt-3 grid grid-cols-2 gap-2">
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-full" />
							</div>
						</div>
					))}
				</div>
			)}
			{!isLoading && tasks.length === 0 && (
				<div
					className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground"
					data-testid="tasks-empty"
				>
					<Inbox className="size-8" aria-hidden="true" />
					<p className="text-sm">{emptyMessage}</p>
				</div>
			)}
			{!isLoading && tasks.length > 0 && (
				<div className="flex flex-col gap-3 p-4">
					{tasks.map((t) => (
						<TaskCard key={t.id} task={t} onClick={onRowClick} />
					))}
				</div>
			)}
			{hasNextPage && <div ref={sentinelRef} className="h-px" />}
			{isFetchingNextPage && (
				<div className="flex justify-center py-4" data-testid="loading-more-spinner">
					<LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Загрузка…" />
				</div>
			)}
		</div>
	);
}
