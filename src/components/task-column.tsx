import { useDroppable } from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task, TaskStatus } from "@/data/task-types";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";

interface TaskColumnProps {
	status: TaskStatus;
	label: string;
	tasks: Task[];
	isLoading: boolean;
	onTaskClick?: (taskId: string) => void;
	draggableCards?: boolean;
	activeTaskId?: string;
	isValidDrop?: boolean;
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	loadMore?: () => void;
	hideHeader?: boolean;
}

export function TaskColumn({
	status,
	label,
	tasks,
	isLoading,
	onTaskClick,
	draggableCards,
	activeTaskId,
	isValidDrop,
	hasNextPage,
	isFetchingNextPage,
	loadMore,
	hideHeader,
}: TaskColumnProps) {
	const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
	const showHighlight = isOver && isValidDrop;

	const sentinelRef = useIntersectionObserver(() => {
		if (hasNextPage && !isFetchingNextPage && loadMore) loadMore();
	});

	return (
		<section className="flex min-h-0 flex-col" data-testid={`column-${status}`}>
			{!hideHeader && (
				<div className="flex shrink-0 items-center gap-2 px-1 pb-2">
					<h2 className="text-sm font-medium">{label}</h2>
					<Badge variant="secondary" className="tabular-nums">
						{tasks.length}
					</Badge>
				</div>
			)}
			<div
				ref={setNodeRef}
				data-droppable-id={`column-${status}`}
				className={cn(
					"flex-1 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-2 scrollbar-hover transition-colors",
					showHighlight && "ring-2 ring-primary/50 bg-primary/5",
				)}
			>
				{isLoading
					? ["sk-1", "sk-2", "sk-3"].map((key) => <Skeleton key={key} className="h-24 rounded-lg" />)
					: tasks.map((task) => (
							<TaskCard
								key={task.id}
								task={task}
								onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
								draggable={draggableCards && status !== "completed"}
								isDragging={activeTaskId === task.id}
							/>
						))}
				{hasNextPage && <div ref={sentinelRef} data-testid={`column-sentinel-${status}`} className="h-px" />}
				{isFetchingNextPage && (
					<div data-testid={`column-loading-${status}`} className="flex justify-center py-2">
						<Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
					</div>
				)}
			</div>
		</section>
	);
}
