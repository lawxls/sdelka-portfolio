import { LoaderCircle } from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Task, TaskFilterParams } from "@/data/task-types";
import { STATUS_ICONS, STATUS_LABELS } from "@/data/task-types";
import { useAllTasks } from "@/data/use-tasks";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { formatAssigneeName, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_BADGE_VARIANT = {
	assigned: "outline",
	in_progress: "default",
	completed: "secondary",
	archived: "ghost",
} as const;

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"] as const;

const stickyHead = "sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_var(--color-border)]";

interface TaskTableProps {
	onTaskClick?: (taskId: string) => void;
	filterParams?: TaskFilterParams;
	isMobile?: boolean;
}

function TaskTableCard({
	task,
	index,
	onTaskClick,
}: {
	task: Task;
	index: number;
	onTaskClick?: (id: string) => void;
}) {
	const now = new Date();
	const isOverdue = new Date(task.deadlineAt) < now;
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
						<time dateTime={task.deadlineAt} className={cn(isOverdue && "font-medium text-destructive")}>
							{formatShortDate(task.deadlineAt)}
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

export function TaskTable({ onTaskClick, filterParams, isMobile }: TaskTableProps) {
	const { tasks, isLoading, hasNextPage, loadMore, isFetchingNextPage } = useAllTasks(filterParams);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const now = new Date();

	const sentinelRef = useIntersectionObserver(
		() => {
			if (hasNextPage && !isFetchingNextPage) loadMore();
		},
		{ root: scrollContainerRef.current },
	);

	if (isMobile) {
		return (
			<div className="flex min-h-0 flex-1 flex-col">
				<div
					ref={scrollContainerRef}
					className="flex-1 overflow-auto touch-manipulation"
					data-testid="card-scroll-container"
				>
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

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div ref={scrollContainerRef} className="flex flex-1 flex-col overflow-auto touch-manipulation">
				<Table className="table-fixed">
					<TableHeader>
						<TableRow>
							<TableHead className={`w-8 text-right ${stickyHead}`}>№</TableHead>
							<TableHead className={`w-[30%] ${stickyHead}`}>НАЗВАНИЕ</TableHead>
							<TableHead className={`w-[20%] ${stickyHead}`}>ПОЗИЦИЯ</TableHead>
							<TableHead className={`w-[16%] ${stickyHead}`}>ИСПОЛНИТЕЛЬ</TableHead>
							<TableHead className={`w-[12%] ${stickyHead}`}>ДЕДЛАЙН</TableHead>
							<TableHead className={`w-[12%] ${stickyHead}`}>СОЗДАНО</TableHead>
							<TableHead className={`w-[10%] text-right ${stickyHead}`}>ВОПРОСЫ</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading &&
							SKELETON_KEYS.map((key, i) => (
								<TableRow key={key} data-testid="skeleton-row">
									<TableCell className="text-right tabular-nums text-muted-foreground">{i + 1}</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-32" />
										<Skeleton className="mt-1.5 h-4 w-16" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-24" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-14" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-14" />
									</TableCell>
									<TableCell className="text-right">
										<Skeleton className="ml-auto h-4 w-8" />
									</TableCell>
								</TableRow>
							))}
						{!isLoading &&
							tasks.map((task, index) => {
								const isOverdue = new Date(task.deadlineAt) < now;
								const StatusIcon = STATUS_ICONS[task.status];
								const assigneeName = formatAssigneeName(task.assignee);
								return (
									<TableRow
										key={task.id}
										className={onTaskClick ? "cursor-pointer" : undefined}
										onClick={() => onTaskClick?.(task.id)}
									>
										<TableCell className="text-right tabular-nums text-muted-foreground">{index + 1}</TableCell>
										<TableCell>
											<div className="font-medium">{task.name}</div>
											<Badge variant={STATUS_BADGE_VARIANT[task.status]} className="mt-1">
												<StatusIcon className="size-3" aria-hidden="true" />
												{STATUS_LABELS[task.status]}
											</Badge>
										</TableCell>
										<TableCell>{task.item.name}</TableCell>
										<TableCell>{assigneeName}</TableCell>
										<TableCell>
											<time dateTime={task.deadlineAt} className={cn(isOverdue && "font-medium text-destructive")}>
												{formatShortDate(task.deadlineAt)}
											</time>
										</TableCell>
										<TableCell>
											<time dateTime={task.createdAt}>{formatShortDate(task.createdAt)}</time>
										</TableCell>
										<TableCell className="text-right tabular-nums">{task.questionCount}</TableCell>
									</TableRow>
								);
							})}
					</TableBody>
				</Table>
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
