import { LoaderCircle } from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TaskFilterParams } from "@/data/task-types";
import { STATUS_ICONS, STATUS_LABELS } from "@/data/task-types";
import { useAllTasks } from "@/data/use-tasks";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { formatShortDate } from "@/lib/format";
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
}

export function TaskTable({ onTaskClick, filterParams }: TaskTableProps) {
	const { tasks, isLoading, hasNextPage, loadMore, isFetchingNextPage } = useAllTasks(filterParams);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const now = new Date();

	const sentinelRef = useIntersectionObserver(
		() => {
			if (hasNextPage && !isFetchingNextPage) loadMore();
		},
		{ root: scrollContainerRef.current },
	);

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
								const isOverdue = new Date(task.deadline) < now;
								const StatusIcon = STATUS_ICONS[task.status];
								return (
									<TableRow
										key={task.id}
										className={onTaskClick ? "cursor-pointer" : undefined}
										onClick={() => onTaskClick?.(task.id)}
									>
										<TableCell className="text-right tabular-nums text-muted-foreground">{index + 1}</TableCell>
										<TableCell>
											<div className="font-medium">{task.title}</div>
											<Badge variant={STATUS_BADGE_VARIANT[task.status]} className="mt-1">
												<StatusIcon className="size-3" aria-hidden="true" />
												{STATUS_LABELS[task.status]}
											</Badge>
										</TableCell>
										<TableCell>{task.procurementItemName}</TableCell>
										<TableCell>{task.assignee.name}</TableCell>
										<TableCell>
											<time dateTime={task.deadline} className={cn(isOverdue && "font-medium text-destructive")}>
												{formatShortDate(task.deadline)}
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
