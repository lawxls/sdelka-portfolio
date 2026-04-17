import { ChevronDown, ChevronRight, LoaderCircle, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	STATUS_ICONS,
	STATUS_LABELS,
	TASK_STATUSES,
	type Task,
	type TaskFilterParams,
	type TaskStatus,
} from "@/data/task-types";
import { useAllTasks, useTaskColumns } from "@/data/use-tasks";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { getAvatarColor } from "@/lib/avatar-colors";
import { formatAssigneeName, formatDayMonth, getInitials, isOverdue, pluralizeRu } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_BADGE_VARIANT = {
	assigned: "outline",
	in_progress: "default",
	completed: "secondary",
	archived: "ghost",
} as const;

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"] as const;
const SKELETON_ROW_KEYS = ["sk-r1", "sk-r2", "sk-r3"] as const;

interface TaskTableProps {
	onTaskClick?: (taskId: string) => void;
	filterParams?: TaskFilterParams;
	isMobile?: boolean;
	showQuestionCount?: boolean;
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function TaskTableCard({
	task,
	index,
	onTaskClick,
}: {
	task: Task;
	index: number;
	onTaskClick?: (id: string) => void;
}) {
	const overdue = isOverdue(task.deadlineAt);
	const StatusIcon = STATUS_ICONS[task.status];
	const assigneeName = formatAssigneeName(task.assignee);

	return (
		<button
			type="button"
			className={cn(
				"rounded-lg border bg-background p-4 text-left w-full",
				onTaskClick ? "cursor-pointer active:bg-muted/50 transition-colors" : "cursor-default",
			)}
			onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
			data-testid={`task-table-card-${task.id}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div className="font-medium text-sm leading-snug">{task.name}</div>
					<div className="mt-1">
						<Badge variant={STATUS_BADGE_VARIANT[task.status]}>
							<StatusIcon className="size-3" aria-hidden="true" />
							{STATUS_LABELS[task.status]}
						</Badge>
					</div>
				</div>
				<span className="tabular-nums text-xs text-muted-foreground shrink-0">{index + 1}</span>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
				<div>
					<div className="text-xs text-muted-foreground">Позиция</div>
					<div className="truncate">{task.item.name}</div>
				</div>
				<div>
					<div className="text-xs text-muted-foreground">Исполнитель</div>
					<div className="truncate">{assigneeName ?? "—"}</div>
				</div>
				<div>
					<div className="text-xs text-muted-foreground">Дедлайн</div>
					<div>
						<time dateTime={task.deadlineAt} className={cn(overdue && "font-medium text-destructive")}>
							{formatDayMonth(task.deadlineAt)}
						</time>
					</div>
				</div>
				<div>
					<div className="text-xs text-muted-foreground">Вопросы</div>
					<div className="tabular-nums">{task.questionCount}</div>
				</div>
			</div>
		</button>
	);
}

// ── Load-more sentinel (one per status group) ─────────────────────────────────

export function LoadMoreSentinel({ loadMore }: { loadMore: () => void }) {
	const ref = useIntersectionObserver(loadMore);
	return <div ref={ref} className="h-px" />;
}

// ── Desktop grouped row ───────────────────────────────────────────────────────

function TaskRow({
	task,
	onTaskClick,
	showQuestionCount,
	showCreatedDate,
}: {
	task: Task;
	onTaskClick?: (id: string) => void;
	showQuestionCount?: boolean;
	showCreatedDate?: boolean;
}) {
	const overdue = isOverdue(task.deadlineAt);
	const StatusIcon = STATUS_ICONS[task.status];

	return (
		<button
			type="button"
			className={cn(
				"flex w-full items-center gap-3 px-4 py-2 text-sm border-b border-border/50 last:border-0 text-left",
				onTaskClick
					? "cursor-pointer hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					: "cursor-default",
			)}
			onClick={() => onTaskClick?.(task.id)}
			data-testid={`task-row-${task.id}`}
		>
			<StatusIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<span className="flex-1 truncate">{task.name}</span>
			{showQuestionCount && task.questionCount > 0 && (
				<span className="inline-flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
					<MessageCircleQuestion className="size-3.5" aria-hidden="true" />
					{pluralizeRu(task.questionCount, "вопрос", "вопроса", "вопросов")}
				</span>
			)}
			{showCreatedDate ? (
				<time dateTime={task.createdAt} className="tabular-nums text-xs text-muted-foreground shrink-0">
					{formatDayMonth(task.createdAt)}
				</time>
			) : task.assignee ? (
				<span
					role="img"
					className={cn(
						"flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white",
						getAvatarColor(task.assignee.avatarIcon),
					)}
					aria-label={formatAssigneeName(task.assignee)}
				>
					{getInitials(task.assignee.firstName, task.assignee.lastName)}
				</span>
			) : (
				<span
					role="img"
					className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
					aria-label="Не назначен"
				/>
			)}
			<time
				dateTime={task.deadlineAt}
				className={cn(
					"tabular-nums text-xs text-muted-foreground w-10 text-right shrink-0",
					overdue && "font-medium text-destructive",
				)}
			>
				{formatDayMonth(task.deadlineAt)}
			</time>
		</button>
	);
}

// ── Desktop grouped table ─────────────────────────────────────────────────────

function TaskTableDesktop({
	onTaskClick,
	filterParams,
	showQuestionCount,
}: Pick<TaskTableProps, "onTaskClick" | "filterParams" | "showQuestionCount">) {
	const columns = useTaskColumns(filterParams);
	const isLoading = columns.assigned.isLoading;

	const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({
		assigned: false,
		in_progress: false,
		completed: false,
		archived: false,
	});

	function toggle(status: TaskStatus) {
		setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-auto touch-manipulation" data-testid="task-table">
			{TASK_STATUSES.map((status) => {
				const StatusIcon = STATUS_ICONS[status];
				const col = columns[status];
				const isCollapsed = collapsed[status];

				return (
					<div key={status} className="border-b border-border last:border-0">
						{/* Group header */}
						<button
							type="button"
							className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-accent/30 transition-colors"
							onClick={() => toggle(status)}
							aria-expanded={!isCollapsed}
						>
							{isCollapsed ? (
								<ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
							) : (
								<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
							)}
							<StatusIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
							<span>{STATUS_LABELS[status]}</span>
							{!isLoading && <span className="text-xs font-normal text-muted-foreground">{col.tasks.length}</span>}
						</button>

						{/* Task rows */}
						{!isCollapsed && (
							<div>
								{isLoading
									? SKELETON_ROW_KEYS.map((key) => (
											<div
												key={key}
												data-testid="skeleton-row"
												className="flex items-center gap-3 px-4 py-2 border-b border-border/50 last:border-0"
											>
												<Skeleton className="size-3.5 rounded-full" />
												<Skeleton className="h-4 flex-1" />
												<Skeleton className="size-6 rounded-full" />
												<Skeleton className="h-4 w-10" />
											</div>
										))
									: col.tasks.map((task) => (
											<TaskRow
												key={task.id}
												task={task}
												onTaskClick={onTaskClick}
												showQuestionCount={showQuestionCount}
											/>
										))}
								{!isLoading && col.hasNextPage && <LoadMoreSentinel loadMore={col.loadMore} />}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ── Mobile list ───────────────────────────────────────────────────────────────

function TaskTableMobile({ onTaskClick, filterParams }: Pick<TaskTableProps, "onTaskClick" | "filterParams">) {
	const { tasks, isLoading, hasNextPage, loadMore, isFetchingNextPage } = useAllTasks(filterParams);
	const sentinelRef = useIntersectionObserver(() => {
		if (hasNextPage && !isFetchingNextPage) loadMore();
	});

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex-1 overflow-auto touch-manipulation" data-testid="card-scroll-container">
				{isLoading && (
					<div className="flex flex-col gap-3 p-4">
						{SKELETON_KEYS.map((key) => (
							<div key={key} data-testid="skeleton-card" className="rounded-lg border bg-background p-4">
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="mt-1.5 h-4 w-16" />
									</div>
									<Skeleton className="h-4 w-6" />
								</div>
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
					<p className="py-8 text-center text-sm text-muted-foreground">Нет задач</p>
				)}
				{!isLoading && tasks.length > 0 && (
					<div className="flex flex-col gap-3 p-4">
						{tasks.map((task, index) => (
							<TaskTableCard key={task.id} task={task} index={index} onTaskClick={onTaskClick} />
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
		</div>
	);
}

// ── Public component ──────────────────────────────────────────────────────────

export function TaskTable({ onTaskClick, filterParams, isMobile, showQuestionCount }: TaskTableProps) {
	if (isMobile) {
		return <TaskTableMobile onTaskClick={onTaskClick} filterParams={filterParams} />;
	}
	return (
		<TaskTableDesktop onTaskClick={onTaskClick} filterParams={filterParams} showQuestionCount={showQuestionCount} />
	);
}
