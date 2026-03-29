import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TaskFilterParams } from "@/data/task-types";
import { STATUS_LABELS } from "@/data/task-types";
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

interface TaskTableProps {
	onTaskClick?: (taskId: string) => void;
	filterParams?: TaskFilterParams;
}

export function TaskTable({ onTaskClick, filterParams }: TaskTableProps) {
	const { tasks, isLoading, hasNextPage, loadMore, isFetchingNextPage } = useAllTasks(filterParams);

	const sentinelRef = useIntersectionObserver(() => {
		if (hasNextPage && !isFetchingNextPage) loadMore();
	});

	if (isLoading) {
		return (
			<div className="flex-1 overflow-auto p-4">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Название</TableHead>
							<TableHead>Позиция</TableHead>
							<TableHead>Исполнитель</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead>Дедлайн</TableHead>
							<TableHead>Создано</TableHead>
							<TableHead>Вопросы</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{[1, 2, 3, 4, 5].map((i) => (
							<TableRow key={i} data-testid="skeleton-row">
								<TableCell colSpan={7}>
									<Skeleton className="h-5 w-full" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-auto p-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Название</TableHead>
						<TableHead>Позиция</TableHead>
						<TableHead>Исполнитель</TableHead>
						<TableHead>Статус</TableHead>
						<TableHead>Дедлайн</TableHead>
						<TableHead>Создано</TableHead>
						<TableHead>Вопросы</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{tasks.map((task) => {
						const isOverdue = new Date(task.deadline) < new Date();
						return (
							<TableRow key={task.id} className="cursor-pointer" onClick={() => onTaskClick?.(task.id)}>
								<TableCell className="font-medium">{task.title}</TableCell>
								<TableCell>{task.procurementItemName}</TableCell>
								<TableCell>{task.assignee.name}</TableCell>
								<TableCell>
									<Badge variant={STATUS_BADGE_VARIANT[task.status]}>{STATUS_LABELS[task.status]}</Badge>
								</TableCell>
								<TableCell>
									<time dateTime={task.deadline} className={cn(isOverdue && "font-medium text-destructive")}>
										{formatShortDate(task.deadline)}
									</time>
								</TableCell>
								<TableCell>
									<time dateTime={task.createdAt}>{formatShortDate(task.createdAt)}</time>
								</TableCell>
								<TableCell className="tabular-nums">{task.questionCount}</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
			{hasNextPage && <div ref={sentinelRef} className="h-px" />}
		</div>
	);
}
